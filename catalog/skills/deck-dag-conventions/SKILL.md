---
name: deck-dag-conventions
description: Deck DataPlatform 팀의 Airflow 3.0 DAG 작성 규칙과 DeckSparkKubernetesOperator 사용 패턴. Use when creating, reviewing, or refactoring DAG files under deck-workflow/dags; wiring Spark jobs on Airflow 3.0.2; operating in KubernetesExecutor environments; orchestrating S3 → Spark → StarRocks flows; attaching data quality gates; placing SQL tasks; enforcing on_failure_callback; externalizing long inline SQL; or checking whether DAG code is staying orchestration-only.
---

# Deck DAG Conventions

## SSOT로 먼저 볼 코드
- `deck-workflow/dags/*.py`
- `deck-workflow/plugins/operators/spark_operator.py`
- `deck-workflow/plugins/utils/notifications.py`

신규 DAG를 만들기 전에 위 파일을 먼저 읽고, 현재 레포가 이미 가진 관용구를 그대로 따라라. 이 Skill은 그 패턴을 빠르게 재현하기 위한 요약이다.

## 핵심 원칙

### 1. DAG는 오케스트레이션 계층으로 제한한다
DAG 파일에는 아래만 둔다.
- 스케줄, 재시도, 타임아웃, 태그 같은 운영 메타데이터
- 태스크 정의와 의존성
- Spark Job, SQL 태스크, 검증 태스크의 wiring
- 품질 게이트/알림 콜백 연결

DAG 파일에 넣지 말아야 할 것:
- DataFrame 변환 로직
- 긴 SQL 본문
- 스키마 정제/비즈니스 규칙
- 재사용 가능한 Secret 조합 로직
- OpenLineage 이벤트 조립 같은 상세 구현

복잡한 변환은 `sparks/jobs/` 또는 `sparks/lib/`로 이동한다.

### 2. Airflow 3.0.2 기준으로 DAG를 단순하게 유지한다
Deck processing 환경은 Airflow 3.0.2를 사용한다. 따라서 신규 DAG는 "호환성 높은 기본 패턴"을 우선한다.
- `@dag(...)` + 명시적 task wiring을 기본으로 둔다.
- side effect가 있는 import-time 코드 생성을 피한다.
- dynamic task mapping, runtime DAG factory는 반복 패턴이 충분히 검증된 뒤에만 사용한다.
- 운영자가 파일만 읽고도 흐름을 이해할 수 있어야 한다.

Starlake `dag-generate`가 보여주는 핵심 패턴은 다음이다.
- 생성과 배포를 분리한다.
- DAG assignment 우선순위를 분명히 둔다.
- task/load domain 기준으로 오케스트레이션 단위를 분리한다.

Deck에도 같은 원칙을 적용한다.
- 한 DAG 안에 unrelated 파이프라인을 과도하게 합치지 않는다.
- 도메인/파이프라인 단위로 DAG 책임을 나눈다.
- 공통 패턴은 scaffold로 통일하고, 배포 세부사항은 별도 프로세스로 분리한다.

### 3. `on_failure_callback`을 기본값으로 둔다
실제 Deck DAG들은 `utils.notifications.on_failure_callback`을 사용한다. 신규 DAG도 특별한 이유가 없으면 반드시 넣는다.

```python
from utils.notifications import on_failure_callback

@dag(
    dag_id="deck_example_daily",
    on_failure_callback=on_failure_callback,
    ...,
)
def deck_example_daily():
    ...
```

품질 게이트가 붙는 DAG라면 실패 태스크도 같은 callback을 공유해 운영자가 바로 알 수 있게 한다.

### 4. Spark 실행은 `DeckSparkKubernetesOperator`를 우선 사용한다
실제 `plugins/operators/spark_operator.py` 기준:
- 기본 namespace: `ns-deck`
- 기본 service account: `deck-processing-spark`
- 상대 경로 `application_file`은 git-sync 경로로 자동 변환
- `env_vars`, `env_from_secrets`, `env_from_secret_ref` 지원
- 공통 S3 인증 환경변수 주입 포함
- SparkApplication (`spark.apache.org/v1`) 생성 후 상태를 직접 모니터링

기본 패턴:

```python
from operators.spark_operator import DeckSparkKubernetesOperator

run_job = DeckSparkKubernetesOperator(
    task_id="run_billing_etl",
    application_file="sparks/jobs/billing/deck_billing_etl.py",
    driver_memory="2g",
    driver_cores=1,
    executor_memory="4g",
    executor_cores=2,
    executor_instances=3,
    startup_timeout_seconds=1800,
    extra_spark_conf={
        "spark.sql.adaptive.enabled": "true",
        "spark.sql.shuffle.partitions": "100",
    },
    env_from_secret_ref="spark-starrocks-credentials",
    env_vars={
        "STARROCKS_DB": "billing",
        "TARGET_TABLE": "daily_usage",
    },
)
```

### 5. KubernetesExecutor 환경 제약을 먼저 고려한다
Deck DAG는 KubernetesExecutor 환경에서 돌아갈 가능성을 전제로 작성한다.

주의사항:
- 로컬 파일 시스템 상태를 전제로 하지 말고, 필요한 코드는 git-sync 경로나 S3 경로로 참조한다.
- task 간 임시 파일 전달을 피하고, S3/Hive/DB를 중간 산출물 저장소로 쓴다.
- worker 재스케줄/재시도 시에도 idempotent 하게 동작해야 한다.
- connection/credential은 코드 하드코딩 대신 Secret/Variable/operator env 주입으로 전달한다.
- startup timeout, retry, execution timeout을 명시해 pod pending / image pull 지연에 대비한다.

실무 규칙:
- 큰 payload를 XCom으로 넘기지 않는다.
- 품질 검증 결과는 숫자/상태 위주로 요약한다.
- 같은 DAG run을 재실행해도 S3 overwrite, MERGE, partition replace 등이 안전하게 동작해야 한다.

### 6. `application_file`은 상대 경로를 기본값으로 둔다
- 상대 경로 예: `sparks/jobs/...py`
  - operator가 `local://...` 경로로 자동 변환
  - git-sync 기반 Deck 표준 개발 흐름
- `local://`, `s3a://` 등 scheme 있는 경로
  - operator가 그대로 사용
  - 예외적 배포/운영 상황에서만 사용

신규 DAG는 특별한 사유가 없으면 상대 경로를 사용한다.

### 7. SQL은 가능하면 파일로 분리한다
현재 실코드에는 `billing_01_event_to_resource_state.py`처럼 인라인 멀티라인 SQL이 남아 있다. 이건 "현재 존재하는 레거시 패턴"이지 신규 권장안이 아니다.

신규 코드 원칙:
- DDL/DML/검증 SQL이 길어지면 `.sql` 파일로 분리한다.
- DAG에서는 파일 경로 로드 또는 helper 호출만 남긴다.
- 10~15줄을 넘거나 윈도우 함수/복잡한 조인이 들어가면 파일 분리를 기본값으로 둔다.

권장 위치 예시:
- `dags/sql/{pipeline_name}/create_table.sql`
- `dags/sql/{pipeline_name}/verify_target.sql`
- `sparks/sql/{job_name}/base_extract.sql`

```python
from pathlib import Path

SQL_DIR = Path(__file__).parent / "sql" / "deck_billing"
CREATE_TABLE_SQL = (SQL_DIR / "create_target_table.sql").read_text()
```

### 8. SQL 태스크는 운영성 중심으로만 쓴다
`SQLExecuteQueryOperator`는 아래 용도로 제한한다.
- 데이터베이스/테이블 생성
- 경량 검증 쿼리
- 비교적 짧은 후처리 DML
- Trino 기반 quality gate

아래에 해당하면 Spark Job 또는 별도 SQL 파일로 이동한다.
- 복잡한 조인/윈도우/대량 스캔
- 재사용 가능한 비즈니스 SQL
- 여러 DAG에서 공유될 가능성이 있는 SQL

## S3 → Spark → StarRocks 오케스트레이션 패턴
실제 Deck stack과 `s2_anomaly_baseline.py`를 기준으로 기본 흐름은 다음 순서를 따른다.
1. S3 raw/stage 경로 준비 또는 Hive external table 보장
2. Spark job 실행
3. 필요 시 Hive partition refresh / lightweight SQL verification
4. StarRocks 적재 검증
5. 품질 게이트 통과 후 downstream 공개

권장 체인:

```python
start >> ensure_input_metadata >> run_spark_job >> verify_hive_or_trino >> verify_starrocks >> end
```

설계 포인트:
- S3는 대용량 원본/중간 산출물 저장소로 쓴다.
- Spark는 heavy transform, aggregation, repartition, write 담당이다.
- Trino/SQL task는 빠른 검증, row-count/freshness/partition 존재 확인 용도로 쓴다.
- StarRocks는 serving target이므로 적재 후 최소 검증 태스크를 붙인다.

### 권장 검증 포인트
- source partition 존재 여부
- Spark output row count > 0
- Hive/Trino 테이블 최신 partition 존재 여부
- StarRocks target row count / 기준일 존재 여부

## Airflow 품질 게이트 부착 패턴
Starlake `expectations`, `freshness`, `metrics`는 공통적으로 "검증을 태스크로 만들고 결과를 fail/warn로 다룬다"는 패턴을 갖는다. Deck에도 같은 개념을 적용한다.

권장 배치:
- Spark 전: 입력 신선도/원천 파일 존재 확인
- Spark 후: null/duplicate/count/freshness 검증
- StarRocks 적재 후: serving table sanity check

실패 정책:
- 배치 중단이 필요한 검증은 hard fail
- 관찰성 위주의 검증은 warn 후 Slack 알림

## 권장 DAG 골격

```python
from datetime import datetime, timedelta

from airflow.decorators import dag
from airflow.operators.empty import EmptyOperator
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator

from operators.spark_operator import DeckSparkKubernetesOperator
from utils.notifications import on_failure_callback


default_args = {
    "owner": "data-platform",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(hours=2),
}


@dag(
    dag_id="deck_billing_daily",
    default_args=default_args,
    schedule="0 1 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["deck", "billing", "spark"],
    on_failure_callback=on_failure_callback,
)
def deck_billing_daily():
    start = EmptyOperator(task_id="start")
    prepare_target = SQLExecuteQueryOperator(...)
    run_billing_etl = DeckSparkKubernetesOperator(...)
    verify_target = SQLExecuteQueryOperator(...)
    end = EmptyOperator(task_id="end")

    start >> prepare_target >> run_billing_etl >> verify_target >> end


dag_instance = deck_billing_daily()
```

## 네이밍 규칙

### task_id
- `snake_case`
- 동사 + 목적어 형태
- 이름만 보고 역할이 드러나야 한다

좋은 예:
- `create_database`
- `create_target_table`
- `run_billing_etl`
- `refresh_partitions`
- `verify_result`
- `check_source_freshness`
- `validate_starrocks_load`

나쁜 예:
- `task1`
- `spark_job`
- `process`
- `run`

### dag_id / 파일명
- 파일명과 `dag_id`를 가능하면 일치시킨다.
- 기존 Deck 레포는 `billing_01_event_to_resource_state`처럼 도메인 중심 이름을 사용한다.
- 신규 catalog 예제에서 `deck_*` prefix를 쓰더라도, 실제 레포 naming 관례를 우선한다.

## 문서화 규칙
- `description`은 운영자가 한 줄로 이해 가능해야 한다.
- `doc_md`에는 목적, 입출력, 플로우, 필수 Secret만 적는다.
- 구현 상세는 Spark Job 코드나 별도 SQL 파일로 보낸다.
- 한국어 설명을 기본으로 하되 식별자는 영어로 유지한다.
- lineage가 중요한 파이프라인이면 source → transform → sink 흐름을 `doc_md`에 한 줄로 남긴다.

## 리뷰 체크리스트
- [ ] DAG 안에 DataFrame 변환 로직이 없는가
- [ ] Airflow 3.0.2에서도 무리 없는 단순한 DAG 패턴인가
- [ ] KubernetesExecutor 재시도/재스케줄을 고려해 idempotent 한가
- [ ] `on_failure_callback`이 설정되었는가
- [ ] `DeckSparkKubernetesOperator` 사용 시 리소스 설정이 명시되었는가
- [ ] `application_file`이 Deck 표준 상대 경로를 따르는가
- [ ] 긴 SQL이 파일로 분리되었는가
- [ ] 품질 게이트 태스크가 필요한 위치에 붙었는가
- [ ] task_id가 snake_case 동사형 규칙을 따르는가
- [ ] 파일명과 `dag_id`가 일관되는가
- [ ] Secret/환경변수 전달이 하드코딩되지 않았는가
- [ ] S3 → Spark → StarRocks 흐름과 검증 지점이 명확한가
