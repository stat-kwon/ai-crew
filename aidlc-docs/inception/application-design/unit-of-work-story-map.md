# Unit ↔ Requirements Mapping

User Stories는 스킵되었으므로 FR(기능 요구사항) 기반 매핑입니다.

| Unit | FR | 설명 |
|------|-----|------|
| foundation | FR-7 (스키마 검증) | 타입 확장 + 5종 스키마 검증기 |
| graph-ext | FR-7 (일부) | graph.ts에 새 필드 검증 |
| verifier | FR-3 (경량 검증) | 노드 완료 검증 (test/lint/build) |
| install-state | FR-1 (install-state) | 설치 추적 + doctor + uninstall |
| shared-memory | FR-4 (공유 메모리) | 에이전트 간 상태 공유 |
| checkpoint | FR-5 (재시도 + 체크포인트) | 자동 체크포인트 + retry |
| session-context | FR-8 (세션 학습) | 프로젝트 컨텍스트 캐싱 |
| hook-profiling | FR-6 (훅 프로파일링) | 프로필별 훅 활성화/비활성화 |
| cli-validate | FR-7 + FR-9 | validate 커맨드 + 라우터 인터페이스 |
| integration-review | 전체 | 통합 검증 + 코드 리뷰 |

## FR 커버리지 확인

| FR | Unit(s) | 커버됨? |
|-----|---------|--------|
| FR-1 install-state | install-state | ✓ |
| FR-2 에이전트 모델 기본값 | foundation (types.ts + resolver.ts parseAgentFrontmatter) | ✓ |
| FR-3 경량 검증 | verifier | ✓ |
| FR-4 공유 메모리 | shared-memory | ✓ |
| FR-5 재시도 + 체크포인트 | checkpoint | ✓ |
| FR-6 훅 프로파일링 | hook-profiling | ✓ |
| FR-7 스키마 검증 | foundation + graph-ext + cli-validate | ✓ |
| FR-8 세션 학습 | session-context | ✓ |
| FR-9 라우터 인터페이스 | cli-validate | ✓ |

**모든 FR이 유닛에 매핑됨.**
