# Code Review Report -- ai-crew Core Tests + Integration Code

## Quality Gates

| Gate | Command | Result |
|------|---------|--------|
| Build | `npm run build` | PASS (tsup ESM + DTS) |
| Tests | `npm test` | PASS -- 208 passed, 0 failed across 10 test files |
| TypeScript | `npx tsc --noEmit` | WARN -- 2 pre-existing errors in MCP providers (missing `@google/generative-ai` and `openai` type declarations). No errors in reviewed code. |
| Lint | N/A | No lint script configured |

## Codex Review

Note: Codex MCP tool (`agent_chat`) is not available in this environment. Full manual code review performed instead.

## Findings

| # | Severity | File:Line | Issue | Recommendation |
|---|----------|-----------|-------|----------------|
| 1 | MAJOR | `src/shared-memory.ts:105-109` | Race condition in `writeNodeOutput()`: read-modify-write cycle is not atomic. Two concurrent agents calling `writeNodeOutput()` for different nodes can lose one write because each reads the same store, modifies its own key, and writes back -- the second write overwrites the first. The atomic rename only prevents partial writes, not lost updates. | Introduce file-level locking (e.g., `proper-lockfile` or `fs-ext` flock) around the read-modify-write cycle. Alternatively, document that concurrent writes to `memory.json` are unsafe and rely on the graph executor to serialize level-by-level. |
| 2 | MAJOR | `src/types.ts:324` vs `src/installer.ts:15` | Duplicate `InstallOptions` interface. `types.ts:324` exports `InstallOptions` with only `force?: boolean`. `installer.ts:15` defines a local `InstallOptions` with `lang`, `force`, and `hookProfile`. The `index.ts:43` re-exports the types.ts version, so consumers importing from the package get the wrong interface. | Either remove the minimal `InstallOptions` from `types.ts` or unify the two definitions. The `installer.ts` version is the real contract. |
| 3 | MINOR | `src/shared-memory.ts:14,182-188` + `src/checkpoint.ts:14-19` | `NodeError` interface and `isNodeError()` helper are copy-pasted in both `shared-memory.ts` and `checkpoint.ts`. | Extract to a shared `src/utils.ts` or `src/errors.ts` module. |
| 4 | MINOR | `src/session-context.ts:107` | ENOENT detection uses inline cast `(err as NodeJS.ErrnoException).code === "ENOENT"` while `shared-memory.ts` and `checkpoint.ts` use a dedicated `isNodeError()` helper. Inconsistent error handling pattern across modules. | Adopt the `isNodeError()` pattern uniformly, ideally from a shared utility. |
| 5 | MINOR | `src/cli-validate.test.ts:8` | `TEST_DIR` uses `process.pid` for uniqueness, which is stable across test runs in the same process. If vitest runs tests in parallel within the same process, multiple suites would collide. Other test files use `Date.now() + Math.random()` for more robust uniqueness. | Use `Date.now() + Math.random()` or `mkdtemp()` consistently like `session-context.test.ts:24`. |
| 6 | MINOR | `src/resolver.test.ts:17` | Comment says "Cleanup is not strictly required for temp files" but then each test manually calls `await rm(path)`. The `testDir` is never cleaned up as a whole. If a test fails mid-way, orphaned temp files accumulate. | Add `afterAll(() => rm(testDir, { recursive: true, force: true }))` like other test files use `afterEach` for cleanup. |
| 7 | MINOR | `src/validator.ts:264-274` | `KNOWN_HOOK_EVENTS` set includes `PreUninstall`, `PostUninstall`, `PreLevelStart`, `PostLevelComplete` but the `validateHooksJson` test (line 295-307) only tests 5 of the 9 known events. The 4 additional events are not covered by any test. | Add a test that validates all 9 known events are accepted without warnings. |
| 8 | MINOR | `src/install-state.ts:133-137` | `diagnose()` compares `state.targetPath !== targetPath` for config mismatch, but `state.targetPath` is the absolute path at install time (from `result.targetPath`). If the user moves the project directory, this always triggers a false mismatch warning. | Consider making this comparison optional or document the limitation. |
| 9 | INFO | `src/verifier.ts:50-76` | `exec()` buffers all stdout/stderr in memory. Extremely large test outputs (e.g., verbose integration suites) could consume significant memory. | Acceptable for verification checks. Consider documenting a `maxBuffer` option or using `spawn` with streaming for future hardening. |
| 10 | INFO | `src/graph.ts:106` | Kahn's algorithm uses `queue.shift()` which is O(n) for arrays. For very large graphs this could be slow. | Not a concern for practical graph sizes (typically < 100 nodes). Note for future reference only. |
| 11 | INFO | `src/cli.ts:169-171` | The `validate` command calls `process.exit(exitCode)` immediately, which can prevent cleanup of open handles and suppress pending console output. | Consider returning the exit code and letting the program end naturally, or use `process.exitCode = exitCode` instead. |
| 12 | INFO | `src/index.ts:97-102` | Hook profiler types are re-exported both as `type` imports and value imports, which is correct. All 10 new modules are properly exported. No missing public APIs detected. | No action needed. |

## Test Coverage Assessment

### What is Well Tested

| Module | Tests | Coverage Quality |
|--------|-------|-----------------|
| validator.ts | 48 tests | Excellent -- all 6 validators tested with valid/invalid/edge cases, severity checking |
| graph.ts (validateGraph) | 24 tests | Excellent -- cycles, duplicates, dangling deps, verify/retry validation, diamond DAG |
| verifier.ts | 16 tests | Very good -- pass/fail, timeout, custom commands, sequential execution, output combining |
| shared-memory.ts | 23 tests | Very good -- CRUD, concurrent overwrites, corrupt file recovery, parameter validation |
| checkpoint.ts | 21 tests | Very good -- create/list/restore, backup files, level padding, missing state handling |
| session-context.ts | 20 tests | Very good -- save/load/merge, validation, deep directory creation, timestamp updates |
| hook-profiler.ts | 20 tests | Excellent -- all 3 profiles, backward compat, env var handling, config-level filtering |
| install-state.ts | 18 tests | Very good -- record/read/diagnose/uninstall, runtime dir exclusion, graceful deletion |
| cli-validate.ts | 8 tests | Good -- all file types, parse errors, warnings-only, missing files |
| resolver.ts | 10 tests | Good -- frontmatter parsing, quoted values, missing/unclosed/empty |

### Notable Missing Tests

1. **No integration test for `install()`**: The installer function is never tested end-to-end. It exercises `recordInstall`, `mergeHooksConfigs`, `filterHooksConfigByProfile` in sequence, but no test verifies the full orchestration.
2. **No CLI command tests**: The `doctor`, `uninstall`, and `validate` CLI commands are tested only via their underlying functions. No test exercises the Commander action handlers or verifies console output formatting.
3. **No test for `writeSettingsJson`** or **`appendClaudeMd`** in `installer.ts`: These are private functions but contain merge logic that could regress.
4. **`shared-memory.ts` concurrent write test**: Despite the race condition documented in Finding #1, there is no test demonstrating the lost-update scenario under concurrency.
5. **`validateConfigYaml` missing `language` boundary test**: Only tests `"fr"` as invalid but does not test `undefined` or missing `language` field.
6. **No test for `validateHooksJson` with all 9 known events**: Only 5 events tested (Finding #7).

## Design Compliance

- [x] Foundation types match design model (GraphNode, BundleConfig, verify/retry fields)
- [x] Graph validation implemented as two-layer: raw YAML (validator.ts) + typed semantic (graph.ts)
- [x] Verifier provides structured VerificationResult with per-check details and timing
- [x] Shared memory uses atomic write pattern (temp file + rename)
- [x] Checkpoint creates level-based snapshots with backup-before-restore safety
- [x] Session context persists cross-run learning via ProjectContext
- [x] Install state enables full lifecycle management (install/diagnose/uninstall)
- [x] CLI validate provides offline configuration validation
- [x] Hook profiler supports 3 tiers (minimal/standard/strict) with backward compat
- [x] All public APIs exported from index.ts
- [x] No unnecessary external dependencies added
- [x] ESM + TypeScript strict conventions followed throughout
- [ ] Gap: `InstallOptions` type mismatch between types.ts and installer.ts (Finding #2)

## Severity Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| MAJOR | 2 |
| MINOR | 6 |
| INFO | 4 |
| **Total** | **12** |

## Verdict

**APPROVE WITH COMMENTS**

All quality gates pass: 208 tests pass, build succeeds, no TypeScript errors in reviewed code. The test suite is comprehensive with good edge case coverage across all 10 modules. The two MAJOR findings -- the shared-memory race condition and the duplicate `InstallOptions` type -- are worth addressing but neither is blocking for the current milestone:

- The race condition (Finding #1) is mitigated by the graph executor running nodes level-by-level, so concurrent writes within a level are the only risk scenario. This should be documented and fixed before enabling true parallel execution.
- The duplicate `InstallOptions` (Finding #2) is a type-level inconsistency that does not cause runtime errors but will confuse library consumers. It should be unified.

The 6 MINOR and 4 INFO findings are typical code hygiene items (deduplication, consistency, test robustness) that can be addressed incrementally.
