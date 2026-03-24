#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { install } from "./installer.js";
import { diagnose, uninstall } from "./install-state.js";
import { runValidate } from "./cli-validate.js";

const program = new Command();

program
  .name("ai-crew")
  .description("Catalog-based Plugin Composition Platform for Claude Code")
  .version("0.3.0");

// -- install --------------------------------------------------------

program
  .command("install")
  .description("Install a bundle into a target project")
  .requiredOption("--team <name>", "Bundle name (e.g., aidlc-standard, fullstack)")
  .requiredOption("--target <path>", "Target project path")
  .option("--force", "Overwrite existing configuration", false)
  .action(async (options) => {
    try {
      const result = await install(options.team, options.target, {
        force: options.force,
      });

      console.log(
        chalk.green(
          `\u2713 Installed bundle "${result.bundleName}" to ${result.targetPath}`,
        ),
      );
      console.log();
      console.log("Created:");
      console.log(
        `  ${chalk.cyan(".ai-crew/")}          \u2014 config, state, graph, workflow`,
      );
      console.log(
        `  ${chalk.cyan(".claude/commands/")}   \u2014 slash commands`,
      );
      console.log(
        `  ${chalk.cyan(".claude/agents/")}     \u2014 agent definitions`,
      );
      console.log(
        `  ${chalk.cyan(".claude/skills/")}     \u2014 skill definitions`,
      );
      console.log();
      console.log(`Files installed: ${result.filesInstalled}`);
      if (result.graphNodes > 0) {
        console.log(`Graph nodes: ${result.graphNodes}`);
      }
      if (result.workflowSource) {
        console.log(`Workflow: ${result.workflowSource}`);
      }
      console.log();
      console.log(
        `Start with: ${chalk.yellow("/crew:elaborate <your intent>")}`,
      );
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

// -- status ---------------------------------------------------------

program
  .command("status")
  .description("Show current AI-Crew state for a project")
  .option("--target <path>", "Project path", process.cwd())
  .action(async (options) => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { existsSync } = await import("node:fs");

    const crewDir = join(options.target, ".ai-crew");
    if (!existsSync(crewDir)) {
      console.log(
        chalk.dim("No AI-Crew installation found. Install with: ai-crew install --team <name> --target <path>"),
      );
      return;
    }

    try {
      const statePath = join(crewDir, "state.json");
      if (!existsSync(statePath)) {
        console.log(chalk.dim("No state file found."));
        return;
      }

      const state = JSON.parse(await readFile(statePath, "utf-8"));
      console.log(chalk.bold(`Bundle: ${state.bundleName ?? state.version ?? "unknown"}`));
      console.log();

      const nodes = state.nodes as Record<
        string,
        { status: string }
      > | undefined;
      if (!nodes || Object.keys(nodes).length === 0) {
        console.log(chalk.dim("No graph nodes defined."));
        return;
      }

      for (const [id, node] of Object.entries(nodes)) {
        const icon =
          node.status === "completed"
            ? chalk.green("\u2713")
            : node.status === "running"
              ? chalk.yellow("\u2192")
              : node.status === "failed"
                ? chalk.red("\u2717")
                : chalk.dim("\u25CB");
        console.log(`  ${icon} ${id} [${node.status}]`);
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

// -- doctor ---------------------------------------------------------

program
  .command("doctor")
  .description("Diagnose the AI-Crew installation")
  .option("--target <path>", "Project path", process.cwd())
  .action(async (options) => {
    const targetPath = options.target;
    try {
      const result = await diagnose(targetPath);

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
        chalk.dim("Run 'ai-crew install --team <name> --target <path> --force' to repair the installation."),
      );
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

// -- uninstall ------------------------------------------------------

program
  .command("uninstall")
  .description("Remove AI-Crew files from a project")
  .option("--target <path>", "Project path", process.cwd())
  .option("--yes", "Skip confirmation prompt", false)
  .action(async (options) => {
    const targetPath = options.target;
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

      const result = await uninstall(targetPath);
      console.log(chalk.green("AI-Crew uninstalled successfully."));
      console.log(`  Files removed: ${result.filesRemoved}`);
      console.log(`  Directories cleaned: ${result.dirsRemoved}`);
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

// -- validate -------------------------------------------------------

program
  .command("validate")
  .description("Validate .ai-crew configuration files (config.yaml, graph.yaml, state.json)")
  .option("--target <path>", "Project root to validate", process.cwd())
  .action(async (options) => {
    const exitCode = await runValidate(options.target);
    process.exit(exitCode);
  });

// -- mcp ------------------------------------------------------------

program
  .command("mcp")
  .description("Start MCP server for multi-provider agent chat")
  .action(async () => {
    const { startServer } = await import("./mcp/server.js");
    await startServer();
  });

program.parse();
