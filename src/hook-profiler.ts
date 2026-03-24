/**
 * Hook Profiling System
 *
 * Filters hook matchers based on a profile level. Profiles control which hooks
 * are active during installation/execution:
 *
 *   - "minimal"  — Only essential safety hooks (e.g., context-guard)
 *   - "standard" — Recommended set for most projects (quality-gate, subagent-tracker, context-guard)
 *   - "strict"   — All hooks enabled
 *
 * Profile is determined by:
 *   1. Explicit `profile` parameter passed to filterHooksByProfile()
 *   2. AI_CREW_HOOK_PROFILE environment variable
 *   3. If neither is set, all hooks are included (backward compatible)
 *
 * Hooks without a `profiles` field are included in every profile (backward compatible).
 */

/**
 * A single hook matcher entry from a hooks.json file.
 * Matches the structure used in catalog/hooks/\*\/hooks.json.
 */
export interface HookMatcher {
  matcher: string;
  profiles?: string[];
  hooks: HookAction[];
}

export interface HookAction {
  type: string;
  command: string;
  timeout?: number;
}

/**
 * The top-level structure of a hooks.json file.
 * Maps hook event names (e.g., "PostToolUse", "Stop") to arrays of HookMatcher.
 */
export interface HooksConfig {
  description?: string;
  hooks: Record<string, HookMatcher[]>;
}

const VALID_PROFILES = ["minimal", "standard", "strict"] as const;
export type HookProfile = (typeof VALID_PROFILES)[number];

/**
 * Resolve the active hook profile from explicit parameter or environment variable.
 * Returns undefined if no profile is configured (include all hooks).
 */
export function resolveHookProfile(
  explicit?: string,
): string | undefined {
  const profile = explicit ?? process.env.AI_CREW_HOOK_PROFILE;
  if (!profile) return undefined;

  const normalized = profile.trim().toLowerCase();
  if (!VALID_PROFILES.includes(normalized as HookProfile)) {
    throw new Error(
      `Invalid hook profile "${profile}". Valid profiles: ${VALID_PROFILES.join(", ")}`,
    );
  }
  return normalized;
}

/**
 * Filter an array of HookMatcher entries by the given profile.
 *
 * - If profile is undefined/empty, all hooks are returned (backward compatible).
 * - Hooks without a `profiles` field are always included (backward compatible).
 * - Hooks with a `profiles` field are included only if the array contains the given profile.
 */
export function filterHooksByProfile(
  hooks: HookMatcher[],
  profile?: string,
): HookMatcher[] {
  if (!profile) return hooks;

  return hooks.filter((hook) => {
    // No profiles field means the hook is active in all profiles
    if (!hook.profiles || hook.profiles.length === 0) return true;
    return hook.profiles.includes(profile);
  });
}

/**
 * Filter an entire HooksConfig (all events) by profile.
 * Returns a new HooksConfig with only the matchers that match the profile.
 * Events with no remaining matchers are omitted.
 */
export function filterHooksConfigByProfile(
  config: HooksConfig,
  profile?: string,
): HooksConfig {
  if (!profile) return config;

  const filteredHooks: Record<string, HookMatcher[]> = {};

  for (const [event, matchers] of Object.entries(config.hooks)) {
    const filtered = filterHooksByProfile(matchers, profile);
    if (filtered.length > 0) {
      filteredHooks[event] = filtered;
    }
  }

  return {
    ...config,
    hooks: filteredHooks,
  };
}
