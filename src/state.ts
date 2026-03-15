/**
 * AI-Crew State Management
 * 
 * Handles persistence of Intent, Units, Tasks, and Checkpoints
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { 
  Intent, Unit, Task, Checkpoint, StateSnapshot,
  IntentStatus, UnitStatus, TaskStatus, CompletionCriteria 
} from './types.js';

const STATE_DIR = '.ai-crew';
const STATE_FILE = 'state.json';
const INTENTS_DIR = 'intents';
const CHECKPOINTS_DIR = 'checkpoints';

export class StateManager {
  private projectRoot: string;
  private state: StateSnapshot | null = null;
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }
  
  // ============================================
  // State Persistence
  // ============================================
  
  async load(): Promise<StateSnapshot | null> {
    const statePath = join(this.projectRoot, STATE_DIR, STATE_FILE);
    
    if (!existsSync(statePath)) {
      return null;
    }
    
    try {
      const content = await readFile(statePath, 'utf-8');
      this.state = JSON.parse(content) as StateSnapshot;
      return this.state;
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  }
  
  async save(): Promise<void> {
    if (!this.state) return;
    
    const stateDir = join(this.projectRoot, STATE_DIR);
    const statePath = join(stateDir, STATE_FILE);
    
    if (!existsSync(stateDir)) {
      await mkdir(stateDir, { recursive: true });
    }
    
    await writeFile(
      statePath, 
      JSON.stringify(this.state, null, 2), 
      'utf-8'
    );
  }
  
  // ============================================
  // Intent Management
  // ============================================
  
  async createIntent(description: string): Promise<Intent> {
    const intent: Intent = {
      id: this.generateId('intent'),
      description,
      status: 'elaborating',
      completionCriteria: [],
      units: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.state = {
      intent,
      messages: [],
    };
    
    await this.save();
    await this.saveIntentDocs(intent);
    
    return intent;
  }
  
  async updateIntent(updates: Partial<Intent>): Promise<Intent | null> {
    if (!this.state?.intent) return null;
    
    this.state.intent = {
      ...this.state.intent,
      ...updates,
      updatedAt: new Date(),
    };
    
    await this.save();
    return this.state.intent;
  }
  
  getIntent(): Intent | null {
    return this.state?.intent ?? null;
  }
  
  // ============================================
  // Unit Management
  // ============================================
  
  async addUnit(unit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Unit> {
    if (!this.state?.intent) {
      throw new Error('No active intent');
    }
    
    const newUnit: Unit = {
      ...unit,
      id: this.generateId('unit'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.state.intent.units.push(newUnit);
    this.state.intent.updatedAt = new Date();
    
    await this.save();
    return newUnit;
  }
  
  async updateUnit(unitId: string, updates: Partial<Unit>): Promise<Unit | null> {
    if (!this.state?.intent) return null;
    
    const unitIndex = this.state.intent.units.findIndex(u => u.id === unitId);
    if (unitIndex === -1) return null;
    
    this.state.intent.units[unitIndex] = {
      ...this.state.intent.units[unitIndex],
      ...updates,
      updatedAt: new Date(),
    };
    
    await this.save();
    return this.state.intent.units[unitIndex];
  }
  
  getUnit(unitId: string): Unit | null {
    return this.state?.intent?.units.find(u => u.id === unitId) ?? null;
  }
  
  getAvailableUnits(): Unit[] {
    if (!this.state?.intent) return [];
    
    return this.state.intent.units.filter(unit => {
      // Unit is available if:
      // 1. Status is pending
      // 2. All dependencies are complete
      if (unit.status !== 'pending') return false;
      
      return unit.dependencies.every(depId => {
        const dep = this.getUnit(depId);
        return dep?.status === 'complete';
      });
    });
  }
  
  // ============================================
  // Task Management
  // ============================================
  
  async claimTask(unitId: string, taskId: string, agentId: string): Promise<Task | null> {
    const unit = this.getUnit(unitId);
    if (!unit) return null;
    
    const taskIndex = unit.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;
    
    const task = unit.tasks[taskIndex];
    if (task.status !== 'pending') return null; // Already claimed
    
    task.status = 'claimed';
    task.claimedBy = agentId;
    task.claimedAt = new Date();
    
    await this.save();
    return task;
  }
  
  async completeTask(unitId: string, taskId: string): Promise<Task | null> {
    const unit = this.getUnit(unitId);
    if (!unit) return null;
    
    const taskIndex = unit.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;
    
    unit.tasks[taskIndex].status = 'complete';
    unit.tasks[taskIndex].completedAt = new Date();
    
    // Check if all tasks complete
    const allComplete = unit.tasks.every(t => t.status === 'complete');
    if (allComplete) {
      unit.status = 'review';
    }
    
    await this.save();
    return unit.tasks[taskIndex];
  }
  
  // ============================================
  // Checkpoint Management
  // ============================================
  
  async createCheckpoint(description: string, gitRef?: string): Promise<Checkpoint> {
    if (!this.state?.intent) {
      throw new Error('No active state to checkpoint');
    }
    
    const checkpoint: Checkpoint = {
      id: this.generateId('cp'),
      intentId: this.state.intent.id,
      description,
      state: JSON.parse(JSON.stringify(this.state)), // Deep clone
      gitRef,
      createdAt: new Date(),
    };
    
    const checkpointDir = join(this.projectRoot, STATE_DIR, CHECKPOINTS_DIR);
    if (!existsSync(checkpointDir)) {
      await mkdir(checkpointDir, { recursive: true });
    }
    
    const checkpointPath = join(checkpointDir, `${checkpoint.id}.json`);
    await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
    
    return checkpoint;
  }
  
  async restoreCheckpoint(checkpointId: string): Promise<StateSnapshot | null> {
    const checkpointPath = join(
      this.projectRoot, 
      STATE_DIR, 
      CHECKPOINTS_DIR, 
      `${checkpointId}.json`
    );
    
    if (!existsSync(checkpointPath)) return null;
    
    try {
      const content = await readFile(checkpointPath, 'utf-8');
      const checkpoint = JSON.parse(content) as Checkpoint;
      
      this.state = checkpoint.state;
      await this.save();
      
      return this.state;
    } catch (error) {
      console.error('Failed to restore checkpoint:', error);
      return null;
    }
  }
  
  async listCheckpoints(): Promise<Checkpoint[]> {
    const checkpointDir = join(this.projectRoot, STATE_DIR, CHECKPOINTS_DIR);
    
    if (!existsSync(checkpointDir)) return [];
    
    const files = await readdir(checkpointDir);
    const checkpoints: Checkpoint[] = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const content = await readFile(join(checkpointDir, file), 'utf-8');
      checkpoints.push(JSON.parse(content) as Checkpoint);
    }
    
    return checkpoints.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  // ============================================
  // Intent Documentation
  // ============================================
  
  private async saveIntentDocs(intent: Intent): Promise<void> {
    const intentDir = join(
      this.projectRoot, 
      STATE_DIR, 
      INTENTS_DIR, 
      intent.id
    );
    
    if (!existsSync(intentDir)) {
      await mkdir(intentDir, { recursive: true });
    }
    
    // Requirements doc (placeholder)
    const requirementsPath = join(intentDir, 'requirements.md');
    if (!existsSync(requirementsPath)) {
      await writeFile(requirementsPath, `# Requirements: ${intent.description}\n\n## Intent\n${intent.description}\n\n## Functional Requirements\n\n(To be elaborated)\n\n## Completion Criteria\n\n(To be defined)\n`, 'utf-8');
    }
    
    // Design doc (placeholder)
    const designPath = join(intentDir, 'design.md');
    if (!existsSync(designPath)) {
      await writeFile(designPath, `# Design: ${intent.description}\n\n## Architecture Overview\n\n(To be designed)\n\n## Data Model\n\n(To be defined)\n`, 'utf-8');
    }
    
    // Tasks doc (placeholder)
    const tasksPath = join(intentDir, 'tasks.md');
    if (!existsSync(tasksPath)) {
      await writeFile(tasksPath, `# Tasks: ${intent.description}\n\n## Units\n\n(To be decomposed)\n`, 'utf-8');
    }
  }
  
  // ============================================
  // Utilities
  // ============================================
  
  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }
}

export { Intent, Unit, Task };
