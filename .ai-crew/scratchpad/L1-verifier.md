# verifier -- Backend Build Output

## Status: completed
Agent: backend-dev | Level: 1 | Skills: backend-node, testing

## What -- Tasks Performed
- Created `src/verifier.ts` with `getDefaultCommands()` and `verifyNode()` functions
- Created `src/__tests__/verifier.test.ts` with 16 tests covering all scenarios
- Updated `src/index.ts` to export verifier functions

## Endpoints Implemented
- `getDefaultCommands(): Record<string, string>` -- returns default npm commands for test/lint/build
- `verifyNode(nodeId, checks, workDir, customCommands?, timeoutMs?): Promise<VerificationResult>` -- runs verification checks via child_process.exec with configurable timeout (default 60s)

## How -- Approach & Decisions
- Merged crew/foundation to get VerifyCheck, VerificationResult, VerifyCheckResult types
- Built-in check names ("test", "lint", "build") resolve to npm scripts; arbitrary strings treated as raw commands
- customCommands parameter allows overriding built-in defaults or naming custom checks
- Checks run sequentially to avoid resource contention; each check gets its own timeout
- Timeout detection uses error.killed flag from child_process
- Output combines stdout and stderr; set to undefined when both are empty on success

## Database Changes
- None

## Verification
- Build: pass (only pre-existing provider import errors)
- Tests: 16 passed, 0 failed
- Full suite: 66 passed, 0 failed (3 test files)

## Interface Dependencies
- Types consumed from: src/types.ts (VerifyCheck, VerificationResult, VerifyCheckResult)
- Downstream consumers: graph executor will call verifyNode() after node completion
- External services: none (uses node:child_process)
