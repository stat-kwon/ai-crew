# Unit of Work — Requirements Mapping

## Mapping Table

| Requirement | Unit | Coverage |
|---|---|---|
| FR-1: 용어 체계 통일 | `sidebar-topnav`, `dashboard-cards`, `develop-page`, `remaining-pages` | 분산 — 각 유닛이 담당 페이지 내 용어 통일 |
| FR-2: 마지막 실행 자연어 요약 | `dashboard-cards` | 전체 |
| FR-3: 개발 흐름 4단계 | `dashboard-cards` | 전체 |
| FR-4: 실행 이력 하이브리드 구조 | `develop-page` | UI 표현 (백엔드 구조는 기존 유지) |
| FR-5: 설계 진행 상태 정확도 | `api-accuracy`, `dashboard-cards` | API 파싱 + UI 표시 |
| FR-6: 에이전트 상태 카드 | `dashboard-cards`, `develop-page` | 대시보드 카드 + 칸반 보드 |
| FR-7: 사이드바 CTA 프로젝트 전환 | `sidebar-topnav` | 전체 |
| FR-8: 설계 페이지 폴더 매핑 뷰 | `api-accuracy`, `design-page` | API 메타데이터 + UI 뷰 |
| NFR-1: 데이터 정확성 | `api-accuracy`, `dashboard-cards` | API 데이터 소스 정확성 + UI 표시 정확성 (end-to-end) |
| NFR-2: UI 일관성 | 전체 유닛 | 각 유닛이 동일 디자인 시스템 사용 |
| NFR-3: 호환성 | 전체 유닛 | 기존 타입/API 하위 호환 |

## Coverage Verification
- **모든 FR 커버**: FR-1~FR-8 전부 최소 1개 유닛에 매핑됨
- **모든 NFR 커버**: NFR-1~NFR-3 전부 커버
- **누락 없음**: 요구사항 문서의 모든 항목이 유닛에 할당됨
