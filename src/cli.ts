#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { install } from "./installer.js";
import { StateManager } from "./state.js";
import { loadConfig } from "./config.js";

const program = new Command();

program
  .name("ai-crew")
  .description("AI-DLC methodology on Claude Code Agent Teams")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize AI-Crew in the current project")
  .option("--lang <lang>", "Language (ko|en)", "ko")
  .option("--force", "Overwrite existing configuration", false)
  .action(async (options) => {
    const projectRoot = process.cwd();
    try {
      await install(projectRoot, {
        lang: options.lang as "ko" | "en",
        force: options.force,
      });
      console.log(chalk.green("✓ AI-Crew initialized successfully!"));
      console.log();
      console.log("Created:");
      console.log(`  ${chalk.cyan(".ai-crew/")}        — state, config, specs, rules`);
      console.log(`  ${chalk.cyan(".claude/commands/crew/")} — slash commands`);
      console.log(`  ${chalk.cyan("CLAUDE.md")}        — AI-Crew section appended`);
      console.log();
      console.log(`Start with: ${chalk.yellow("/crew:elaborate <your intent>")}`);
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show current AI-Crew state")
  .action(async () => {
    const projectRoot = process.cwd();
    const sm = new StateManager(projectRoot);
    const state = await sm.load();

    if (!state.intent) {
      console.log(chalk.dim("No active intent. Start with /crew:elaborate"));
      return;
    }

    console.log(chalk.bold("Intent:"), state.intent.description);
    console.log(chalk.bold("Status:"), state.intent.status);
    console.log(
      chalk.bold("Units:"),
      `${state.units.filter((u) => u.status === "complete").length}/${state.units.length} complete`,
    );
    console.log();

    for (const unit of state.units) {
      const icon =
        unit.status === "complete"
          ? chalk.green("✓")
          : unit.status === "in-progress"
            ? chalk.yellow("→")
            : chalk.dim("○");
      console.log(`  ${icon} ${unit.name} [${unit.status}]`);
    }
  });

program
  .command("mcp")
  .description("Start MCP server for multi-provider agent chat")
  .action(async () => {
    const { startServer } = await import("./mcp/server.js");
    await startServer();
  });

program.parse();
