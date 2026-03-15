/**
 * AI-Crew Team Orchestrator
 * 
 * Manages Agent Team lifecycle and coordination
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { 
  TeamConfig, AgentConfig, Unit, 
  HatType, WorkflowType, TeamMessage 
} from './types.js';
import { StateManager } from './state.js';
import { loadConfig } from './config.js';

const execAsync = promisify(exec);

export class TeamOrchestrator {
  private projectRoot: string;
  private stateManager: StateManager;
  private team: TeamConfig | null = null;
  
  constructor(projectRoot: string, stateManager: StateManager) {
    this.projectRoot = projectRoot;
    this.stateManager = stateManager;
  }
  
  // ============================================
  // Team Lifecycle
  // ============================================
  
  async createTeam(units: Unit[]): Promise<TeamConfig> {
    const config = await loadConfig(this.projectRoot);
    const intent = this.stateManager.getIntent();
    
    if (!intent) {
      throw new Error('No active intent');
    }
    
    // Create team configuration
    const teamName = `team-${intent.id}`;
    
    this.team = {
      name: teamName,
      lead: {
        name: 'architect',
        role: 'Team Lead - Integration & Coordination',
        model: config.team.defaultModel,
        unitIds: [],
      },
      members: [],
      taskListPath: join(this.projectRoot, '.claude', 'tasks', teamName),
      communication: {
        mode: 'direct',
        broadcastOnCompletion: true,
      },
    };
    
    // Assign agents to units
    const availableUnits = units.filter(u => u.dependencies.length === 0 || 
      u.dependencies.every(depId => {
        const dep = units.find(u => u.id === depId);
        return dep?.status === 'complete';
      })
    );
    
    // Create agents for parallelizable units (up to maxAgents)
    const agentCount = Math.min(availableUnits.length, config.team.maxAgents);
    
    for (let i = 0; i < agentCount; i++) {
      const unit = availableUnits[i];
      const agentName = this.generateAgentName(unit);
      
      const agent: AgentConfig = {
        name: agentName,
        role: `Unit: ${unit.name}`,
        model: config.team.defaultModel,
        unitIds: [unit.id],
        currentHat: 'planner',
      };
      
      this.team.members.push(agent);
    }
    
    // Save team config
    await this.saveTeamConfig();
    
    return this.team;
  }
  
  async spawnAgents(): Promise<void> {
    if (!this.team) {
      throw new Error('No team configured');
    }
    
    const config = await loadConfig(this.projectRoot);
    
    for (const agent of this.team.members) {
      // Create worktree for each agent
      const unit = this.stateManager.getUnit(agent.unitIds[0]);
      if (!unit) continue;
      
      const branchName = `feature/${unit.id}`;
      const worktreePath = join(this.projectRoot, '..', `${this.getProjectName()}-${agent.name}`);
      
      // Create branch if not exists
      try {
        await execAsync(`git branch ${branchName}`, { cwd: this.projectRoot });
      } catch {
        // Branch may already exist
      }
      
      // Create worktree
      if (!existsSync(worktreePath)) {
        await execAsync(
          `git worktree add "${worktreePath}" ${branchName}`,
          { cwd: this.projectRoot }
        );
      }
      
      agent.worktree = worktreePath;
      
      // Update unit with worktree info
      await this.stateManager.updateUnit(unit.id, {
        assignedAgent: agent.name,
        worktree: worktreePath,
        branch: branchName,
        status: 'in-progress',
      });
    }
    
    await this.saveTeamConfig();
  }
  
  async cleanupTeam(): Promise<void> {
    if (!this.team) return;
    
    // Remove worktrees
    for (const agent of this.team.members) {
      if (agent.worktree && existsSync(agent.worktree)) {
        try {
          await execAsync(
            `git worktree remove "${agent.worktree}" --force`,
            { cwd: this.projectRoot }
          );
        } catch (error) {
          console.error(`Failed to remove worktree for ${agent.name}:`, error);
        }
      }
    }
    
    this.team = null;
  }
  
  // ============================================
  // Hat Management
  // ============================================
  
  getHatSequence(workflow: WorkflowType): HatType[] {
    const sequences: Record<WorkflowType, HatType[]> = {
      core: ['planner', 'builder', 'reviewer'],
      hypothesis: ['observer', 'hypothesizer', 'experimenter', 'analyst'],
      tdd: ['planner', 'builder', 'reviewer'], // Simplified
      adversarial: ['planner', 'builder', 'red-team', 'blue-team', 'reviewer'],
      design: ['planner', 'designer', 'reviewer'],
    };
    
    return sequences[workflow] || sequences.core;
  }
  
  getNextHat(currentHat: HatType, workflow: WorkflowType): HatType | null {
    const sequence = this.getHatSequence(workflow);
    const currentIndex = sequence.indexOf(currentHat);
    
    if (currentIndex === -1 || currentIndex === sequence.length - 1) {
      return null;
    }
    
    return sequence[currentIndex + 1];
  }
  
  // ============================================
  // Communication
  // ============================================
  
  async sendMessage(from: string, to: string, content: string): Promise<TeamMessage> {
    const message: TeamMessage = {
      id: `msg-${Date.now().toString(36)}`,
      from,
      to,
      content,
      timestamp: new Date(),
      read: false,
    };
    
    // In a real implementation, this would use Claude Code's messaging system
    // For now, we log it
    console.log(`[${from} → ${to}] ${content}`);
    
    return message;
  }
  
  async broadcast(from: string, content: string): Promise<TeamMessage> {
    return this.sendMessage(from, 'broadcast', content);
  }
  
  // ============================================
  // Integration
  // ============================================
  
  async mergeAllBranches(): Promise<{ success: boolean; conflicts: string[] }> {
    if (!this.team) {
      throw new Error('No team configured');
    }
    
    const conflicts: string[] = [];
    
    // Checkout main
    await execAsync('git checkout main', { cwd: this.projectRoot });
    
    for (const agent of this.team.members) {
      const unit = this.stateManager.getUnit(agent.unitIds[0]);
      if (!unit || !unit.branch) continue;
      
      try {
        await execAsync(
          `git merge ${unit.branch} --no-edit`,
          { cwd: this.projectRoot }
        );
      } catch (error) {
        conflicts.push(unit.branch);
      }
    }
    
    return {
      success: conflicts.length === 0,
      conflicts,
    };
  }
  
  // ============================================
  // Utilities
  // ============================================
  
  private generateAgentName(unit: Unit): string {
    // Generate a short, descriptive name based on unit
    const words = unit.name.toLowerCase().split(/[\s-_]+/);
    if (words.length >= 2) {
      return `${words[0]}-agent`;
    }
    return `agent-${unit.id.split('-')[1]}`;
  }
  
  private getProjectName(): string {
    return this.projectRoot.split('/').pop() || 'project';
  }
  
  private async saveTeamConfig(): Promise<void> {
    if (!this.team) return;
    
    const teamDir = join(this.projectRoot, '.claude', 'teams', this.team.name);
    
    if (!existsSync(teamDir)) {
      await mkdir(teamDir, { recursive: true });
    }
    
    await writeFile(
      join(teamDir, 'config.json'),
      JSON.stringify(this.team, null, 2),
      'utf-8'
    );
  }
  
  getTeam(): TeamConfig | null {
    return this.team;
  }
}
