# hook_profiling

## Status: completed
Agent: backend-dev | Model: opus | Level: 0

## What -- Tasks Performed
- **hooks.json profiles**: Added `profiles` field to all three catalog hook definitions:
  - quality-gate: `["standard", "strict"]`
  - subagent-tracker: `["standard", "strict"]`
  - context-guard: `["minimal", "standard", "strict"]`
- **hook-profiler module**: Created `src/hook-profiler.ts` with `filterHooksByProfile()`, `filterHooksConfigByProfile()`, and `resolveHookProfile()` functions
- **Environment variable support**: `AI_CREW_HOOK_PROFILE` env var read by `resolveHookProfile()`
- **Exports**: Added hook-profiler exports (functions + types) to `src/index.ts`
- **Tests**: 20 tests covering profile resolution, per-matcher filtering, full config filtering, backward compatibility, and edge cases

## How -- Approach & Decisions
- Defined `HookMatcher`, `HookAction`, and `HooksConfig` interfaces locally in hook-profiler.ts to keep the module self-contained and avoid coupling to the existing types.ts
- Three valid profiles: `minimal`, `standard`, `strict` -- validated at resolution time with clear error messages
- Backward compatibility: hooks without a `profiles` field (or with empty array) are always included regardless of active profile
- `filterHooksConfigByProfile()` operates on the full HooksConfig structure, omitting event keys that have zero remaining matchers after filtering
- Did NOT modify `src/installer.ts` -- the integration into `mergeSettings()` is deferred to the `integration_review` node to avoid file conflicts with `install_state`

## Result -- Completion Evidence
- Files:
  - `catalog/hooks/quality-gate/hooks.json` (profiles added)
  - `catalog/hooks/quality-gate/run-tests.sh` (unchanged, copied for completeness)
  - `catalog/hooks/subagent-tracker/hooks.json` (profiles added)
  - `catalog/hooks/context-guard/hooks.json` (profiles added)
  - `src/hook-profiler.ts` (new module)
  - `src/__tests__/hook-profiler.test.ts` (new test file)
  - `src/index.ts` (exports added)
- Tests: 20 passed, 0 failed
- TypeScript: compiles cleanly with `--noEmit`
- Commits: f363c0a

## Downstream Context
- **integration_review**: The `filterHooksConfigByProfile()` and `resolveHookProfile()` functions from `src/hook-profiler.ts` should be called inside `installer.ts`'s `mergeSettings()` (or wherever hooks are processed during install). The pattern is:
  ```typescript
  import { resolveHookProfile, filterHooksConfigByProfile } from "./hook-profiler.js";
  const profile = resolveHookProfile(); // reads AI_CREW_HOOK_PROFILE env var
  const filteredConfig = filterHooksConfigByProfile(hooksConfig, profile);
  ```
- **validator node**: The `HooksConfig` interface exported from `hook-profiler.ts` can be used by `validateHooksJson()` if needed for structural validation
- The `profiles` field on hook matchers is optional -- existing hooks.json files without it will continue to work unchanged
