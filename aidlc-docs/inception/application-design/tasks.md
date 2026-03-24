# Graph Node Task Mapping

## Node: foundation
- **Agent**: backend-dev
- **Skills**: backend-node, clean-code
- **Assigned Work**: GraphNode 타입 확장 + 스키마 검증 엔진 + 에이전트 프론트매터 파서
- **Tasks**:
  1. [ ] types.ts에 GraphNodeConfig.retry, GraphNode.verify 필드 추가
  2. [ ] types.ts에 신규 타입 12개 추가 (ValidationResult, InstallState, VerificationResult, SharedMemoryStore, CheckpointData, ProjectContext 등)
  3. [ ] src/validator.ts 생성 — validateBundleConfig, validateGraphYaml, validatePluginJson, validateHooksJson, validateStateJson
  4. [ ] src/resolver.ts에 parseAgentFrontmatter() 함수 추가 — 에이전트 .md의 YAML 프론트매터에서 model 필드 파싱 (FR-2)
  5. [ ] 모델 우선순위 해결 로직: graph.yaml config.model > 에이전트 프론트매터 > bundle defaults
  6. [ ] src/__tests__/validator.test.ts 작성
  7. [ ] src/index.ts에 validator + parseAgentFrontmatter export 추가
- **Completion Criteria**: 모든 테스트 통과, 기존 테스트 깨지지 않음

## Node: graph_ext
- **Agent**: backend-dev
- **Skills**: backend-node, testing
- **Assigned Work**: graph.ts에 새 필드 검증 로직 추가
- **Tasks**:
  1. [ ] validateGraph()에 verify 필드 타입 검증 추가 (string[] 확인)
  2. [ ] validateGraph()에 config.retry 범위 검증 추가 (0-3)
  3. [ ] 기존 graph.test.ts에 새 테스트 케이스 추가
- **Completion Criteria**: 기존 + 새 테스트 모두 통과

## Node: verifier
- **Agent**: backend-dev
- **Skills**: backend-node, testing
- **Assigned Work**: 노드 완료 검증 모듈 구현
- **Tasks**:
  1. [ ] src/verifier.ts 생성 — getDefaultCommands(), verifyNode()
  2. [ ] child_process.exec 기반 커맨드 실행 (타임아웃 포함)
  3. [ ] src/__tests__/verifier.test.ts 작성 (모킹으로 exec 테스트)
  4. [ ] src/index.ts에 export 추가
- **Completion Criteria**: 테스트 통과, 타임아웃 처리 정상

## Node: install_state
- **Agent**: backend-dev
- **Skills**: backend-node, clean-code
- **Assigned Work**: 설치 상태 추적 + CLI 커맨드 추가
- **Tasks**:
  1. [ ] src/install-state.ts 생성 — recordInstall, readInstallState, diagnose, uninstall
  2. [ ] src/installer.ts 수정 — install() 마지막에 recordInstall() 호출
  3. [ ] src/cli.ts에 doctor, uninstall 커맨드 추가
  4. [ ] src/__tests__/install-state.test.ts 작성
  5. [ ] src/index.ts에 export 추가
- **Completion Criteria**: doctor/uninstall 커맨드 동작, 테스트 통과

## Node: shared_memory
- **Agent**: backend-dev
- **Skills**: backend-node, testing
- **Assigned Work**: 에이전트 간 공유 메모리 구현
- **Tasks**:
  1. [ ] src/shared-memory.ts 생성 — writeNodeOutput, readNodeOutput, readDependencyOutputs, clearMemory
  2. [ ] 원자적 쓰기 구현 (writeFile to temp → rename)
  3. [ ] src/__tests__/shared-memory.test.ts 작성
  4. [ ] src/index.ts에 export 추가
- **Completion Criteria**: 동시 쓰기 안전, 테스트 통과

## Node: checkpoint
- **Agent**: backend-dev
- **Skills**: backend-node, testing
- **Assigned Work**: 자동 체크포인트 + 재시도 지원
- **Tasks**:
  1. [ ] src/checkpoint.ts 생성 — createCheckpoint, listCheckpoints, restoreCheckpoint
  2. [ ] state.json + shared-memory.json 스냅샷 저장/복원
  3. [ ] src/__tests__/checkpoint.test.ts 작성
  4. [ ] src/index.ts에 export 추가
- **Completion Criteria**: 체크포인트 생성/복원 정상, 테스트 통과

## Node: session_context
- **Agent**: backend-dev
- **Skills**: backend-node
- **Assigned Work**: 프로젝트 컨텍스트 캐싱 구현
- **Tasks**:
  1. [ ] src/session-context.ts 생성 — saveContext, loadContext, mergeAgentLearning
  2. [ ] src/__tests__/session-context.test.ts 작성
  3. [ ] src/index.ts에 export 추가
- **Completion Criteria**: 저장/로드/머지 정상, 테스트 통과

## Node: hook_profiling
- **Agent**: backend-dev
- **Skills**: backend-node
- **Assigned Work**: 훅 프로파일링 시스템 구현
- **Tasks**:
  1. [ ] catalog/hooks/*/hooks.json에 profiles 필드 추가
  2. [ ] src/hook-profiler.ts 생성 — filterHooksByProfile(hooks, profile) 함수 (installer.ts 직접 수정 대신 별도 모듈로 분리하여 install_state와의 병렬 실행 충돌 방지)
  3. [ ] src/installer.ts의 mergeSettings()에서 hook-profiler.ts의 필터 함수 호출 추가 (이 변경은 integration_review에서 통합)
  4. [ ] AI_CREW_HOOK_PROFILE 환경변수 지원
  5. [ ] 훅 프로파일 문서 업데이트
- **Completion Criteria**: 프로필별 훅 필터링 동작
- **Note**: installer.ts 수정은 hook-profiler.ts 모듈 생성 후 integration_review에서 통합하여 install_state 유닛과의 파일 충돌 방지

## Node: cli_validate
- **Agent**: backend-dev
- **Skills**: backend-node, clean-code
- **Assigned Work**: validate 커맨드 + 라우터 인터페이스 문서화
- **Tasks**:
  1. [ ] src/cli.ts에 validate 커맨드 추가
  2. [ ] .ai-crew/ 디렉토리의 모든 설정 파일 스키마 검증 실행
  3. [ ] 라우터 노드 condition 필드 형식 문서화 (stub, 미구현 경고)
  4. [ ] src/index.ts에 모든 최종 export 정리
- **Completion Criteria**: validate 커맨드 정상 동작

## Node: integration_review
- **Agent**: reviewer
- **Skills**: code-review, testing
- **Assigned Work**: 전체 통합 검증
- **Tasks**:
  1. [ ] npm test — 전체 테스트 통과 확인
  2. [ ] npm run build — 빌드 성공 확인
  3. [ ] 기존 bundle.yaml/graph.yaml 하위 호환성 검증
  4. [ ] 코드 리뷰: 컨벤션 준수, 타입 안전성
  5. [ ] 새 필드 없는 기존 프로젝트에서 정상 동작 확인
- **Completion Criteria**: 모든 검증 통과, 하위 호환성 확인

---

## Execution Order (from graph)
- **Level 0**: foundation
- **Level 1**: graph_ext, verifier, install_state, shared_memory, session_context, hook_profiling, cli_validate (7개 병렬)
- **Level 2**: checkpoint
- **Level 3**: integration_review
