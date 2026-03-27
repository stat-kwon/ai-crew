---
name: stitch-ui-design
description: |
  Google Stitch MCP를 사용해 UI/UX를 자동 생성할 때 사용.
  stitch-kit(gabelul/stitch-kit)을 외부 의존성으로 참조하며, 이 skill은 ai-crew 워크플로우와의 연결 방법만 정의한다.
  Use when: (1) UI 설계/프로토타입 생성이 필요할 때, (2) 설계 문서나 요구사항 기반으로 화면을 생성할 때,
  (3) 기존 디자인을 Next.js/React 코드로 변환할 때. stitch-kit이 설치되어 있어야 작동한다.
version: 1.0.0
---

# UI 설계 — Stitch MCP 연동 가이드

이 skill은 **stitch-kit**(https://github.com/gabelul/stitch-kit)을 직접 포함하지 않는다.
stitch-kit은 독립적으로 설치·업데이트하고, 이 skill은 ai-crew 프로젝트에서 어떻게 연결해서 쓰는지만 정의한다.

---

## 전제 조건

### 1. stitch-kit 설치 (한 번만)

```bash
npx @booplex/stitch-kit
```

설치 확인:
```bash
npx @booplex/stitch-kit status
```

업데이트:
```bash
npx @booplex/stitch-kit update
```

### 2. Claude Code plugin 등록 (선택 — 전체 skill 워크플로우 활성화)

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

## 사용 방법

### 입력 자료 준비

Stitch 생성을 시작하기 전에 다음 중 하나 이상을 준비한다.
어떤 형태든 상관없다 — 단어 수준의 메모도 충분하다.

| 자료 종류 | 예시 |
|----------|------|
| 설계 문서 | `docs/ui-design.md`, `docs/wireframe.md` 등 |
| 요구사항 메모 | "칸반 보드, 한국어, 어두운 사이드바" |
| 기존 화면 스크린샷 | 참고 이미지 첨부 |
| 경쟁사/레퍼런스 URL | "이런 느낌으로 만들어줘" |
| 없음 | 브레인스토밍부터 시작 가능 |

---

### 3단계 플로우

#### Step 1 — 디자인 방향 정하기

stitch-kit의 ideation 기능을 활용해 방향을 먼저 잡는다.

```
[준비한 자료 또는 아이디어]를 바탕으로
디자인 방향 3가지를 제안해줘.
각 방향마다 색상 팔레트, 타이포그래피, 전체적인 분위기를 포함해줘.
```

#### Step 2 — 화면 생성

방향이 정해지면 화면을 생성한다.
화면 수, 이름, 스타일은 프로젝트에 맞게 자유롭게 지정한다.

```
[선택한 디자인 방향]으로 다음 화면들을 Stitch로 생성해줘:
- [화면 1 이름]: [간단한 설명]
- [화면 2 이름]: [간단한 설명]
...

스타일: [원하는 느낌 자유롭게 기술]
```

**일관성 유지**: 여러 화면을 만들 때는 첫 화면의 Stitch Session ID를 이후 화면에도 동일하게 사용한다.

#### Step 3 — 코드 변환

```
생성된 Stitch 화면들을 [원하는 프레임워크] 코드로 변환해줘.
출력 위치: [코드를 저장할 폴더]
```

지원 프레임워크: Next.js, React, Svelte, React Native, SwiftUI, HTML

---

## 프롬프트 팁

stitch-kit은 구체적인 프롬프트일수록 품질이 높아진다.

**좋은 예:**
```
어두운 사이드바 + 밝은 메인 영역, shadcn/ui 컴포넌트 스타일,
한국어 텍스트, SaaS 대시보드 느낌의 칸반 보드 화면
```

**약한 예:**
```
칸반 보드 화면 만들어줘
```

전체 앱에서 일관된 색상·폰트를 쓰려면 첫 화면 생성 시 디자인 시스템을 명시적으로 지정한다.

---

## 업데이트 정책

stitch-kit은 이 skill과 독립적으로 관리된다.

- stitch-kit 업데이트: `npx @booplex/stitch-kit update`
- 이 SKILL.md는 연결 방법(MCP 설정, API 엔드포인트)이 바뀔 때만 수정한다.

---

## 참고

- stitch-kit: https://github.com/gabelul/stitch-kit
- Google Stitch: https://stitch.withgoogle.com
