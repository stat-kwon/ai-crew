import { exec } from "node:child_process";
import type { VerifyCheck, VerificationResult, VerifyCheckResult } from "./types.js";

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Returns the default shell commands for built-in check names.
 */
export function getDefaultCommands(): Record<string, string> {
  return {
    test: "npm test",
    lint: "npm run lint",
    build: "npm run build",
  };
}

/**
 * Resolves a VerifyCheck to a concrete shell command string.
 * Built-in names ("test", "lint", "build") map to npm scripts.
 * Custom strings are used as-is.
 * customCommands overrides take priority over defaults.
 */
function resolveCommand(
  check: VerifyCheck,
  customCommands?: Record<string, string>,
): string {
  if (customCommands && check in customCommands) {
    return customCommands[check];
  }
  const defaults = getDefaultCommands();
  if (check in defaults) {
    return defaults[check];
  }
  // Treat arbitrary string as a raw command
  return check;
}

/**
 * Executes a single shell command and returns the check result.
 */
function runCheck(
  check: VerifyCheck,
  command: string,
  workDir: string,
  timeoutMs: number,
): Promise<VerifyCheckResult> {
  const start = Date.now();

  return new Promise<VerifyCheckResult>((resolve) => {
    const child = exec(
      command,
      { cwd: workDir, timeout: timeoutMs },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - start;
        const output = [stdout, stderr].filter(Boolean).join("\n").trim();

        if (error) {
          // child_process sets error.killed when the process was killed by timeout
          const timedOut = error.killed === true;
          resolve({
            check,
            passed: false,
            output: timedOut ? `Timed out after ${timeoutMs}ms` : output || error.message,
            durationMs,
          });
          return;
        }

        resolve({
          check,
          passed: true,
          output: output || undefined,
          durationMs,
        });
      },
    );

    // Guard against exec returning null (shouldn't happen, but be safe)
    if (!child) {
      resolve({
        check,
        passed: false,
        output: "Failed to spawn process",
        durationMs: Date.now() - start,
      });
    }
  });
}

/**
 * Runs all verification checks for a graph node sequentially.
 *
 * @param nodeId - The graph node identifier (used for logging context)
 * @param checks - Array of verification checks to run
 * @param workDir - Working directory for command execution
 * @param customCommands - Optional overrides for built-in check names
 * @param timeoutMs - Per-check timeout in milliseconds (default 60s)
 * @returns Aggregated verification result with per-check details
 */
export async function verifyNode(
  nodeId: string,
  checks: VerifyCheck[],
  workDir: string,
  customCommands?: Record<string, string>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<VerificationResult> {
  if (checks.length === 0) {
    return { passed: true, checks: [] };
  }

  const results: VerifyCheckResult[] = [];

  for (const check of checks) {
    const command = resolveCommand(check, customCommands);
    const result = await runCheck(check, command, workDir, timeoutMs);
    results.push(result);
  }

  return {
    passed: results.every((r) => r.passed),
    checks: results,
  };
}
