/**
 * AI-Crew Configuration Management
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import type { AICrewConfig } from './types.js';

const CONFIG_DIR = '.ai-crew';
const CONFIG_FILE = 'config.yaml';

export const DEFAULT_CONFIG: AICrewConfig = {
  version: '0.1',
  
  team: {
    maxAgents: 5,
    defaultModel: 'claude-sonnet-4',
    teammateMode: 'tmux',
  },
  
  hats: {
    enabled: true,
    defaultWorkflow: 'core',
    requirePlanApproval: false,
  },
  
  state: {
    autoCheckpoint: true,
    checkpointInterval: 'task',
  },
  
  qualityGates: {
    tests: true,
    lint: true,
    coverage: 80,
  },
};

export async function loadConfig(projectRoot: string): Promise<AICrewConfig> {
  const configPath = join(projectRoot, CONFIG_DIR, CONFIG_FILE);
  
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }
  
  try {
    const content = await readFile(configPath, 'utf-8');
    const config = YAML.parse(content) as Partial<AICrewConfig>;
    
    // Merge with defaults
    return {
      ...DEFAULT_CONFIG,
      ...config,
      team: { ...DEFAULT_CONFIG.team, ...config.team },
      hats: { ...DEFAULT_CONFIG.hats, ...config.hats },
      state: { ...DEFAULT_CONFIG.state, ...config.state },
      qualityGates: { ...DEFAULT_CONFIG.qualityGates, ...config.qualityGates },
    };
  } catch (error) {
    console.error('Failed to load config:', error);
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(projectRoot: string, config: AICrewConfig): Promise<void> {
  const configDir = join(projectRoot, CONFIG_DIR);
  const configPath = join(configDir, CONFIG_FILE);
  
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }
  
  const content = YAML.stringify(config, {
    indent: 2,
    lineWidth: 100,
  });
  
  await writeFile(configPath, content, 'utf-8');
}

export { AICrewConfig };
