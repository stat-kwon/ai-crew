---
name: deck-data-lineage
description: Deck DataPlatform 팀의 데이터 계보(lineage) 문서화 패턴. Use when tracing Kafka → S3 → Trino/StarRocks flows, documenting Airflow task lineage, describing column-level derivations, or planning OpenLineage integration for Deck DAGs and Spark jobs.
---

# Deck Data Lineage

## SSOT로 먼저 볼 코드
- `deck-workflow/dags/*.py`
- `deck-workflow/sparks/jobs/s2_anomaly_baseline.py`
- `deck-workflow/sparks/lib/connectors.py`
- `deck-workflow/plugins/operators/spark_operator.py`

이 Skill은 Starlake의 `lineage`, `col-lineage` 패턴을 Deck 환경에 맞게 번역한 것이다.
- task dependency를 먼저 본다.
- source / transform / sink를 명시적으로 기록한다.
- 가능하면 컬럼 수준 파생 관계까지 남긴다.
- 나중에 OpenLineage 이벤트로 확장할 수 있게 구조화한다.

## 기본 관점
라인리지는 "예쁜 그림"보다 "누가 어디서 와서 어디로 가는지 운영자가 설명할 수 있는 상태"가 중요하다.

Deck에서 우선 문서화할 흐름:
- Kafka → S3 raw/stage
- S3 raw/stage → Hive Metastore / Trino queryable table
- Hive/S3 → Spark transform
- Spark output → S3 curated
- Spark output → StarRocks serving
- Airflow DAG task dependency

## Kafka → S3 → Trino/StarRocks 라인리지 추적
실제 deck 코드베이스에는 Kafka consumer 예시가 많지 않더라도, 스택상 Kafka/Vector/S3/Spark/Trino/StarRocks 흐름을 전제로 문서화한다.

### 권장 표기 형식
```text
source:
  kafka.topic.billing-events
transport:
  vector / ingestion agent
landing:
  s3://deck/lake/billing/events/
metadata:
  hive.billing.events_raw
transform:
  sparks/jobs/billing/usage_daily_job.py
serving:
  s3://deck/warehouse/billing/usage_daily/
  starrocks.billing.usage_daily
```

### 문서화 최소 항목
- source system / topic / table
- landing path
- schema authority(Hive Metastore 등)
- transform job / dag id / task id
- output table/path
- serving target
- partition key / business key

## Airflow task lineage 문서화 패턴
Starlake lineage가 task dependency graph를 만드는 것처럼, Deck DAG도 task 간 선후관계를 문서에 남겨야 한다.

### 문서화 예시
```text
DAG: billing_daily
  create_external_table
    -> run_usage_daily_spark
    -> validate_usage_daily_trino
    -> load_usage_daily_starrocks
    -> validate_usage_daily_serving
```

### DAG에 남길 항목
- `doc_md`에 source → task → sink 한 줄 요약
- task_id는 lineage가 드러나게 동사형으로 작성
- SQL task / Spark task / quality task를 구분 가능하게 네이밍

좋은 예:
- `ensure_raw_table`
- `run_usage_daily_spark`
- `validate_usage_daily_trino`
- `load_usage_daily_starrocks`
- `validate_usage_daily_serving`

## 컬럼 수준 lineage 문서화 패턴
Starlake `col-lineage`가 하듯, 주요 산출 컬럼은 어떤 원천 컬럼에서 나왔는지 최소한 텍스트로라도 남긴다.

### 예시
```text
output column lineage:
- service_name <- raw.service_name
- hour <- hour(raw.@timestamp)
- avg_dur <- avg(raw.dur)
- error_rate <- sum(case when raw.code like '5%' then 1 else 0 end) / count(*)
```

### 언제 꼭 남기나
- StarRocks serving 컬럼
- KPI/집계 컬럼
- 이름이 바뀌거나 계산식이 들어간 컬럼
- downstream dashboard가 직접 참조하는 컬럼

## 권장 산출물
라인리지 문서는 거창할 필요 없다. 아래 중 하나면 충분하다.
- DAG `doc_md`
- skill/reference용 markdown
- 파이프라인별 설계 문서
- PR description

권장 템플릿:

```markdown
## Lineage
- Source: `kafka.billing-events`
- Landing: `s3://deck/lake/billing/events/`
- Metastore: `billing.events_raw`
- Transform Job: `sparks/jobs/billing/usage_daily_job.py`
- Curated Output: `s3://deck/warehouse/billing/usage_daily/`
- Serving: `starrocks.billing.usage_daily`

## Column Lineage
- `dt` <- `date(@timestamp)`
- `hour` <- `hour(@timestamp)`
- `usage_amount` <- `sum(raw.usage)`
```

## OpenLineage 연동 고려사항
아직 실제 코드에 OpenLineage 구현이 없어도, 나중에 붙이기 쉽게 아래 정보를 일관되게 남겨둔다.

필수 식별자:
- namespace: `deck`
- job name: DAG id + task id 또는 spark app name
- input dataset: Kafka topic / S3 path / Hive table
- output dataset: S3 path / Hive table / StarRocks table
- run facet 후보: execution date, partition, git sha, app version

설계 가이드:
- task_id와 spark app name을 안정적으로 유지한다.
- input/output path naming을 바꾸지 않도록 한다.
- 비즈니스 키/partition key를 문서에 남긴다.
- SQL task와 Spark task 모두 input/output dataset을 명시한다.

## 실무 문서화 규칙
- source, landing, transform, serving의 4단계를 빠뜨리지 않는다.
- S3 path와 Hive/Trino table을 같이 기록한다.
- StarRocks 적재가 있으면 serving lineage를 별도 표기한다.
- 품질 게이트도 lineage 일부로 본다. 즉, "어디를 검증하는지"를 남긴다.

예시:
```text
validate_usage_daily_trino:
  input: billing.usage_daily
  check: row_count, null, duplicate, freshness
  failure_action: slack_alert + dag_fail
```

## 리뷰 체크리스트
- [ ] Kafka/Vector/S3/Hive/Trino/StarRocks 중 실제 경유 시스템이 모두 문서화되었는가
- [ ] DAG task dependency가 task_id 수준으로 드러나는가
- [ ] serving 컬럼의 주요 파생 관계가 설명되는가
- [ ] S3 path와 테이블명(Hive/Trino/StarRocks)이 함께 남아 있는가
- [ ] 품질 게이트 위치도 lineage 일부로 설명되는가
- [ ] OpenLineage로 확장 가능한 식별자(job, dataset, partition)가 안정적으로 정의되어 있는가
