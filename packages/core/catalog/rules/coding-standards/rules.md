# Coding Standards — Constraints

선택적 강화 규칙. 번들에서 `rules: [global, coding-standards]`로 활성화.
구체적인 패턴/방법은 해당 skill(backend-node, frontend-react 등)이 SSOT.

## Hard Constraints
- 모든 코드는 기존 프로젝트의 컨벤션을 따라야 한다
- `any` 타입 사용 금지 — 명시적 타입 정의 필수
- public 함수에는 반드시 return type 명시
- lint 경고 없이 통과해야 한다
