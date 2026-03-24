# integration_review -- Review Report

## Merge Results

All 9 worker branches merged into `crew/integration_review`:

| Branch | Result | Conflicts |
|--------|--------|-----------|
| crew/foundation | Clean merge | None |
| crew/hook_profiling | Conflict resolved | `src/index.ts` -- combined exports from foundation + hook-profiler |
| crew/graph_ext | Conflict resolved | `src/index.ts` -- added graph exports alongside hook-profiler exports |
| crew/verifier | Conflict resolved | `src/index.ts` -- added verifier exports |
| crew/install_state | Clean merge | Auto-resolved `src/index.ts` (install-state exports) |
| crew/shared_memory | Conflict resolved | `src/index.ts` -- added shared-memory exports |
| crew/session_context | Conflict resolved | `src/index.ts` -- added session-context exports |
| crew/cli_validate | Conflict resolved | `src/cli.ts` (doctor/uninstall + validate commands), `src/index.ts` (validateConfigYaml) |
| crew/checkpoint | Conflict resolved | `src/index.ts` -- added checkpoint exports |

All conflicts were in `src/index.ts` (export accumulation pattern -- each branch added its exports at the same location) and `src/cli.ts` (install_state and cli_validate both added commands). Resolution: combined all exports/commands.

## Hook Profiler Integration

Added `mergeHooksConfigs()` to `src/installer.ts`:
- Reads all `catalog/hooks/*/hooks.json` files
- Merges hook matchers by event name
- Filters by active hook profile via `resolveHookProfile()`
- Writes filtered result to `.claude/hooks.json`
- Added `hookProfile` option to `InstallOptions`

## Quality Gates

| Gate | Command | Result |
|------|---------|--------|
| Build | `npm run build` | PASS (tsup ESM + DTS in ~1.3s) |
| Tests | `npm test` | PASS -- 208 passed, 0 failed (10 test files) |
| Lint | N/A | No lint script configured in package.json |

## Test Coverage by Module

| Test File | Tests | Status |
|-----------|-------|--------|
| hook-profiler.test.ts | 20 | PASS |
| verifier.test.ts | 16 | PASS |
| graph.test.ts | 24 | PASS |
| resolver.test.ts | 10 | PASS |
| validator.test.ts | 48 | PASS |
| session-context.test.ts | 20 | PASS |
| install-state.test.ts | 18 | PASS |
| cli-validate.test.ts | 8 | PASS |
| shared-memory.test.ts | 23 | PASS |
| checkpoint.test.ts | 21 | PASS |

## Code Review Findings

Note: Codex MCP tool (`agent_chat`) is not available in this environment. Review performed via direct code analysis.

| # | Severity | File:Line | Issue | Recommendation |
|---|----------|-----------|-------|----------------|
| 1 | Minor | `src/shared-memory.ts:91` | Race condition: concurrent `writeNodeOutput()` calls from different agents do read-modify-write on the same file. While each node writes its own key, two agents calling simultaneously could lose one write. | Consider file locking (e.g., `proper-lockfile`) or accept the risk given sequential level execution in practice. |
| 2 | Minor | `src/verifier.ts:50` | `exec()` from `child_process` buffers stdout/stderr in memory. Very large test outputs could cause high memory usage. | Acceptable for verification checks. Document the limitation if max output size becomes relevant. |
| 3 | Info | `src/types.ts:324-326` | `InstallOptions` in types.ts has only `force?: boolean` but `src/installer.ts:16-19` defines its own `InstallOptions` with `lang` and `hookProfile`. Duplicate interface name. | Not a runtime bug (installer uses its own local type), but the exported type from types.ts is misleading. Consider renaming one or removing the types.ts version. |
| 4 | Info | `src/checkpoint.ts:14-16` | `NodeError` interface and `isNodeError()` helper are duplicated between `checkpoint.ts` and `shared-memory.ts:182-188`. | Extract to a shared utility module to reduce duplication. |
| 5 | Info | `src/session-context.ts:107` | ENOENT detection uses inline `(err as NodeJS.ErrnoException).code === "ENOENT"` pattern while other modules use a `NodeError` interface. | Standardize the pattern across modules for consistency. |

## Design Compliance

- [x] Foundation types match the design model (AICrewState, BundleConfig, GraphNode, etc.)
- [x] Graph validation supports verify/retry fields as optional (backward compatible)
- [x] Validator operates on raw YAML data (pre-parse); graph.ts on typed GraphNode[] (post-parse)
- [x] Verifier runs shell commands with timeout and produces structured results
- [x] Shared memory uses atomic write pattern (temp file + rename)
- [x] Checkpoint creates snapshots of state + memory, supports list/restore
- [x] Session context persists ProjectContext across runs
- [x] Install state enables doctor/uninstall lifecycle management
- [x] CLI validate provides offline config validation
- [x] Hook profiler supports profile-based filtering (minimal/standard/strict)
- [x] No external dependencies added to package.json
- [x] All public functions exported from index.ts
- [x] ESM + TypeScript strict conventions followed
- [x] No `any` usage in new modules (only in pre-existing MCP providers)

## Backward Compatibility Assessment

- **graph.yaml without verify/retry**: PASS -- validator checks `!== undefined` before validating these fields
- **bundle.yaml without new fields**: PASS -- BundleConfig.aidlc is optional (`aidlc?: AidlcConfig`)
- **Install on clean target**: PASS (conceptual) -- installer creates all directories, writes defaults, records install state. The new `mergeHooksConfigs` step is no-op when catalog/hooks/ does not exist.

## Verdict

**APPROVED**

All quality gates pass. 208 tests across 10 test files. Build succeeds. No critical or major issues found. The 5 findings are Minor/Info severity and do not block integration. The codebase follows consistent patterns: input validation, atomic file writes, proper error handling with ENOENT detection, and backward-compatible schema evolution.
