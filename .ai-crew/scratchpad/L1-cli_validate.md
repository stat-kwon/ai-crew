# cli_validate -- Backend Build Output

## Status: completed
Agent: backend-dev | Model: opus | Level: 1

## What -- Tasks Performed
- Created `src/cli-validate.ts`: standalone module with `runValidate(target)` function that reads and validates `.ai-crew/config.yaml`, `graph.yaml`, and `state.json`
- Added `validate` command to `src/cli.ts` with `--target <path>` option (defaults to cwd)
- Added `validateConfigYaml` to `src/validator.ts` for config.yaml schema validation (version, execution.defaultModel, hats.pipeline, checkpoints, language)
- Added router condition field warning stub (FR-9) in `validateGraphNodes` -- emits warning "Router condition evaluation not yet implemented" when a router node has a condition field
- Exported `validateConfigYaml` from `src/index.ts`

## Endpoints Implemented
- CLI command: `ai-crew validate [--target <path>]`
  - Reads config.yaml, graph.yaml, state.json from target directory
  - Runs validateConfigYaml, validateGraphYaml, validateStateJson respectively
  - Displays pass/fail/warn/skip per file with error details
  - Exits 0 on clean (warnings allowed), exits 1 on any validation errors or no files found

## How -- Approach & Decisions
- Separated validate logic into `cli-validate.ts` to keep `cli.ts` thin (single-responsibility)
- Used a `FileDescriptor` array pattern for extensibility -- adding new config files to validate requires only appending to the array
- Parse errors (malformed YAML/JSON) are caught and reported as errors without crashing
- Missing files are skipped gracefully (not errors) since not all projects have all files
- Warnings (like FR-9 router condition) do not cause exit code 1 -- only errors do

## Verification
- Build: pass (tsc --noEmit -- only pre-existing provider import errors)
- Tests: 66 passed, 0 failed (3 test files)
  - `cli-validate.test.ts`: 8 tests (all pass, all fail, partial, parse errors, warnings)
  - `validator.test.ts`: 48 tests (original 40 + 6 validateConfigYaml + 2 router condition)
  - `resolver.test.ts`: 10 tests (unchanged)

## Files Changed
- `src/cli-validate.ts` (new) -- validate runner module
- `src/cli.ts` -- added validate command registration
- `src/validator.ts` -- added validateConfigYaml, router condition warning
- `src/index.ts` -- exported validateConfigYaml
- `src/__tests__/cli-validate.test.ts` (new) -- integration tests for runValidate
- `src/__tests__/validator.test.ts` -- added validateConfigYaml and router condition tests

## Interface Dependencies
- Foundation provides: validateGraphYaml, validateStateJson, ValidationResult, ValidationError types
- Downstream consumers: any CLI user running `ai-crew validate`
- No external service dependencies
