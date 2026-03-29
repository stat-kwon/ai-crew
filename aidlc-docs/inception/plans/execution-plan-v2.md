# 실행 계획 v2 — UI 전면 리디자인

---

## 상세 분석 요약

### 변환 범위

- **변환 유형**: UI 레이어 전면 재구성 (백엔드/API 변경 없음)
- **주요 변경**: 정보 아키텍처 재설계 (7→3 페이지), 네비게이션 전환 (사이드바→탭), 컴포넌트 전면 교체
- **영향 범위**: `ui/src/` 디렉토리 전체

### 변경 영향 평가

| 영역 | 영향 | 설명 |
|------|------|------|
| 사용자 대면 | **Yes** | 전체 UI 레이아웃 및 페이지 구조 변경 |
| 구조적 변경 | **Yes** | 네비게이션 패턴 + 페이지 라우팅 전면 교체 |
| 데이터 모델 | **No** | 기존 API/데이터 구조 그대로 활용 |
| API 변경 | **No** | 기존 엔드포인트 유지, 추가 없음 |
| NFR 영향 | **No** | 성능/보안 요구사항 변경 없음 |

### 리스크 평가

- **리스크 레벨**: Medium
- **롤백 복잡도**: Easy (git revert — UI만 변경)
- **테스트 복잡도**: Moderate (기존 Vitest 테스트 전면 업데이트 필요)

---

## 워크플로우 시각화

### 텍스트 대안

```
Phase 1: INCEPTION
  - Workspace Detection          (COMPLETED)
  - Reverse Engineering           (SKIPPED — 이전 사이클에서 분석 완료)
  - Requirements Analysis         (COMPLETED)
  - User Stories                  (SKIPPED — 순수 UI 리팩터링)
  - Workflow Planning             (COMPLETED)
  - Application Design            (SKIPPED — 제안서에 컴포넌트 설계 포함)
  - Units Generation              (EXECUTE)

Phase 2: CONSTRUCTION
  - Functional Design             (SKIPPED — UI 컴포넌트, 비즈니스 로직 없음)
  - NFR Requirements              (SKIPPED — 기존 NFR 유지)
  - NFR Design                    (SKIPPED — 기존 NFR 유지)
  - Infrastructure Design         (SKIPPED — 인프라 변경 없음)
  - Code Generation               (EXECUTE — 전 유닛)
  - Build and Test                (EXECUTE)
```

---

## 실행 단계

### INCEPTION PHASE

- [x] Workspace Detection (COMPLETED)
- [x] Requirements Analysis (COMPLETED) — requirements-v2.md
- [x] User Stories (SKIPPED — 순수 UI 리팩터링, 새 사용자 페르소나 없음)
- [x] Workflow Planning (COMPLETED) — 이 문서
- [x] Application Design (SKIPPED — 제안서 + 요구사항에 컴포넌트 설계가 충분히 포함됨)
- [ ] Units Generation (EXECUTE)
  - **근거**: 병렬 멀티 에이전트 실행을 위한 작업 분해 필요

### CONSTRUCTION PHASE

- [ ] Functional Design (SKIPPED)
  - **근거**: UI 컴포넌트 구현, 복잡한 비즈니스 로직 없음
- [ ] NFR Requirements (SKIPPED)
  - **근거**: 기존 NFR 설정으로 충분
- [ ] NFR Design (SKIPPED)
  - **근거**: NFR Requirements 미실행
- [ ] Infrastructure Design (SKIPPED)
  - **근거**: 인프라 변경 없음
- [ ] Code Generation (EXECUTE — 전 유닛)
  - **근거**: 전 유닛에 대한 코드 구현 필요
- [ ] Build and Test (EXECUTE)
  - **근거**: 빌드 검증 + 테스트 업데이트

---

## 유닛 분해 전략

### 의존성 기반 레벨 구조

```
Level 0 (병렬, 선행 의존성 없음):
  - layout-overhaul     : 레이아웃 전환 (사이드바→TopBar + AppShell 수정)
  - page-cleanup        : 4개 페이지 제거 + 라우팅 정리

Level 1 (병렬, Level 0 완료 후):
  - timeline-page       : 타임라인(홈) 페이지 구현
  - run-detail-page     : 런 상세 페이지 구현
  - docs-page           : 설계 문서 페이지 조정

Level 2+ (후처리 파이프라인):
  - test-all → code-review → improve → build-verify → qa-final
```

### 근거

1. **layout-overhaul + page-cleanup는 병렬 가능**: 레이아웃 변경과 페이지 제거는 서로 독립적
2. **Level 1은 Level 0 완료 후**: 새 페이지들은 TopBar 레이아웃에 의존
3. **timeline-page, run-detail-page, docs-page는 병렬 가능**: 각각 독립된 라우트

---

## 성공 기준

- **핵심 목표**: 히스토리 중심 3페이지 UI로 전환
- **핵심 산출물**:
  - 타임라인 페이지 (런 히스토리 스크롤)
  - 런 상세 페이지 (노드별 아코디언 결과물)
  - 설계 문서 페이지 (기존 구조 유지 + 스타일 조정)
  - 상단 탭 바 + 설정 드로어
- **품질 게이트**:
  - `next build` 성공
  - Vitest 테스트 통과 (업데이트된 테스트)
  - 제거된 페이지 관련 코드 0건 잔존
  - 기존 API 엔드포인트 정상 동작

---

## Extension Configuration

| Extension | Enabled | Decided At |
|-----------|---------|------------|
| Security Baseline | No | Requirements Analysis (v2) |
