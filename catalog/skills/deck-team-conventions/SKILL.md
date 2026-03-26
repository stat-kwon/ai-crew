---
name: deck-team-conventions
description: Deck DataPlatform 팀 산출물의 공통 문서/코드 컨벤션. Use when reviewing DAG, Spark job, skill, agent, hook, or bundle changes for naming clarity, module boundaries, Korean documentation quality, type hints, commit/PR hygiene, and overall catalog consistency.
---

# Deck Team Conventions

이 Skill은 실제 deck 코드에서 관찰되는 네이밍/모듈 분리 습관과, catalog 품질 유지에 필요한 최소 협업 규칙을 함께 정리한 것이다. 코드베이스에서 직접 입증되지 않는 항목은 "팀 권장 규칙"으로 취급하고 과도하게 사실처럼 단정하지 않는다.

## 1. Python 코드 스타일

### type hints를 기본값으로 둔다
신규 Python 함수는 가능하면 type hints를 작성한다.

```python
def read_source(spark: SparkSession, path: str) -> DataFrame:
    ...
```

### 함수 작성 규칙
- 함수는 한 가지 책임만 가진다
- 지나치게 길어지면 분리한다
- 입출력 타입이 드러나게 쓴다
- side effect가 있으면 이름에서 드러나게 한다 (`write_`, `publish_`, `delete_`)

### import 규칙
- 표준 라이브러리 → 서드파티 → 로컬 모듈 순서
- 와일드카드 import 금지

## 2. 파일/함수 네이밍
- 파일명: `snake_case.py`
- 함수명: `snake_case`
- 클래스명: `PascalCase`
- 상수: `UPPER_SNAKE_CASE`
- Airflow `task_id` / `dag_id`: `snake_case`

좋은 예:
- `billing_01_event_to_resource_state.py`
- `calculate_baseline()`
- `DeckSparkKubernetesOperator`
- `S3_OUTPUT_BASE`

나쁜 예:
- `DeckCustomerUsageDaily.py`
- `doEverything()`
- `data1`

## 3. 공통 모듈화 기준
아래 중 하나에 해당하면 공통 모듈로 뺀다.
- 동일 로직이 2회 이상 반복됨
- DAG에서 구현하면 오케스트레이션 책임을 침범함
- read / transform / write가 여러 잡에서 재사용 가능함
- Secret / path / schema 처리 규칙이 공통화 가능함

우선 배치 위치:
- Spark 공통 → `sparks/lib/`
- Airflow 공통 → `plugins/` 또는 DAG helper module
- SQL 공통 → `dags/sql/` 또는 `sparks/sql/`

## 4. 문서 작성 규칙
- 설명/가이드는 한국어를 기본으로 작성
- 식별자, 코드, 클래스명은 영어 유지
- "왜 이 규칙이 필요한지"가 드러나게 쓴다
- 중복 설명보다 SSOT 참조를 우선한다
- catalog 문서는 추측을 사실처럼 적지 않는다

## 5. Commit / PR 규칙
이 항목은 deck 실코드에서 직접 확인되는 규칙이라기보다 팀 협업용 권장안이다.

### Commit 메시지
가능하면 Conventional Commits를 따른다.

형식:
```text
<type>(<scope>): <summary>
```

예시:
- `feat(catalog): add deck data team bundle`
- `docs(deck): refine spark performance checklist`
- `fix(hooks): scope deck hook checks to edited files`

### PR 본문에 포함할 것
- 무엇을 추가/변경했는지
- 왜 필요한지
- 영향 범위
- 검증 결과
- 후속 작업이 있으면 TODO

## 6. Catalog 리뷰 규칙
skill / agent / hook / bundle을 검토할 때는 아래를 함께 본다.
- 이름이 역할을 바로 드러내는가
- SSOT 참조가 중복 없이 명확한가
- 실코드 기반 내용과 팀 권장 규칙이 구분되는가
- 문서가 너무 짧아 실무에 못 쓰거나, 너무 길어 맥락을 낭비하지 않는가
- 참조 관계가 실제 존재하는 catalog 항목과 일치하는가

## 최종 체크리스트
- [ ] Python 함수에 type hints가 있는가
- [ ] 파일/함수/task 이름이 명확한가
- [ ] 공통 로직이 적절한 위치로 모듈화되었는가
- [ ] 문서가 한국어 기준으로 정리되었는가
- [ ] SSOT와 권장 규칙이 구분되어 있는가
- [ ] PR 설명에 목적/영향/검증이 포함되었는가
