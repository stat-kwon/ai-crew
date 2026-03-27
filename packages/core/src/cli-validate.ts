import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse } from "yaml";
import chalk from "chalk";
import {
  validateConfigYaml,
  validateGraphYaml,
  validateStateJson,
} from "./validator.js";
import type { ValidationResult, ValidationError } from "./types.js";

// ============================================================
// File descriptors for each validatable config file
// ============================================================

interface FileDescriptor {
  /** Relative path under the target directory */
  relativePath: string;
  /** How to parse the raw file content into a JS object */
  parse: (raw: string) => unknown;
  /** Which validator to run on the parsed data */
  validate: (data: unknown) => ValidationResult;
}

const FILES: FileDescriptor[] = [
  {
    relativePath: ".ai-crew/config.yaml",
    parse: (raw) => parse(raw),
    validate: validateConfigYaml,
  },
  {
    relativePath: ".ai-crew/graph.yaml",
    parse: (raw) => parse(raw),
    validate: validateGraphYaml,
  },
  {
    relativePath: ".ai-crew/state.json",
    parse: (raw) => JSON.parse(raw) as unknown,
    validate: validateStateJson,
  },
];

// ============================================================
// Display helpers
// ============================================================

function formatError(filePath: string, error: ValidationError): string {
  const location = error.path ? `${filePath} > ${error.path}` : filePath;

  if (error.severity === "warning") {
    return `  ${chalk.yellow("warning")} ${location}: ${error.message}`;
  }
  return `  ${chalk.red("error")}   ${location}: ${error.message}`;
}

// ============================================================
// Main validate runner
// ============================================================

/**
 * Run validation on all known .ai-crew config files within the given target
 * directory.
 *
 * @param target - Absolute or relative path to the project root
 * @returns Exit code: 0 if no errors, 1 if any validation errors found
 */
export async function runValidate(target: string): Promise<number> {
  const projectRoot = resolve(target);
  let totalErrors = 0;
  let totalWarnings = 0;
  let filesChecked = 0;
  let filesSkipped = 0;

  console.log(chalk.bold(`Validating .ai-crew files in ${projectRoot}\n`));

  for (const descriptor of FILES) {
    const absolutePath = join(projectRoot, descriptor.relativePath);

    let raw: string;
    try {
      raw = await readFile(absolutePath, "utf-8");
    } catch {
      filesSkipped++;
      console.log(chalk.dim(`  skip  ${descriptor.relativePath} (not found)`));
      continue;
    }

    filesChecked++;

    let parsed: unknown;
    try {
      parsed = descriptor.parse(raw);
    } catch (parseErr) {
      totalErrors++;
      console.log(
        `  ${chalk.red("error")}   ${descriptor.relativePath}: Failed to parse — ${(parseErr as Error).message}`,
      );
      continue;
    }

    const result = descriptor.validate(parsed);
    const errors = result.errors.filter((e) => e.severity === "error");
    const warnings = result.errors.filter((e) => e.severity === "warning");

    totalErrors += errors.length;
    totalWarnings += warnings.length;

    if (result.valid && warnings.length === 0) {
      console.log(`  ${chalk.green("pass")}    ${descriptor.relativePath}`);
    } else {
      if (!result.valid) {
        console.log(`  ${chalk.red("fail")}    ${descriptor.relativePath}`);
      } else {
        console.log(`  ${chalk.yellow("warn")}    ${descriptor.relativePath}`);
      }

      for (const e of result.errors) {
        console.log(formatError(descriptor.relativePath, e));
      }
    }
  }

  console.log();

  if (filesChecked === 0) {
    console.log(
      chalk.yellow("No .ai-crew configuration files found. Run `ai-crew init` first."),
    );
    return 1;
  }

  const summary = [
    `${filesChecked} file(s) checked`,
    `${filesSkipped} skipped`,
    `${totalErrors} error(s)`,
    `${totalWarnings} warning(s)`,
  ].join(", ");

  if (totalErrors > 0) {
    console.log(chalk.red(`Validation failed: ${summary}`));
    return 1;
  }

  console.log(chalk.green(`Validation passed: ${summary}`));
  return 0;
}
