# Unit of Work Definitions

## Unit 1: `api-accuracy`
**설명**: API 파서 강화 — aidlc-state.md 파싱 로직 개선 및 runs API 응답 개선

**책임**:
- `aidlc-state.md` 파싱 로직 강화: 다양한 마크다운 형식 인식 (### 헤더, 체크박스 패턴 다양화)
- 데이터 없음 vs "시작 전" 명확 구분
- `aidlc-docs/` 디렉토리 하위 파일 존재 여부를 보조 지표로 활용
- `api/aidlc/docs/route.ts` 개선: 폴더 구조를 사용자 친화적 그룹으로 매핑하여 응답
- **테스트 인프라 구축**: `vitest.config.ts` 설정 (이 유닛이 Level 0 선행이므로 테스트 러너 설정 포함)

**대상 파일**:
- `ui/src/app/api/aidlc/state/route.ts` — 파서 로직 강화
- `ui/src/app/api/aidlc/docs/route.ts` — 폴더 매핑 메타데이터 추가
- `ui/vitest.config.ts` — 테스트 러너 설정 (신규)
- `ui/src/app/api/aidlc/__tests__/state-parser.test.ts` — 파서 스냅샷 테스트 (신규)
- `ui/src/app/api/aidlc/__tests__/docs-api.test.ts` — docs API 응답 테스트 (신규)

**완료 기준**:
- aidlc-state.md의 `### INCEPTION PHASE` + `- [x]`/`- [ ]` 패턴을 파싱하여 정확한 체크박스 수 반환 (1:1 일치)
- 파일 없을 때 빈 stages 배열 반환 (에러 아닌 정상 응답)
- docs API가 폴더별 그룹 + 한글 레이블 반환
- `vitest run` 시 state-parser.test.ts, docs-api.test.ts 모두 통과

---

## Unit 2: `dashboard-cards`
**설명**: 대시보드 페이지 카드 전면 개선 (FR-2, FR-3, FR-5, FR-6)

**책임**:
- 마지막 실행 카드: `RunManifest.intent.description` 기반 자연어 요약 표시
- 개발 흐름: 4단계로 축소 (elaborate → preflight → run → integrate), 실제 데이터 기반 상태 판단
- 설계 진행 카드: 파싱 결과 정확히 반영, 데이터 없을 때 "설계 데이터 없음" 표시
- 에이전트 상태 카드: "팀원 현황" → "에이전트 현황"으로 변경, 정보 표현 개선
- 용어 통일: "팀" → "에이전트 팀", "번들" → "팀 템플릿" 등

**대상 파일**:
- `ui/src/app/page.tsx` — 대시보드 전체
- `ui/src/app/__tests__/dashboard.test.ts` — 대시보드 카드 렌더링 테스트 (신규)

**용어 변경 매트릭스**:
| 기존 | 변경 후 |
|------|---------|
| 팀원 현황 | 에이전트 현황 |
| 현재 팀 구성 | 현재 에이전트 팀 |
| 시작 전 (설계 상태 초기값/fallback) | 설계 데이터 없음 |
| 팀 | 에이전트 팀 |
| 번들 | 팀 템플릿 |

**완료 기준**:
- 4개 상단 카드가 API 응답 데이터와 1:1 일치하는 값을 표시
- 개발 흐름이 정확히 4단계(elaborate → preflight → run → integrate)로 렌더링
- UI 텍스트에 "팀원", "번들" 등 구용어가 0건
- `vitest run` 시 dashboard.test.ts 통과

---

## Unit 3: `sidebar-topnav`
**설명**: 사이드바 CTA 변경 + 전체 레이아웃 용어 통일 (FR-1, FR-7)

**책임**:
- 사이드바 CTA: "신규 프로젝트" → "프로젝트 전환"으로 변경
- 네비게이션 메뉴 레이블 용어 통일 (에이전트 중심)
- TopNav 변경 없음 (현재 구조 유지)
- 하단 번들 표시: "팀 템플릿: {name}" 형식

**대상 파일**:
- `ui/src/components/layout/Sidebar.tsx`
- `ui/src/components/layout/TopNav.tsx` (minimal)
- `ui/src/components/layout/__tests__/sidebar.test.ts` — 사이드바 용어/CTA 테스트 (신규)

**용어 변경 매트릭스**:
| 기존 | 변경 후 |
|------|---------|
| 신규 프로젝트 | 프로젝트 전환 |
| 번들 | 팀 템플릿 |

**완료 기준**:
- CTA 버튼 텍스트가 "프로젝트 전환"으로 변경됨
- 사이드바 내 모든 네비게이션 레이블에 구용어("신규 프로젝트", "번들") 0건
- 하단에 "팀 템플릿: {name}" 형식으로 현재 번들명 표시
- `vitest run` 시 sidebar.test.ts 통과

---

## Unit 4: `design-page`
**설명**: 설계 단계 페이지 폴더 매핑 뷰 (FR-8)

**책임**:
- AI-DLC 인셉션 폴더 구조를 사용자 친화적 그룹으로 매핑
  - `inception/requirements/` → "요구사항 분석"
  - `inception/user-stories/` → "사용자 시나리오"
  - `inception/plans/` → "작업 계획"
  - `inception/application-design/` → "애플리케이션 설계"
  - `construction/{unit}/` → "유닛: {unit명}"
- 파일명을 한글 레이블로 변환
- 문서 선택 시 마크다운 프리뷰 유지
- 폴더 구조를 모르는 사용자도 직관적 탐색 가능

**대상 파일**:
- `ui/src/app/design/page.tsx` — 폴더 매핑 뷰 구현
- `ui/src/app/design/__tests__/design-page.test.ts` — 폴더 매핑 렌더링 테스트 (신규)

**완료 기준**:
- docs API 응답의 그룹 수만큼 그룹 카드가 렌더링됨
- 각 그룹 카드 내에 해당 폴더의 .md 파일이 한글 레이블로 나열됨
- 문서 선택 시 마크다운 프리뷰가 해당 파일 내용을 표시
- `vitest run` 시 design-page.test.ts 통과

---

## Unit 5: `develop-page`
**설명**: 개발 진행 페이지 용어 통일 + 실행 이력 표현 개선 (FR-4, FR-6)

**책임**:
- 칸반 보드 용어: "팀원" → "에이전트"
- 칸반 카드 내 agent 이름 표시 개선
- 실행 기록 탭: intent description 기반 요약 표시
- 스크래치패드 모달 유지

**대상 파일**:
- `ui/src/app/develop/page.tsx`
- `ui/src/app/develop/__tests__/develop-page.test.ts` — 칸반/실행기록 테스트 (신규)

**용어 변경 매트릭스**:
| 기존 | 변경 후 |
|------|---------|
| 팀원 | 에이전트 |

**완료 기준**:
- 칸반 보드 UI 텍스트에 "팀원" 0건, "에이전트"로 대체
- 실행 기록 탭에서 각 run의 `intent.description`이 요약 텍스트로 표시
- `vitest run` 시 develop-page.test.ts 통과

---

## Unit 6: `remaining-pages`
**설명**: 나머지 페이지 용어 통일 (team, bundles, preflight, settings)

**책임**:
- Team 페이지: "에이전트 팀 편집" 제목, graph node 관련 용어 통일
- Bundles 페이지: "번들 목록" → "팀 템플릿", 관련 텍스트 통일
- Preflight 페이지: 용어 통일 (변경 최소)
- Settings 페이지: "번들" → "팀 템플릿" 레이블 변경

**대상 파일**:
- `ui/src/app/team/page.tsx`
- `ui/src/app/bundles/page.tsx`
- `ui/src/app/preflight/page.tsx`
- `ui/src/app/settings/page.tsx`
- `ui/src/app/__tests__/remaining-pages.test.ts` — 4개 페이지 용어 통일 테스트 (신규)

**용어 변경 매트릭스**:
| 기존 | 변경 후 | 대상 페이지 |
|------|---------|------------|
| 번들을 선택하여 팀 구성을 시작하세요 | 팀 템플릿을 선택하여 에이전트 팀 구성을 시작하세요 | team |
| 번들 목록 | 팀 템플릿 | bundles |
| 번들 검색... | 팀 템플릿 검색... | bundles |
| 번들이 성공적으로 적용되었습니다 | 팀 템플릿이 성공적으로 적용되었습니다 | bundles |
| 사용 가능한 번들이 없습니다 | 사용 가능한 팀 템플릿이 없습니다 | bundles |
| 이 번들 적용 | 이 팀 템플릿 적용 | bundles |
| 나만의 맞춤형 번들이 필요하신가요? | 나만의 맞춤형 팀 템플릿이 필요하신가요? | bundles |
| 번들 (label) | 팀 템플릿 | settings |
| 번들 페이지에서 선택 | 팀 템플릿 페이지에서 선택 | settings |
| 번들 목록 페이지에서 변경 | 팀 템플릿 목록 페이지에서 변경 | settings |

**완료 기준**:
- 4개 페이지 모두에서 구용어("번들 목록", "번들") 0건
- Team 페이지 제목이 "에이전트 팀 편집"으로 표시
- Bundles 페이지 제목이 "팀 템플릿"으로 표시
- `vitest run` 시 remaining-pages.test.ts 통과
