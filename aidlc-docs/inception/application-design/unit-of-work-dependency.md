# Unit of Work Dependency Matrix

## Dependency Graph

```
Level 0 (병렬 실행):
  api-accuracy ──────┐
  sidebar-topnav ────┤
  develop-page ──────┤
                     │
Level 1 (Level 0 완료 후):
  dashboard-cards ◄──┤ (depends: api-accuracy)
  design-page ◄──────┤ (depends: api-accuracy)
  remaining-pages ◄──┘ (depends: sidebar-topnav)
```

## Dependency Matrix

| Unit | api-accuracy | sidebar-topnav | develop-page | dashboard-cards | design-page | remaining-pages |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **api-accuracy** | - | - | - | - | - | - |
| **sidebar-topnav** | - | - | - | - | - | - |
| **develop-page** | - | - | - | - | - | - |
| **dashboard-cards** | **depends** | - | - | - | - | - |
| **design-page** | **depends** | - | - | - | - | - |
| **remaining-pages** | - | **depends** | - | - | - | - |

## Dependency Rationale

### api-accuracy → dashboard-cards
- 대시보드 카드가 aidlc-state API의 정확한 파싱 결과에 의존
- API가 먼저 개선되어야 카드가 올바른 데이터를 표시

### api-accuracy → design-page
- 설계 페이지의 폴더 매핑 뷰가 docs API의 그룹화된 응답에 의존
- API가 폴더별 메타데이터를 제공해야 UI가 그룹 뷰를 렌더링

### sidebar-topnav → remaining-pages
- 사이드바 용어 변경 (네비게이션 레이블)이 먼저 확정되어야 각 페이지의 용어가 일관
- CTA 링크 대상이 변경되면 연결 페이지도 맞춰 조정

## Integration Points
- 용어 상수는 각 유닛에서 인라인 적용 (별도 공유 모듈 불필요 — 정적 문자열)
- API 응답 형식은 기존 인터페이스 확장 (breaking change 없음)
