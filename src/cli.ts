#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { install } from "./installer.js";
import { StateManager } from "./state.js";
import { loadConfig } from "./config.js";
import { diagnose, uninstall } from "./install-state.js";
import { runValidate } from "./cli-validate.js";

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
      console.log(chalk.green("\u2713 AI-Crew initialized successfully!"));
      console.log();
      console.log("Created:");
      console.log(`  ${chalk.cyan(".ai-crew/")}        \u2014 state, config, specs, rules`);
      console.log(`  ${chalk.cyan(".claude/commands/crew/")} \u2014 slash commands`);
      console.log(`  ${chalk.cyan("CLAUDE.md")}        \u2014 AI-Crew section appended`);
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
          ? chalk.green("\u2713")
          : unit.status === "in-progress"
            ? chalk.yellow("\u2192")
            : chalk.dim("\u25CB");
      console.log(`  ${icon} ${unit.name} [${unit.status}]`);
    }
  });

program
  .command("doctor")
  .description("Diagnose the AI-Crew installation")
  .action(async () => {
    const projectRoot = process.cwd();
    try {
      const result = await diagnose(projectRoot);

      if (result.healthy) {
        console.log(chalk.green("Installation is healthy. All files present."));
        return;
      }

      console.log(chalk.yellow("Installation issues found:\n"));

      if (result.missingFiles.length > 0) {
        console.log(chalk.red("Missing files:"));
        for (const f of result.missingFiles) {
          console.log(`  - ${f}`);
        }
        console.log();
      }

      if (result.extraFiles.length > 0) {
        console.log(chalk.yellow("Extra files (not tracked by install):"));
        for (const f of result.extraFiles) {
          console.log(`  + ${f}`);
        }
        console.log();
      }

      if (result.configMismatch.length > 0) {
        console.log(chalk.red("Config issues:"));
        for (const msg of result.configMismatch) {
          console.log(`  ! ${msg}`);
        }
        console.log();
      }

      console.log(
        chalk.dim("Run 'ai-crew init --force' to repair the installation."),
      );
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("uninstall")
  .description("Remove AI-Crew files from the current project")
  .option("--yes", "Skip confirmation prompt", false)
  .action(async (options) => {
    const projectRoot = process.cwd();
    try {
      if (!options.yes) {
        // Simple confirmation via stderr prompt
        console.log(
          chalk.yellow(
            "This will remove all AI-Crew installed files from this project.",
          ),
        );
        console.log(chalk.dim("Use --yes to skip this confirmation.\n"));
        const readline = await import("node:readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        const answer = await new Promise<string>((resolve) => {
          rl.question("Are you sure? (y/N) ", resolve);
        });
        rl.close();
        if (answer.toLowerCase() !== "y") {
          console.log("Aborted.");
          return;
        }
      }

      const result = await uninstall(projectRoot);
      console.log(chalk.green("AI-Crew uninstalled successfully."));
      console.log(`  Files removed: ${result.filesRemoved}`);
      console.log(`  Directories cleaned: ${result.dirsRemoved}`);
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate .ai-crew configuration files (config.yaml, graph.yaml, state.json)")
  .option("--target <path>", "Project root to validate", process.cwd())
  .action(async (options) => {
    const exitCode = await runValidate(options.target);
    process.exit(exitCode);
  });

program
  .command("mcp")
  .description("Start MCP server for multi-provider agent chat")
  .action(async () => {
    const { startServer } = await import("./mcp/server.js");
    await startServer();
  });

program.parse();
