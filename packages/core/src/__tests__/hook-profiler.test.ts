import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  filterHooksByProfile,
  filterHooksConfigByProfile,
  resolveHookProfile,
  type HookMatcher,
  type HooksConfig,
} from "../hook-profiler.js";

describe("resolveHookProfile", () => {
  const originalEnv = process.env.AI_CREW_HOOK_PROFILE;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AI_CREW_HOOK_PROFILE;
    } else {
      process.env.AI_CREW_HOOK_PROFILE = originalEnv;
    }
  });

  it("returns undefined when no profile is set", () => {
    delete process.env.AI_CREW_HOOK_PROFILE;
    expect(resolveHookProfile()).toBeUndefined();
  });

  it("returns explicit profile when provided", () => {
    expect(resolveHookProfile("minimal")).toBe("minimal");
    expect(resolveHookProfile("standard")).toBe("standard");
    expect(resolveHookProfile("strict")).toBe("strict");
  });

  it("normalizes profile to lowercase", () => {
    expect(resolveHookProfile("STANDARD")).toBe("standard");
    expect(resolveHookProfile("  Strict  ")).toBe("strict");
  });

  it("falls back to environment variable", () => {
    process.env.AI_CREW_HOOK_PROFILE = "minimal";
    expect(resolveHookProfile()).toBe("minimal");
  });

  it("explicit parameter takes precedence over env var", () => {
    process.env.AI_CREW_HOOK_PROFILE = "minimal";
    expect(resolveHookProfile("strict")).toBe("strict");
  });

  it("throws on invalid profile", () => {
    expect(() => resolveHookProfile("debug")).toThrow(
      'Invalid hook profile "debug"',
    );
  });

  it("throws on invalid env var profile", () => {
    process.env.AI_CREW_HOOK_PROFILE = "invalid";
    expect(() => resolveHookProfile()).toThrow(
      'Invalid hook profile "invalid"',
    );
  });
});

describe("filterHooksByProfile", () => {
  const qualityGateHook: HookMatcher = {
    matcher: "Edit|Write",
    profiles: ["standard", "strict"],
    hooks: [{ type: "command", command: "npm test", timeout: 60 }],
  };

  const contextGuardHook: HookMatcher = {
    matcher: "*",
    profiles: ["minimal", "standard", "strict"],
    hooks: [{ type: "command", command: "echo guard", timeout: 5 }],
  };

  const legacyHook: HookMatcher = {
    matcher: "*",
    hooks: [{ type: "command", command: "echo legacy" }],
  };

  const allHooks = [qualityGateHook, contextGuardHook, legacyHook];

  it("returns all hooks when no profile is specified", () => {
    expect(filterHooksByProfile(allHooks)).toEqual(allHooks);
    expect(filterHooksByProfile(allHooks, undefined)).toEqual(allHooks);
    expect(filterHooksByProfile(allHooks, "")).toEqual(allHooks);
  });

  it("includes hooks matching the minimal profile", () => {
    const result = filterHooksByProfile(allHooks, "minimal");
    expect(result).toEqual([contextGuardHook, legacyHook]);
  });

  it("includes hooks matching the standard profile", () => {
    const result = filterHooksByProfile(allHooks, "standard");
    expect(result).toEqual([qualityGateHook, contextGuardHook, legacyHook]);
  });

  it("includes hooks matching the strict profile", () => {
    const result = filterHooksByProfile(allHooks, "strict");
    expect(result).toEqual([qualityGateHook, contextGuardHook, legacyHook]);
  });

  it("always includes hooks without profiles field (backward compat)", () => {
    const result = filterHooksByProfile([legacyHook], "minimal");
    expect(result).toEqual([legacyHook]);
  });

  it("always includes hooks with empty profiles array (backward compat)", () => {
    const emptyProfilesHook: HookMatcher = {
      matcher: "*",
      profiles: [],
      hooks: [{ type: "command", command: "echo empty" }],
    };
    const result = filterHooksByProfile([emptyProfilesHook], "minimal");
    expect(result).toEqual([emptyProfilesHook]);
  });

  it("returns empty array when no hooks match the profile", () => {
    const strictOnlyHook: HookMatcher = {
      matcher: "*",
      profiles: ["strict"],
      hooks: [{ type: "command", command: "echo strict-only" }],
    };
    const result = filterHooksByProfile([strictOnlyHook], "minimal");
    expect(result).toEqual([]);
  });
});

describe("filterHooksConfigByProfile", () => {
  const config: HooksConfig = {
    description: "Test hooks",
    hooks: {
      PostToolUse: [
        {
          matcher: "Edit|Write",
          profiles: ["standard", "strict"],
          hooks: [{ type: "command", command: "npm test", timeout: 60 }],
        },
      ],
      Stop: [
        {
          matcher: "*",
          profiles: ["minimal", "standard", "strict"],
          hooks: [{ type: "command", command: "echo stop", timeout: 5 }],
        },
      ],
      SubagentStart: [
        {
          matcher: "*",
          profiles: ["strict"],
          hooks: [{ type: "command", command: "echo agent", timeout: 3 }],
        },
      ],
    },
  };

  it("returns full config when no profile is specified", () => {
    const result = filterHooksConfigByProfile(config);
    expect(result).toEqual(config);
  });

  it("filters events by minimal profile", () => {
    const result = filterHooksConfigByProfile(config, "minimal");
    expect(Object.keys(result.hooks)).toEqual(["Stop"]);
    expect(result.hooks.Stop).toHaveLength(1);
  });

  it("filters events by standard profile", () => {
    const result = filterHooksConfigByProfile(config, "standard");
    expect(Object.keys(result.hooks).sort()).toEqual(["PostToolUse", "Stop"]);
  });

  it("includes all events for strict profile", () => {
    const result = filterHooksConfigByProfile(config, "strict");
    expect(Object.keys(result.hooks).sort()).toEqual([
      "PostToolUse",
      "Stop",
      "SubagentStart",
    ]);
  });

  it("omits events with no remaining matchers", () => {
    const result = filterHooksConfigByProfile(config, "minimal");
    expect(result.hooks.PostToolUse).toBeUndefined();
    expect(result.hooks.SubagentStart).toBeUndefined();
  });

  it("preserves description", () => {
    const result = filterHooksConfigByProfile(config, "minimal");
    expect(result.description).toBe("Test hooks");
  });
});
