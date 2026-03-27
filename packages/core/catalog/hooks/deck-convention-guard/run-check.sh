#!/bin/bash
set -euo pipefail

# Deck DAG 파일에서 인라인 SQL 의심 패턴을 탐지한다.
# Hook 입력(JSON)에서 이번 Write/Edit 대상 파일만 검사해 레포 전체 오탐을 피한다.

TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"
[ -z "$TOOL_INPUT" ] && exit 0

TARGETS="$(python3 - <<'PY'
import json
import os

raw = os.environ.get('CLAUDE_TOOL_INPUT', '')
try:
    data = json.loads(raw)
except Exception:
    raise SystemExit(0)

for key in ('file_path', 'path'):
    value = data.get(key)
    if isinstance(value, str) and value:
        norm = value.replace('\\', '/')
        if '/dags/' in norm and norm.endswith('.py'):
            print(value)
PY
)"

[ -z "$TARGETS" ] && exit 0

violations=0

CHANGED_SNIPPET="$(python3 - <<'PY'
import json
import os

raw = os.environ.get('CLAUDE_TOOL_INPUT', '')
try:
    data = json.loads(raw)
except Exception:
    raise SystemExit(0)

parts = []
for key in ('new_string', 'newText', 'content', 'old_string', 'oldText'):
    value = data.get(key)
    if isinstance(value, str) and value:
        parts.append(value)

print('\n'.join(parts))
PY
)"

changed_has_sql_pattern=1
if [ -n "$CHANGED_SNIPPET" ]; then
  if CHANGED_SNIPPET="$CHANGED_SNIPPET" python3 - <<'PY'
import os
import re

text = os.environ.get('CHANGED_SNIPPET', '')
patterns = [
    re.compile(r'^[A-Z0-9_]+_SQL\s*=\s*("""|\'\'\')', re.MULTILINE),
    re.compile(r'SQLExecuteQueryOperator\([\s\S]{0,400}?sql\s*=\s*("""|\'\'\')', re.MULTILINE),
]
raise SystemExit(0 if any(p.search(text) for p in patterns) else 1)
PY
  then
    changed_has_sql_pattern=0
  fi
fi

while IFS= read -r file; do
  [ -n "$file" ] || continue
  [ -f "$file" ] || continue

  if [ -n "$CHANGED_SNIPPET" ] && [ "$changed_has_sql_pattern" -ne 0 ]; then
    continue
  fi

  if grep -nE "^[A-Z0-9_]+_SQL[[:space:]]*=[[:space:]]*(\"\"\"|''')" "$file" >/dev/null 2>&1; then
    echo "[deck-convention-guard] 인라인 SQL 상수 금지: $file"
    grep -nE "^[A-Z0-9_]+_SQL[[:space:]]*=[[:space:]]*(\"\"\"|''')" "$file" || true
    violations=1
  fi

  if python3 - "$file" <<'PY'
import pathlib
import re
import sys

text = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
pattern = re.compile(r"SQLExecuteQueryOperator\([\s\S]{0,400}?sql\s*=\s*(\"\"\"|''')", re.MULTILINE)
raise SystemExit(0 if pattern.search(text) else 1)
PY
  then
    echo "[deck-convention-guard] SQLExecuteQueryOperator에 인라인 SQL 금지: $file"
    violations=1
  fi
done <<EOF
$TARGETS
EOF

if [ "$violations" -ne 0 ]; then
  echo "[deck-convention-guard] 실패: SQL을 별도 .sql 파일로 분리하세요. 예외가 필요하면 skill 문서에 근거를 남기세요."
  exit 1
fi

exit 0
