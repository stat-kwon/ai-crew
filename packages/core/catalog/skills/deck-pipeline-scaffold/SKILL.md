---
name: deck-pipeline-scaffold
description: Deck DataPlatform 팀용 신규 데이터 파이프라인 스캐폴딩 규칙. Use when bootstrapping a new pipeline or reorganizing an existing one across deck-workflow/dags, dags/sql, sparks/jobs, sparks/lib, and sparks/sql; deciding file layout; or splitting orchestration, transform logic, SQL, and shared helpers into the right directories.
---

# Deck Pipeline Scaffold

## 목적
새 파이프라인을 만들 때 폴더 구조를 먼저 맞추고, 그 위에 DAG / Spark / SQL / lib 모듈을 올린다. 구조가 먼저 정리되지 않으면 DAG에 로직이 스며들고 SQL이 인라인으로 남기 쉽다.

## 먼저 확인할 실제 경로
- `deck-workflow/dags/`
- `deck-workflow/sparks/jobs/`
- `deck-workflow/sparks/lib/`
- `deck-workflow/plugins/`

주의: 현재 실레포는 아직 도메인별 scaffold가 풍부하지 않다. 따라서 이 Skill은 **현재 디렉터리 구조와 다른 Deck skills의 분리 원칙**을 합쳐서 신규 파이프라인용 권장 scaffold를 제시한다.

## 권장 디렉터리 구조

```text
 deck-workflow/
 ├── dags/
 │   ├── billing_01_example_pipeline.py
 │   └── sql/
 │       └── billing_example/
 │           ├── create_target_table.sql
 │           └── verify_target.sql
 └── sparks/
     ├── jobs/
     │   └── billing/
     │       └── billing_example_job.py
     ├── lib/
     │   ├── connectors.py
     │   ├── transformers.py
     │   └── billing/
     │       ├── __init__.py
     │       ├── readers.py
     │       ├── schemas.py
     │       ├── transforms.py
     │       └── writers.py
     └── sql/
         └── billing/
             └── source_extract.sql
```

## 파일별 책임

### `dags/{pipeline}.py`
- 스케줄
- retries / timeout / tags
- Spark task와 SQL task 연결
- 운영용 `doc_md`
- `on_failure_callback`

### `dags/sql/{pipeline}/*.sql`
- 테이블 생성
- 검증 쿼리
- 경량 후처리 SQL

### `sparks/jobs/{domain}/{job}.py`
- Job 엔트리포인트
- `main()`
- read → transform → write orchestration
- CLI args / env var 해석

### `sparks/lib/{domain}/*.py`
- reader, schema, transform, writer helper
- 재사용 가능한 비즈니스 모듈
- 한 파이프라인 안에서라도 함수가 길어지면 여기로 분리 검토

### `sparks/sql/{domain}/*.sql`
- Spark SQL 본문
- 인라인 대신 파일 참조

## 네이밍 규칙
실제 Deck 레포는 `billing_01_event_to_resource_state.py`, `s2_anomaly_baseline.py`처럼 도메인 중심 snake_case를 사용한다. 따라서 이 Skill은 특정 단일 canonical name을 강제하지 않는다.

권장 기준:
- 파일명: `snake_case`
- DAG id: 파일명과 일관되게
- Job 파일명: `{domain}_{purpose}_job.py` 또는 현재 레포 관례에 맞는 이름
- SQL 디렉터리: 파이프라인/도메인이 드러나게

좋은 예:
- `billing_01_event_to_resource_state.py`
- `s2_anomaly_baseline.py`
- `billing/create_target_table.sql`

피할 것:
- `pipeline1.py`
- `job.py`
- `sql/query.sql`

## 신규 파이프라인 생성 순서
1. 대상 도메인과 입출력 저장소를 확정한다.
2. DAG 파일을 만들고 운영 메타데이터를 채운다.
3. Spark Job 엔트리포인트를 만든다.
4. `sparks/lib/{domain}` 하위 공통 모듈을 만든다.
5. 긴 SQL을 파일로 분리한다.
6. DAG에서 Spark/SQL을 wiring 한다.
7. 성능 체크리스트와 DAG 규칙을 반영한다.

## 최소 스캐폴드 예시

### DAG
```python
run_pipeline = DeckSparkKubernetesOperator(
    task_id="run_billing_example",
    application_file="sparks/jobs/billing/billing_example_job.py",
    ...,
)
```

### Job
```python
from lib.connectors import get_spark_session
from lib.billing.readers import read_source
from lib.billing.transforms import transform_source
from lib.billing.writers import write_target
```

### lib module 분해
- `readers.py`: S3/Kafka/Hive 읽기
- `schemas.py`: 컬럼 매핑, cast map, schema helper
- `transforms.py`: DataFrame 변환
- `writers.py`: S3/Hive/StarRocks 저장

## Scaffold 체크리스트
- [ ] DAG / Job / SQL / lib 경로가 분리되었는가
- [ ] 파일명과 DAG/task 이름이 의미를 드러내는가
- [ ] 긴 SQL이 파일로 빠졌는가
- [ ] Spark Job이 엔트리포인트 역할만 하는가
- [ ] 공통 변환이 `sparks/lib`에 위치하는가
- [ ] 현재 Deck 레포 naming 관례와 충돌하지 않는가
