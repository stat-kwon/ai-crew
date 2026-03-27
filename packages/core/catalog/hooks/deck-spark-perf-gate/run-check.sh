#!/bin/bash
set -euo pipefail

# Python 파일 변경 후 대표적인 Spark 성능 안티패턴을 탐지한다.
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
        if norm.endswith('.py') and ('/sparks/' in norm or '/jobs/' in norm or '/lib/' in norm):
            print(value)
PY
)"

[ -z "$TARGETS" ] && exit 0

violations=0
warnings=0

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

changed_has_perf_pattern=1
if [ -n "$CHANGED_SNIPPET" ]; then
  if printf '%s\n' "$CHANGED_SNIPPET" | grep -Eq '\.collect[[:space:]]*\(|\.repartition[[:space:]]*\('; then
    changed_has_perf_pattern=0
  fi
fi

while IFS= read -r file; do
  [ -n "$file" ] || continue
  [ -f "$file" ] || continue

  if [ -n "$CHANGED_SNIPPET" ] && [ "$changed_has_perf_pattern" -ne 0 ]; then
    continue
  fi

  if grep -nE '\.collect\s*\(' "$file" >/dev/null 2>&1; then
    echo "[deck-spark-perf-gate] collect() 사용 감지: $file"
    grep -nE '\.collect\s*\(' "$file" || true
    violations=1
  fi

  repartition_count=$(grep -cE '\.repartition\s*\(' "$file" || true)
  if [ "$repartition_count" -ge 3 ]; then
    echo "[deck-spark-perf-gate] repartition() 과다 사용 의심 (${repartition_count}회): $file"
    grep -nE '\.repartition\s*\(' "$file" || true
    warnings=$((warnings + 1))
  fi
done <<EOF
$TARGETS
EOF

if [ "$violations" -ne 0 ]; then
  echo "[deck-spark-perf-gate] 실패: 대량 데이터 경로의 collect()를 제거하거나 limit()/show()로 대체하세요."
  exit 1
fi

if [ "$warnings" -ne 0 ]; then
  echo "[deck-spark-perf-gate] 경고: repartition() 호출 이유를 재검토하세요."
fi

exit 0
