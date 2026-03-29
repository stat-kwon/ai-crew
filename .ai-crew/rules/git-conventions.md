# Git Conventions — SSOT

모든 에이전트(오케스트레이터 포함)가 따르는 Git 규칙.
이 파일이 커밋 형식과 브랜치 네이밍의 **단일 진실 공급원(SSOT)**.

---

## Commit Format

```
type(scope): description
```

`description`은 `defaults.locale`에 따라 해당 언어로 작성한다.
- `locale: ko` → `feat(backend): 사용자 인증 API 추가`
- `locale: en` → `feat(backend): add user auth API`

`type`과 `scope`는 항상 영어 (기계 파싱용).

### Types

| Type | 용도 |
|------|------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변경 없는 코드 개선 |
| `test` | 테스트 추가/수정 |
| `docs` | 문서 변경 |
| `chore` | 빌드, 설정, 상태 관리 등 비기능 변경 |

### Scope

| Scope | 용도 | 예시 |
|-------|------|------|
| `{node_id}` | 작업 노드 (에이전트가 사용) | `feat(backend): ...` |
| `crew` | 그래프 오케스트레이션 | `chore(crew): prepare L0` |
| `integrate` | 브랜치 통합 | `chore(integrate): merge backend` |

### Examples (locale: ko)

```bash
# 에이전트 작업 커밋
feat(backend): 사용자 인증 API 추가
fix(frontend): 하이드레이션 불일치 수정
test(backend): 인증 통합 테스트 추가
refactor(db_design): 스키마 정규화

# 오케스트레이션 커밋
chore(crew): L0 준비 — foundation, hook_profiling
chore(crew): L1 완료 — backend, frontend

# 통합 커밋
chore(integrate): backend 병합
chore(integrate): frontend 병합
```

---

## Branch Naming

```
crew/{runId}/{node_id}
```

| 구성 | 예시 |
|------|------|
| `{runId}` | Run ID (예: `initial-build-20260324-1`) |
| `{node_id}` | 그래프 노드 ID (예: `backend`, `frontend`) |

### Examples

```
crew/initial-build-20260324-1/backend
crew/initial-build-20260324-1/frontend
crew/fix-auth-20260325-1/backend
```

---

## Hard Constraints

1. 하나의 커밋에 하나의 논리적 변경
2. main/master에 직접 커밋 금지 — `crew/{runId}/{node_id}` 브랜치 사용
3. **Rebase 금지** — merge만 사용
4. 에이전트는 자신의 브랜치에서만 커밋
5. 브랜치 병합은 `/crew:integrate`가 담당
