# install_state -- Backend Build Output

## Status: completed
Agent: backend-dev | Model: opus | Level: 1

## What -- Tasks Performed
- Created src/install-state.ts with 4 exported functions: recordInstall, readInstallState, diagnose, uninstall
- Modified src/installer.ts to track all installed files during copy operations and call recordInstall at end of install()
- Added `doctor` and `uninstall` commands to src/cli.ts
- Created src/__tests__/install-state.test.ts with 18 tests covering all functions
- Updated src/index.ts to export all install-state functions

## Endpoints Implemented
- CLI `ai-crew doctor` -- diagnoses installation health, reports missing/extra files and config mismatches
- CLI `ai-crew uninstall` -- removes all tracked files, cleans empty dirs, supports --yes flag for non-interactive use

## How -- Approach & Decisions
- recordInstall() stores relative paths (sorted) in .ai-crew/install-state.json for portability
- diagnose() compares recorded file list vs filesystem; skips runtime dirs (scratchpad, sessions, checkpoints, state.json) to avoid false positives
- uninstall() removes tracked files then walks directory tree bottom-up to clean empty dirs; also removes install-state.json itself
- installer.ts replaced copyDir with copyDirTracked that returns list of destination file paths; added collectFilesInDir helper using readdir withFileTypes
- Input validation on recordInstall: rejects empty targetPath, non-object result, non-array files
- readInstallState returns null (not throws) for missing/malformed/wrong-shape JSON -- defensive by design
- uninstall CLI includes interactive confirmation prompt; skippable with --yes

## Verification
- Build: pass (only pre-existing provider import errors for google/openai)
- Tests: 68 passed, 0 failed (18 new + 50 existing)

## Files
- src/install-state.ts (new)
- src/installer.ts (modified)
- src/cli.ts (modified)
- src/index.ts (modified)
- src/__tests__/install-state.test.ts (new)

## Interface Dependencies
- Types consumed: InstallResult, InstallState, DiagnosticResult, UninstallResult (from types.ts via foundation)
- Downstream: cli_validate node may reference doctor command; integration will merge with other CLI additions

## Downstream Context
- install_state exports are available from index.ts for any consumer
- The installer now writes .ai-crew/install-state.json on every install; downstream code can rely on this file existing after successful init
- uninstall removes files recorded in install-state.json; any files added after install (runtime state, scratchpad) are preserved
