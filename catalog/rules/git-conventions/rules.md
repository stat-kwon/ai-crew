# Git Conventions — Constraints

선택적 강화 규칙. 번들에서 `rules: [global, git-conventions]`로 활성화.
Git workflow의 구체적인 방법은 프로젝트 컨벤션을 따른다.

## Hard Constraints
- 커밋 형식: `type: description` (feat, fix, refactor, test, docs, chore)
- 하나의 커밋에 하나의 논리적 변경
- main/master에 직접 커밋 금지 — feature 브랜치 사용
- **Rebase 금지** — merge만 사용 (global rules에서도 강제)
