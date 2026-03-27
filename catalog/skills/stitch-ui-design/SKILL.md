---
name: stitch-ui-design
description: |
  Google Stitch MCP를 사용해 UI/UX를 자동 생성할 때 사용.
  stitch-kit(gabelul/stitch-kit)을 외부 의존성으로 참조하며, 이 skill은 ai-crew 워크플로우와의 연결 방법만 정의한다.
  Use when: (1) UI 설계/프로토타입 생성이 필요할 때, (2) docs/ui-design-v2.md 기반으로 화면을 생성할 때,
  (3) 기존 디자인을 Next.js/React 코드로 변환할 때. stitch-kit이 설치되어 있어야 작동한다.
version: 1.0.0
---

# UI 설계 — Stitch MCP 연동 가이드

이 skill은 **stitch-kit**(https://github.com/gabelul/stitch-kit)을 직접 포함하지 않는다.
stitch-kit은 독립적으로 설치·업데이트하고, 이 skill은 ai-crew 프로젝트에서 어떻게 연결해서 쓰는지만 정의한다.

## 전제 조건

### 1. stitch-kit 설치 (한 번만)

```bash
npx @booplex/stitch-kit
```

설치 확인:
```bash
npx @booplex/stitch-kit status
```

업데이트가 필요할 때:
```bash
npx @booplex/stitch-kit update
```

### 2. Claude Code에 plugin 등록 (선택 — skill 워크플로우 활성화)

Claude Code 세션 안에서:
```
/plugin marketplace add https://github.com/gabelul/stitch-kit.git
/plugin install stitch-kit@stitch-kit
```

### 3. Stitch API 키 설정

1. https://stitch.withgoogle.com/settings 에서 API 키 발급
2. Claude Code에 Stitch MCP 연결:
```bash
claude mcp add stitch --transport http https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: YOUR-API-KEY" -s user
```

---

## ai-crew 워크플로우에서 사용하는 방법

### 시작 전 확인 사항

1. `docs/ui-design-v2.md` 읽기 — 페이지 구조와 컴포넌트 파악
2. stitch-kit 설치 여부 확인 (`npx @booplex/stitch-kit status`)
3. Stitch API 키 연결 확인

### 페이지별 생성 순서

ui-design-v2.md의 5개 뷰를 아래 순서로 생성한다.

**1단계: 디자인 방향 정하기 (stitch-ideate)**
```
stitch-kit의 ideation 기능을 사용해서
ai-crew UI (한국어, 팀 공유 개발 스튜디오) 의 디자인 방향 3가지를 제안해줘.
참고: docs/ui-design-v2.md
```

**2단계: 화면 일괄 생성**

stitch-kit orchestrator로 5개 페이지 한 번에 생성:
```
docs/ui-design-v2.md를 기반으로 ai-crew UI의 5개 화면을 Stitch로 생성해줘:
1. /design  — 설계 단계 타임라인 + 문서 뷰어
2. /team    — 에이전트 팀 구성 (드래그앤드롭 캔버스)
3. /develop — 칸반 보드 (대기/진행/완료/실패)
4. /preflight — 개발 환경 체크리스트
5. /config  — 설정 폼

스타일: 어두운 사이드바 + 밝은 메인, shadcn/ui 느낌, 한국어 텍스트
```

**3단계: Next.js 코드 변환**
```
생성된 Stitch 화면들을 Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui 코드로 변환해줘.
출력 위치: ui/src/app/ 하위 각 페이지 폴더
```

---

## 일관성 유지 규칙

Stitch로 여러 화면을 생성할 때 시각적 일관성을 위해:

- 첫 화면 생성 후 Stitch에서 "Design System ID" 또는 "Session ID" 확보
- 이후 화면 생성 시 같은 ID 참조
- 색상/폰트/간격은 첫 화면 기준 유지

---

## 업데이트 정책

stitch-kit은 이 skill과 독립적으로 관리된다.
- stitch-kit 업데이트: `npx @booplex/stitch-kit update`
- 이 skill 자체는 ai-crew 연결 가이드만 포함하므로 stitch-kit 버전에 영향받지 않는다.
- 연결 방법(API 엔드포인트, MCP 설정)이 변경된 경우에만 이 SKILL.md를 수정한다.

---

## 참고

- stitch-kit 공식 레포: https://github.com/gabelul/stitch-kit
- Google Stitch: https://stitch.withgoogle.com
- ai-crew UI 설계 문서: docs/ui-design-v2.md
