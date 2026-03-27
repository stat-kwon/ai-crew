import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VerifyCheck } from "../types.js";

// Mock child_process.exec before importing the module under test
vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

import { getDefaultCommands, verifyNode } from "../verifier.js";
import { exec } from "node:child_process";

const mockExec = vi.mocked(exec);

/**
 * Helper: configure mockExec to invoke the callback with given args.
 * Simulates child_process.exec behavior.
 */
function setupExec(
  responses: Array<{
    error?: { message: string; killed?: boolean } | null;
    stdout?: string;
    stderr?: string;
  }>,
) {
  let callIndex = 0;
  mockExec.mockImplementation((...args: unknown[]) => {
    const callback = args[args.length - 1] as (
      error: Error | null,
      stdout: string,
      stderr: string,
    ) => void;
    const resp = responses[callIndex] ?? { stdout: "", stderr: "" };
    callIndex++;

    // Simulate async execution via setImmediate
    setImmediate(() => {
      if (resp.error) {
        const err = Object.assign(new Error(resp.error.message), {
          killed: resp.error.killed ?? false,
        });
        callback(err as Error, resp.stdout ?? "", resp.stderr ?? "");
      } else {
        callback(null, resp.stdout ?? "", resp.stderr ?? "");
      }
    });

    // Return a fake ChildProcess object
    return {} as ReturnType<typeof exec>;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDefaultCommands", () => {
  it("returns test, lint, and build commands", () => {
    const commands = getDefaultCommands();
    expect(commands).toEqual({
      test: "npm test",
      lint: "npm run lint",
      build: "npm run build",
    });
  });

  it("returns a new object each call (no shared mutation)", () => {
    const a = getDefaultCommands();
    const b = getDefaultCommands();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe("verifyNode", () => {
  it("returns passed=true with empty checks array", async () => {
    const result = await verifyNode("node-1", [], "/tmp");
    expect(result.passed).toBe(true);
    expect(result.checks).toHaveLength(0);
    expect(mockExec).not.toHaveBeenCalled();
  });

  it("runs a built-in check that passes", async () => {
    setupExec([{ stdout: "All tests passed" }]);

    const result = await verifyNode("node-1", ["test"], "/tmp/project");

    expect(result.passed).toBe(true);
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].check).toBe("test");
    expect(result.checks[0].passed).toBe(true);
    expect(result.checks[0].output).toBe("All tests passed");
    expect(result.checks[0].durationMs).toBeGreaterThanOrEqual(0);

    // Verify correct command was used
    expect(mockExec).toHaveBeenCalledWith(
      "npm test",
      expect.objectContaining({ cwd: "/tmp/project" }),
      expect.any(Function),
    );
  });

  it("runs a built-in check that fails", async () => {
    setupExec([{ error: { message: "exit code 1" }, stderr: "Lint errors found" }]);

    const result = await verifyNode("node-1", ["lint"], "/tmp/project");

    expect(result.passed).toBe(false);
    expect(result.checks[0].passed).toBe(false);
    expect(result.checks[0].output).toBe("Lint errors found");
  });

  it("uses error.message as output when stdout/stderr are empty", async () => {
    setupExec([{ error: { message: "Command failed" } }]);

    const result = await verifyNode("node-1", ["build"], "/tmp/project");

    expect(result.passed).toBe(false);
    expect(result.checks[0].output).toBe("Command failed");
  });

  it("handles timeout (error.killed = true)", async () => {
    setupExec([{ error: { message: "killed", killed: true } }]);

    const result = await verifyNode("node-1", ["test"], "/tmp/project", undefined, 5000);

    expect(result.passed).toBe(false);
    expect(result.checks[0].passed).toBe(false);
    expect(result.checks[0].output).toBe("Timed out after 5000ms");
  });

  it("runs multiple checks sequentially", async () => {
    setupExec([
      { stdout: "ok" },
      { stdout: "no lint issues" },
      { stdout: "build success" },
    ]);

    const checks: VerifyCheck[] = ["test", "lint", "build"];
    const result = await verifyNode("node-1", checks, "/tmp/project");

    expect(result.passed).toBe(true);
    expect(result.checks).toHaveLength(3);
    expect(result.checks.map((c) => c.check)).toEqual(["test", "lint", "build"]);
    expect(mockExec).toHaveBeenCalledTimes(3);
  });

  it("reports passed=false if any check fails", async () => {
    setupExec([
      { stdout: "ok" },
      { error: { message: "lint failed" }, stderr: "2 errors" },
      { stdout: "build ok" },
    ]);

    const result = await verifyNode("node-1", ["test", "lint", "build"], "/tmp/project");

    expect(result.passed).toBe(false);
    expect(result.checks[0].passed).toBe(true);
    expect(result.checks[1].passed).toBe(false);
    expect(result.checks[2].passed).toBe(true);
  });

  it("treats unknown check strings as raw commands", async () => {
    setupExec([{ stdout: "done" }]);

    await verifyNode("node-1", ["echo hello"], "/tmp/project");

    expect(mockExec).toHaveBeenCalledWith(
      "echo hello",
      expect.objectContaining({ cwd: "/tmp/project" }),
      expect.any(Function),
    );
  });

  it("uses customCommands to override built-in defaults", async () => {
    setupExec([{ stdout: "ok" }]);

    await verifyNode("node-1", ["test"], "/tmp/project", {
      test: "yarn test --ci",
    });

    expect(mockExec).toHaveBeenCalledWith(
      "yarn test --ci",
      expect.objectContaining({ cwd: "/tmp/project" }),
      expect.any(Function),
    );
  });

  it("uses customCommands for custom check names", async () => {
    setupExec([{ stdout: "ok" }]);

    await verifyNode("node-1", ["typecheck"], "/tmp/project", {
      typecheck: "tsc --noEmit",
    });

    expect(mockExec).toHaveBeenCalledWith(
      "tsc --noEmit",
      expect.objectContaining({ cwd: "/tmp/project" }),
      expect.any(Function),
    );
  });

  it("passes timeout option to exec", async () => {
    setupExec([{ stdout: "ok" }]);

    await verifyNode("node-1", ["test"], "/tmp/project", undefined, 30_000);

    expect(mockExec).toHaveBeenCalledWith(
      "npm test",
      expect.objectContaining({ timeout: 30_000 }),
      expect.any(Function),
    );
  });

  it("uses default 60s timeout when not specified", async () => {
    setupExec([{ stdout: "ok" }]);

    await verifyNode("node-1", ["test"], "/tmp/project");

    expect(mockExec).toHaveBeenCalledWith(
      "npm test",
      expect.objectContaining({ timeout: 60_000 }),
      expect.any(Function),
    );
  });

  it("combines stdout and stderr in output", async () => {
    setupExec([{ stdout: "line1", stderr: "warning" }]);

    const result = await verifyNode("node-1", ["build"], "/tmp/project");

    expect(result.checks[0].output).toBe("line1\nwarning");
  });

  it("sets output to undefined when stdout and stderr are empty on success", async () => {
    setupExec([{ stdout: "", stderr: "" }]);

    const result = await verifyNode("node-1", ["build"], "/tmp/project");

    expect(result.checks[0].passed).toBe(true);
    expect(result.checks[0].output).toBeUndefined();
  });
});
