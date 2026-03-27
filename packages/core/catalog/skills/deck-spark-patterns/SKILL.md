---
name: deck-spark-patterns
description: Deck DataPlatform 팀의 PySpark ETL 작성 패턴과 `sparks/lib/connectors.py`, `sparks/lib/transformers.py` 활용 규칙. Use when creating, reviewing, or refactoring Spark jobs under deck-workflow/sparks/jobs; splitting read/transform/write stages; using Hive Metastore and Trino-facing table patterns; loading into StarRocks; implementing incremental append/merge-style processing in PySpark; handling empty-input paths; or reusing common Spark connectors, schema helpers, and transformers.
---

# Deck Spark Patterns

## SSOT로 먼저 볼 코드
- `deck-workflow/sparks/jobs/s2_anomaly_baseline.py`
- `deck-workflow/sparks/lib/connectors.py`
- `deck-workflow/sparks/lib/transformers.py`

주의: 현재 deck 레포에 `billing/*` Spark job 예시는 충분히 쌓여 있지 않다. 따라서 이 Skill은 **확인된 공통 라이브러리 패턴**과 `s2_anomaly_baseline.py`의 구조를 우선 반영한다.

## 기본 구조
Deck Spark Job은 아래 순서를 따른다.
1. 상수/환경변수 선언
2. 입력 경로/테이블 식별
3. 읽기 함수
4. 변환 함수
5. 쓰기 함수
6. 검증 함수(필요 시)
7. `main()` 오케스트레이션

권장 골격:

```python
import os

from pyspark.sql import DataFrame, SparkSession

from lib.connectors import get_spark_session, read_s3_parquet, write_s3_parquet
from lib.transformers import add_audit_columns, clean_dataframe


SOURCE_PATH = os.getenv("SOURCE_PATH", "s3a://deck/lake/source")
TARGET_PATH = os.getenv("TARGET_PATH", "s3a://deck/warehouse/target")


def read_source(spark: SparkSession) -> DataFrame:
    return read_s3_parquet(spark, SOURCE_PATH)


def transform(df: DataFrame) -> DataFrame:
    return add_audit_columns(clean_dataframe(df))


def write_target(df: DataFrame) -> None:
    write_s3_parquet(df, TARGET_PATH, mode="overwrite", partition_by=["dt"])


def main() -> None:
    spark = get_spark_session("deck-source-to-target")
    try:
        source_df = read_source(spark)
        result_df = transform(source_df)
        write_target(result_df)
    finally:
        spark.stop()


if __name__ == "__main__":
    main()
```

## `get_spark_session()` 사용 규칙
실제 `lib/connectors.py` 기준:
- `SparkSession.builder.appName(...)`
- `spark.sql.catalogImplementation=hive`
- `spark.sql.warehouse.dir=s3a://deck/warehouse/hive`
- recursive input 활성화
- `enableHiveSupport()` 사용

원칙:
- 신규 Job은 직접 builder를 새로 짜기보다 `get_spark_session()`을 우선 사용한다.
- app name은 파이프라인이 식별 가능하게 작성한다.

```python
from lib.connectors import get_spark_session

spark = get_spark_session("s2_anomaly_baseline")
```

직접 builder를 허용하는 경우:
- Kafka/JDBC/package 설정처럼 Job 고유 설정이 필수일 때
- 이 경우에도 공통 설정을 왜 우회하는지 코드에 남긴다

## 읽기/쓰기 패턴

### S3 Parquet
```python
from lib.connectors import read_s3_parquet, write_s3_parquet

source_df = read_s3_parquet(spark, "s3a://deck/lake/billing/daily")

write_s3_parquet(
    df=result_df,
    path="s3a://deck/warehouse/billing/daily",
    mode="overwrite",
    partition_by=["dt", "region"],
    compression="snappy",
)
```

### Hive Metastore helper
다음 상황이면 Hive helper를 우선 고려한다.
- Hive Metastore를 스키마 SSOT로 삼아야 할 때
- external table 생성/존재 확인/파티션 갱신이 필요할 때
- downstream Trino가 같은 메타스토어를 읽는 구조일 때

주요 helper:
- `read_hive_table()`
- `write_hive_table()`
- `table_exists()`
- `create_database_if_not_exists()`
- `get_or_create_external_table()`
- `refresh_table_partitions()`

실제 `s2_anomaly_baseline.py`는 테이블이 없으면 샘플에서 스키마를 추론해 생성하는 패턴을 사용한다.

## Hive Metastore (Trino) 연동 패턴
Deck 스택에서는 Hive Metastore가 Spark/Trino 사이 메타데이터 SSOT 역할을 한다. 따라서 Spark job은 "파일만 쓴다"로 끝내지 말고, Trino가 읽을 수 있는 테이블 상태까지 고려한다.

기본 원칙:
- S3 path와 Hive table location을 일치시킨다.
- Spark에서 external table / saveAsTable을 생성하면 Trino 조회 가능성을 함께 검토한다.
- 새 partition이 추가되면 `refresh_table_partitions()` 또는 대응 메타데이터 refresh 단계를 둔다.
- Trino 친화적인 타입/파티션 컬럼을 사용한다.

권장 흐름:
1. `create_database_if_not_exists()`
2. `get_or_create_external_table()` 또는 `write_hive_table()`
3. partition write
4. `refresh_table_partitions()`
5. Trino 검증 쿼리

예시:

```python
from lib.connectors import (
    create_database_if_not_exists,
    get_or_create_external_table,
    refresh_table_partitions,
)

create_database_if_not_exists(spark, "billing")
raw_df = get_or_create_external_table(
    spark,
    table_name="usage_events",
    database="billing",
    location="s3a://deck/lake/billing/usage_events",
    file_format="JSON",
)

# ... transform ...

result_df.write.mode("overwrite").partitionBy("dt").parquet("s3a://deck/warehouse/billing/usage_daily")
refresh_table_partitions(spark, "usage_daily", "billing")
```

주의:
- 컬럼명을 자주 바꾸면 Trino downstream과 계약이 깨지기 쉽다.
- `@timestamp` 같은 특수 컬럼은 external table 생성 helper가 백틱 처리하는 현재 패턴을 따른다.
- Trino 검증을 위해 `dt`, `hour`, `service_name` 같은 low/medium cardinality partitioning을 선호한다.

## `lib/transformers.py` 활용 규칙
실제 구현 기준 주요 helper:
- `clean_dataframe(df, drop_nulls=False)`
- `add_audit_columns(df)`
- `deduplicate(df, key_columns, order_column, keep="last")`
- `cast_columns(df, schema_map)`

규칙:
- DataFrame 변환 함수는 순수 함수에 가깝게 유지한다.
- 함수명은 `transform_`, `normalize_`, `enrich_`, `calculate_`처럼 의도가 드러나게 한다.
- 읽기/쓰기와 변환을 같은 함수에 섞지 않는다.

```python
def transform_usage(df: DataFrame) -> DataFrame:
    df = clean_dataframe(df, drop_nulls=True)
    df = cast_columns(df, {"usage": "double", "event_at": "timestamp"})
    df = add_audit_columns(df)
    return df
```

## 스키마 처리 패턴

### 1. 하드코딩 최소화
Deck 예제는 Hive Metastore를 스키마 SSOT로 사용하는 쪽에 가깝다.
- 가능하면 `get_or_create_external_table()`로 자동 생성/조회
- 원본 JSON/Parquet에서 샘플 기반 스키마 추론 허용
- 동일 스키마 정의를 여러 파일에 복붙하지 않는다

### 2. 명시적 cast는 변환 단계에 모은다
```python
def apply_schema(df: DataFrame) -> DataFrame:
    return cast_columns(
        df,
        {
            "event_time": "timestamp",
            "amount": "double",
            "org_id": "string",
        },
    )
```

### 3. 원본 필드명 매핑 상수를 둔다
실제 `s2_anomaly_baseline.py`는 JSON 필드명과 내부 명칭 사이에 `COLUMN_MAPPING` 상수를 둔다.

```python
COLUMN_MAPPING = {
    "timestamp": "@timestamp",
    "service_name": "service_name",
    "code": "code",
}
```

### 4. 빈 DataFrame 경로를 먼저 고려한다
실제 코드처럼 `df.rdd.isEmpty()` 또는 빈 schema DataFrame 반환으로 조기 종료 패턴을 넣는다.

## 증분 처리 패턴
AltimateAI dbt incremental 패턴에서 가져와 Deck Spark에 맞게 번역하면 핵심은 다음 4가지다.
- 증분이 정말 필요한지 먼저 판단한다.
- append / merge / partition overwrite 전략을 명확히 고른다.
- late arriving data를 위해 lookback window를 둔다.
- 주기적으로 full refresh 또는 backfill 경로를 지원한다.

### 언제 증분을 쓰나
- 원천이 작고 full refresh가 빠르면 그냥 full refresh가 낫다.
- 원천이 크거나 매일 재계산 비용이 크면 incremental을 고려한다.
- append-only 이벤트는 append + dedup 조합이 단순하다.
- 업데이트가 있는 엔터티는 merge/upsert 또는 특정 파티션 재처리가 필요하다.

### 1. append-only + lookback
```python
from pyspark.sql import functions as F

LOOKBACK_DAYS = int(os.getenv("LOOKBACK_DAYS", "3"))

def filter_incremental(df: DataFrame, target_date: str) -> DataFrame:
    return df.filter(F.col("dt") >= F.date_sub(F.lit(target_date), LOOKBACK_DAYS))
```

### 2. merge 전 deduplicate
AltimateAI의 `unique_key` 검증 개념은 Spark에서 `deduplicate()`로 옮긴다.

```python
def prepare_incremental_source(df: DataFrame) -> DataFrame:
    return deduplicate(
        df,
        key_columns=["event_id"],
        order_column="updated_at",
        keep="last",
    )
```

### 3. partition overwrite
Spark/Trino 친화적 증분의 기본값은 기준일 파티션만 재생성하는 방식이다.

```python
(
    result_df
    .filter(F.col("dt") >= F.lit(start_dt))
    .write
    .mode("overwrite")
    .partitionBy("dt")
    .parquet("s3a://deck/warehouse/billing/usage_daily")
)
```

### 4. full refresh 경로를 남긴다
- `--full-refresh`, `--date`, `--days` 같은 CLI 인자를 제공한다.
- incremental 로직만 믿지 말고 주기적 full rebuild/backfill 경로를 확보한다.
- 품질 drift가 보이면 full refresh로 기준 상태를 재정렬한다.

## StarRocks 적재 패턴
실제 `s2_anomaly_baseline.py`는 JDBC overwrite로 StarRocks에 적재한다. Deck catalog에서도 이 패턴을 기본값으로 본다.

원칙:
- Spark에서 target schema에 맞게 명시적 cast 후 적재한다.
- StarRocks는 serving 레이어이므로 컬럼 타입/정렬키/기준일 검증을 적재 직후 확인한다.
- 비밀정보는 env var / secret으로 주입한다.

기본 예시:

```python
(
    starrocks_df.write
    .format("jdbc")
    .option("url", STARROCKS_JDBC_URL)
    .option("dbtable", STARROCKS_TABLE)
    .option("user", STARROCKS_USER)
    .option("password", STARROCKS_PASSWORD)
    .option("driver", "com.mysql.cj.jdbc.Driver")
    .mode("overwrite")
    .save()
)
```

권장 보강:
- 적재 전 `select()`로 컬럼 순서와 타입을 고정한다.
- 날짜 단위 재처리면 staging table → swap 또는 delete+insert 전략을 검토한다.
- 대량 적재 시 JDBC 단일 경로가 병목이면 StarRocks bulk load 패턴 검토를 남긴다.

## ETL 함수 분리 규칙
권장 분리 단위:
- `read_*` : 입력 계층
- `parse_*` : raw → structured
- `transform_*` / `calculate_*` : 비즈니스 변환
- `write_*` : 저장 계층
- `verify_*` : 품질 검증

안티패턴:
- `main()` 안에서 100줄 이상 한 번에 처리
- 읽기/변환/쓰기를 같은 함수에서 수행
- 환경변수 해석 로직이 함수마다 흩어짐

## 로깅 규칙
- 현재 실코드는 `print()` 기반 단계 로그를 광범위하게 사용한다.
- 따라서 신규 코드도 최소한 단계 prefix를 붙여 운영 로그를 남긴다.
- 예: `[INFO][read_api_logs]`, `[WARN][write_to_parquet]`
- count/path/table/date range 등 운영에 필요한 맥락을 남긴다.
- 비밀번호/토큰 같은 민감정보는 출력 금지

## 리뷰 체크리스트
- [ ] `get_spark_session()` 또는 공통 builder 패턴을 사용했는가
- [ ] 읽기/변환/쓰기/검증 함수가 분리되었는가
- [ ] 공통 처리가 `lib/connectors.py`, `lib/transformers.py`로 모듈화되었는가
- [ ] Hive Metastore를 Trino와 공유하는 구조를 고려했는가
- [ ] 스키마 처리 지점이 한곳으로 모였는가
- [ ] 증분 전략(append / merge 유사 / partition overwrite / full refresh)이 명시되었는가
- [ ] lookback / late arriving data 처리가 있는가
- [ ] 빈 데이터/예외 상황 조기 종료가 있는가
- [ ] S3 write는 `write_s3_parquet()` 또는 동등한 일관 패턴을 따르는가
- [ ] StarRocks 적재 전 컬럼 타입/순서를 고정했는가
- [ ] app name, 경로, 테이블명이 파이프라인 의미를 드러내는가
