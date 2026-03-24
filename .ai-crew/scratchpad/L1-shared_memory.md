# shared_memory -- Backend Build Output

## Status: completed
Agent: backend-dev | Model: opus | Level: 1

## What -- Tasks Performed
- Created `src/shared-memory.ts` with 4 public functions: writeNodeOutput, readNodeOutput, readDependencyOutputs, clearMemory
- Created `src/__tests__/shared-memory.test.ts` with 23 tests covering all functions, edge cases, and corrupt file handling
- Updated `src/index.ts` to export all shared-memory functions

## Endpoints Implemented
- `writeNodeOutput(crewDir, nodeId, data)`: Atomic write using read -> merge -> write-to-temp -> rename pattern. Creates crewDir if missing. Each node writes only to its own key.
- `readNodeOutput(crewDir, nodeId)`: Returns node data or null if store/node missing.
- `readDependencyOutputs(crewDir, dependsOn)`: Reads multiple dependency outputs in one call. Missing deps omitted from result.
- `clearMemory(crewDir)`: Deletes the memory.json file. No-op if absent.

## How -- Approach & Decisions
- SharedMemoryStore type from types.ts used as the on-disk schema (version, nodes map, updatedAt)
- Atomic writes via temp file + rename to prevent partial-write corruption
- Input validation on all public functions (empty crewDir/nodeId throws)
- Corrupt/invalid JSON files cause load to throw; structurally invalid stores (missing version/nodes) return null and get replaced on next write
- No external dependencies -- uses only node:fs, node:path, node:crypto

## Database Changes
- File-based store: `.ai-crew/memory.json` (SharedMemoryStore JSON)

## Verification
- Build: pass (only pre-existing MCP provider import errors)
- Tests: 23 passed, 0 failed (shared-memory.test.ts)
- Full suite: 73 passed, 0 failed (3 test files)

## Interface Dependencies
- Downstream consumers: graph executor (writes node outputs after each node completes), checkpoint module (snapshots memory store), crew commands (clearMemory on reset)
- Types consumed: SharedMemoryStore from src/types.ts
