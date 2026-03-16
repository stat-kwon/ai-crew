#!/bin/bash
# Copy AI-DLC rule details into templates for npm packaging
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SRC="$ROOT_DIR/aidlc-workflows/aidlc-rules/aws-aidlc-rule-details"
DEST="$ROOT_DIR/templates/aidlc-rule-details"

if [ ! -d "$SRC" ]; then
  echo "Warning: aidlc-workflows not found at $SRC, skipping copy"
  exit 0
fi

rm -rf "$DEST"
mkdir -p "$DEST"
cp -r "$SRC"/* "$DEST"/
echo "Copied aidlc-rule-details to templates/"
