---
name: deck-data-quality
description: Deck DataPlatform 팀의 데이터 품질 검증 패턴. Use when validating S3 ingestion outputs, writing Trino-based data quality queries, adding hard-fail or warn-only quality gates to Airflow DAGs, checking row-count/null/duplicate/freshness metrics, or wiring failure alerts through `plugins/utils/notifications.py`.
---

# Deck Data Quality

## SSOT로 먼저 볼 코드
- `deck-workflow/plugins/utils/notifications.py`
- `deck-workflow/sparks/jobs/s2_anomaly_baseline.py`
- `deck-workflow/sparks/lib/connectors.py`
- `deck-workflow/dags/*.py`

이 Skill은 Starlake의 `expectations`, `freshness`, `metrics` 패턴을 Deck 스택에 맞게 옮긴 것이다. 핵심은 동일하다.
- 검증을 명시적 태스크로 만든다.
- fail/warn 기준을 구분한다.
- row count, null, duplicate, freshness 같은 반복 패턴을 재사용한다.
- 결과를 운영 알림과 연결한다.

## 품질 게이트 기본 원칙

### 1. 품질 검증은 "작업 후 옵션"이 아니라 파이프라인 단계다
검증은 보통 세 지점에 붙인다.
- S3 적재 직후: 파일 존재, row count, 스키마/파티션 sanity check
- Spark 변환 직후: null, duplicate, business rule, freshness 검증
- StarRocks 적재 직후: serving table sanity check

### 2. failOnError와 warn-only를 구분한다
Starlake expectations의 `failOnError` 개념을 Deck에 적용한다.

hard fail 예시:
- row count = 0
- 기준키 duplicate 발생
- 필수 컬럼 null 비율 초과
- 최신 partition 미존재

warn-only 예시:
- row count가 평소보다 20% 감소
- 특정 범주 비율 이상치
- p95 latency 분포 변동

### 3. 검증은 대형 Spark job보다 가벼운 SQL 태스크를 우선한다
- 산출물이 Hive Metastore/Trino에서 보이면 Trino SQL로 검사한다.
- 검증 때문에 같은 full scan Spark job을 또 돌리지 않는다.
- metrics는 핵심 컬럼만 선택적으로 계산한다.

## S3 적재 후 데이터 품질 검증 패턴

### 최소 검증 세트
- 입력 path/partition 존재 여부
- row count > 0
- 필수 컬럼 not null
- 중복키 없음
- 기준일(dt/hour) 범위 적합

### S3 → Hive/Trino 경로 권장 순서
1. Spark가 S3에 write
2. Hive Metastore 파티션 refresh
3. Trino SQL로 row count / null / duplicate / freshness 검증
4. 실패 시 DAG 중단 + 알림

### 검증 항목 예시
- `count(*) > 0`
- `count_if(id is null) = 0`
- `count(*) - count(distinct business_key) = 0`
- `max(dt) >= current_date - interval '1' day`

## Trino 기반 데이터 검증 쿼리 패턴
Starlake expectations의 문법은 `query => condition` 구조다. Deck에서는 이 개념을 "SQL + 파이썬 조건 판정" 또는 "SQL 자체가 위반 건수 반환" 방식으로 옮기면 된다.

### 1. row count
```sql
SELECT COUNT(*) AS row_count
FROM billing.usage_daily
WHERE dt = DATE '{{ ds }}'
```
판정:
- hard fail: `row_count = 0`
- warn: 기준선 대비 급감

### 2. null check
```sql
SELECT COUNT(*) AS null_cnt
FROM billing.usage_daily
WHERE dt = DATE '{{ ds }}'
  AND service_name IS NULL
```
판정:
- hard fail: `null_cnt > 0`

### 3. duplicate check
```sql
SELECT COUNT(*) AS dup_cnt
FROM (
  SELECT event_id
  FROM billing.usage_daily
  WHERE dt = DATE '{{ ds }}'
  GROUP BY 1
  HAVING COUNT(*) > 1
)
```
판정:
- hard fail: `dup_cnt > 0`

### 4. freshness check
Starlake freshness처럼 마지막 갱신시각 기반으로 본다.

```sql
SELECT MAX(dt) AS max_dt
FROM billing.usage_daily
```
판정:
- hard fail: `max_dt < current_date - interval '1' day`
- warn: `max_dt < current_date`

### 5. metric check
Starlake metrics처럼 continuous/discrete 개념을 필요한 컬럼에만 적용한다.

```sql
SELECT
  MIN(amount) AS min_amount,
  MAX(amount) AS max_amount,
  AVG(amount) AS avg_amount,
  APPROX_DISTINCT(service_name) AS service_cnt
FROM billing.usage_daily
WHERE dt = DATE '{{ ds }}'
```
판정:
- warn-only: 값 범위 이상 여부

## Airflow DAG에서 품질 게이트 붙이는 방법

### 기본 패턴
```python
start >> run_spark_job >> validate_output >> publish_to_starrocks >> validate_serving >> end
```

### hard fail 태스크
- `SQLExecuteQueryOperator`로 위반 건수 쿼리 실행
- 후속 Python/Branch 태스크에서 0이 아니면 예외 발생
- 또는 쿼리 자체가 위반 row만 반환하게 하고, 후속 태스크에서 값 판정

### warn-only 태스크
- 실패시키지 않고 Slack 알림만 전송
- 운영 대시보드/로그에 남긴다

### 권장 배치
- source freshness: Spark 전
- output quality: Spark 후
- serving sanity: StarRocks 후

## 실패 시 알림 패턴
실제 Deck는 `plugins/utils/notifications.py`의 `send_slack_alert`, `on_failure_callback`, `on_success_callback`을 제공한다.

### 기본 원칙
- DAG 전체에는 `on_failure_callback`을 기본 설정한다.
- 품질 게이트에서 잡은 위반은 메시지에 테이블, 기준일, 위반 건수, 샘플 원인을 남긴다.
- warn-only도 조용히 삼키지 말고 Slack으로 보낸다.

### 예시 메시지 포맷
```text
:x: *Data Quality Check Failed*
• DAG: `billing_daily`
• Check: `duplicate_event_id`
• Table: `billing.usage_daily`
• Partition: `2026-03-25`
• Violations: `128`
```

### 코드 연결 예시
```python
from utils.notifications import send_slack_alert

send_slack_alert(
    "[WARN][data-quality] billing.usage_daily dt=2026-03-25 row_count dropped by 35%"
)
```

## 권장 품질 체크 세트

### Bronze / Raw
- 파일 존재 여부
- ingest row count > 0
- timestamp 파싱 가능 여부
- 필수 메타컬럼 존재 여부

### Silver / Curated
- business key uniqueness
- null ratio
- partition completeness
- referential integrity 유사 체크

### Gold / Serving / StarRocks
- serving key uniqueness
- 기준일 데이터 존재 여부
- 집계값 급변 여부
- 이전 일자 대비 row count 차이

## 품질 규칙 문서화 방식
Starlake expectations처럼 규칙을 구조적으로 정리한다.

권장 형식:
- check name
- 대상 테이블/파티션
- SQL
- severity: fail | warn
- threshold
- 알림 여부

예시:
```yaml
checks:
  - name: duplicate_event_id
    table: billing.usage_daily
    severity: fail
    rule: dup_cnt = 0
  - name: freshness_daily
    table: billing.usage_daily
    severity: fail
    rule: max_dt >= current_date - 1
  - name: row_count_drop
    table: billing.usage_daily
    severity: warn
    rule: delta >= -20%
```

## 리뷰 체크리스트
- [ ] 품질 검증이 S3 적재 후 / Spark 후 / StarRocks 후 어디에 붙는지 명확한가
- [ ] hard fail과 warn-only 기준이 구분되는가
- [ ] Trino/SQL로 충분한 검증을 굳이 Spark로 재실행하지 않는가
- [ ] row count / null / duplicate / freshness 기본 세트가 고려되었는가
- [ ] 실패/경고 메시지가 운영자가 바로 이해할 수준인가
- [ ] `notifications.py`와 연계된 알림 경로가 있는가
- [ ] 검증 SQL이 기준일/파티션 filter를 타서 비용이 통제되는가
