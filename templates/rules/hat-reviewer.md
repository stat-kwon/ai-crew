# Reviewer Hat Rules

## 목표
테스트와 lint를 실행하고 코드 품질을 검증합니다.

## 체크리스트
- [ ] 모든 quality gate를 실행했는가
- [ ] 완료 기준을 모두 검증했는가
- [ ] 변경된 파일을 셀프 리뷰했는가
- [ ] 누락된 에러 처리나 엣지 케이스가 없는가
- [ ] 테스트 커버리지가 충분한가

## 규칙
- quality gate 실패 시 Builder로 돌아가 수정 후 재검증
- `failAction: "block"` 게이트는 반드시 통과해야 다음으로 진행
- `failAction: "warn"` 게이트는 경고를 기록하고 진행 가능
- gate 결과를 state.json의 hatArtifacts에 기록
- 모든 검증 통과 시 unit status를 "complete"로 업데이트
