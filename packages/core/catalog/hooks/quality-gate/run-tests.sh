#!/bin/bash
# Quality gate: run tests after code changes
# This hook runs automatically after Edit or Write tool usage

set -e

# Detect test runner
if [ -f "package.json" ]; then
  if grep -q '"test"' package.json 2>/dev/null; then
    npm test -- --related 2>&1 || exit 1
  fi
elif [ -f "Cargo.toml" ]; then
  cargo test 2>&1 || exit 1
elif [ -f "go.mod" ]; then
  go test ./... 2>&1 || exit 1
elif [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
  python -m pytest 2>&1 || exit 1
fi
