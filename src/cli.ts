#!/usr/bin/env node

/**
 * AI-Crew CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { install } from './installer.js';
import { loadConfig, saveConfig, DEFAULT_CONFIG } from './config.js';
import { StateManager } from './state.js';
import { TeamOrchestrator } from './orchestrator.js';

const program = new Command();

program
  .name('ai-crew')
  .description('AI-DLC + Claude Code Agent Teams integration')
  .version('0.1.0');

// Install command
program
  .command('install')
  .description('Install AI-Crew in current project')
  .option('-f, --force', 'Force reinstall')
  .option('-l, --lang <language>', 'Language (en/ko)', 'ko')
  .action(async (options) => {
    await install({
      projectRoot: process.cwd(),
      language: options.lang,
      force: options.force,
    });
  });

// Init command (interactive setup)
program
  .command('init')
  .description('Interactive setup')
  .action(async () => {
    console.log(chalk.cyan('\n🚀 AI-Crew Setup\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'language',
        message: 'Language / 언어:',
        choices: [
          { name: '한국어', value: 'ko' },
          { name: 'English', value: 'en' },
        ],
      },
      {
        type: 'number',
        name: 'maxAgents',
        message: 'Max parallel agents:',
        default: 5,
      },
      {
        type: 'list',
        name: 'teammateMode',
        message: 'Teammate display mode:',
        choices: [
          { name: 'tmux (split panes)', value: 'tmux' },
          { name: 'in-process (single terminal)', value: 'in-process' },
        ],
      },
      {
        type: 'confirm',
        name: 'requirePlanApproval',
        message: 'Require plan approval before building?',
        default: false,
      },
      {
        type: 'number',
        name: 'coverage',
        message: 'Minimum test coverage (%):',
        default: 80,
      },
    ]);
    
    // Install with custom config
    await install({
      projectRoot: process.cwd(),
      language: answers.language,
    });
    
    // Update config with answers
    const config = await loadConfig(process.cwd());
    config.team.maxAgents = answers.maxAgents;
    config.team.teammateMode = answers.teammateMode;
    config.hats.requirePlanApproval = answers.requirePlanApproval;
    config.qualityGates.coverage = answers.coverage;
    
    await saveConfig(process.cwd(), config);
    
    console.log(chalk.green('\n✅ Configuration saved!\n'));
  });

// Status command
program
  .command('status')
  .description('Show current state')
  .action(async () => {
    const stateManager = new StateManager(process.cwd());
    const state = await stateManager.load();
    
    if (!state) {
      console.log(chalk.yellow('No active intent. Run /crew:elaborate to start.'));
      return;
    }
    
    const intent = state.intent;
    
    console.log(chalk.cyan('\n📊 AI-Crew Status\n'));
    console.log(chalk.white(`Intent: ${intent.description}`));
    console.log(chalk.gray(`Status: ${intent.status}`));
    console.log();
    
    console.log(chalk.white('Units:'));
    for (const unit of intent.units) {
      const statusEmoji = {
        pending: '⏳',
        'in-progress': '🔄',
        review: '👀',
        complete: '✅',
        blocked: '🚫',
      }[unit.status];
      
      const agent = unit.assignedAgent ? chalk.gray(` (${unit.assignedAgent})`) : '';
      console.log(`  ${statusEmoji} ${unit.name}${agent}`);
      
      const completedTasks = unit.tasks.filter(t => t.status === 'complete').length;
      console.log(chalk.gray(`     Tasks: ${completedTasks}/${unit.tasks.length}`));
    }
    
    console.log();
  });

// Checkpoints command
program
  .command('checkpoints')
  .description('List checkpoints')
  .action(async () => {
    const stateManager = new StateManager(process.cwd());
    const checkpoints = await stateManager.listCheckpoints();
    
    if (checkpoints.length === 0) {
      console.log(chalk.yellow('No checkpoints found.'));
      return;
    }
    
    console.log(chalk.cyan('\n📦 Checkpoints\n'));
    
    for (const cp of checkpoints) {
      const date = new Date(cp.createdAt).toLocaleString();
      console.log(`  ${chalk.white(cp.id)}`);
      console.log(`    ${chalk.gray(cp.description)}`);
      console.log(`    ${chalk.gray(date)}`);
      console.log();
    }
  });

// Config command
program
  .command('config')
  .description('Show or edit configuration')
  .option('--get <key>', 'Get config value')
  .option('--set <key=value>', 'Set config value')
  .action(async (options) => {
    const config = await loadConfig(process.cwd());
    
    if (options.get) {
      const keys = options.get.split('.');
      let value: unknown = config;
      for (const key of keys) {
        value = (value as Record<string, unknown>)[key];
      }
      console.log(value);
    } else if (options.set) {
      const [keyPath, value] = options.set.split('=');
      const keys = keyPath.split('.');
      
      let obj: Record<string, unknown> = config as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]] as Record<string, unknown>;
      }
      
      // Parse value
      let parsedValue: unknown = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);
      
      obj[keys[keys.length - 1]] = parsedValue;
      await saveConfig(process.cwd(), config);
      
      console.log(chalk.green('✅ Config updated'));
    } else {
      console.log(chalk.cyan('\n⚙️ Configuration\n'));
      console.log(JSON.stringify(config, null, 2));
    }
  });

program.parse();
