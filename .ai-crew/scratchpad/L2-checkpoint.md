# checkpoint — Backend Build Output

## Functions Implemented
- `createCheckpoint(crewDir, level)`: Reads state.json + memory.json, saves combined snapshot to .ai-crew/checkpoints/level-{NNN}.json, returns file path
- `listCheckpoints(crewDir)`: Scans .ai-crew/checkpoints/ directory, returns CheckpointInfo[] sorted by level ascending
- `restoreCheckpoint(checkpointPath, crewDir)`: Reads checkpoint file, backs up existing state.json/memory.json to .bak, then overwrites with checkpoint data

## Files Created
- `src/checkpoint.ts` — checkpoint create/list/restore logic
- `src/__tests__/checkpoint.test.ts` — 21 tests covering all paths

## Files Modified
- `src/index.ts` — added checkpoint exports (createCheckpoint, listCheckpoints, restoreCheckpoint)

## Design Decisions
- Uses same atomic write pattern as shared-memory (temp file + rename) for crash safety
- Zero-pads level to 3 digits in filenames (level-000.json, level-001.json, etc.)
- Creates default empty memory store when memory.json does not exist (nodes may not have written output yet)
- Backs up existing files to .bak before restore (state.json.bak, memory.json.bak)
- Imports SharedMemoryStore from types.ts as specified (not from shared-memory.ts)

## Verification
- Build: N/A (no tsup config changes)
- Tests: 21 passed, 0 failed (checkpoint.test.ts)
- Full suite: 94 passed across 4 test files

## Interface Dependencies
- Depends on: types.ts (CheckpointData, CheckpointInfo, GraphState, SharedMemoryStore)
- Consumed by: crew-checkpoint command, crew-restore command
- Reads: .ai-crew/state.json, .ai-crew/memory.json
- Writes: .ai-crew/checkpoints/level-{NNN}.json
