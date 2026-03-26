---
name: deck-spark-performance
description: Deck DataPlatform 팀의 Spark 성능 리뷰 체크리스트. Use when reviewing or optimizing Spark jobs for shuffle, skew, partition count, predicate pushdown, cache/persist, S3 file layout, Trino-vs-Spark execution choice, StarRocks load optimization, explain plans, and dangerous actions like collect() or repeated repartition().
---

# Deck Spark Performance

이 Skill은 "돌아가는 코드"가 아니라 "운영 가능한 Spark 코드"를 만들기 위한 성능 점검표다. 구현 후 리뷰 단계에서 반드시 이 체크리스트로 다시 훑어라.

## 0. 먼저 결정할 것: Trino로 풀지, Spark로 풀지
Starlake의 expectations/freshness 패턴을 Deck에 가져오면, 모든 처리를 Spark로 몰지 말고 "검증/경량 집계는 SQL 엔진, 대용량 재배치는 Spark"로 나누는 게 중요하다.

### Trino를 우선 검토할 상황
- row count / null count / duplicate count 같은 검증 쿼리
- 이미 Hive Metastore에 노출된 테이블에 대한 필터/집계
- serving 전 sanity check
- 소량 결과를 바로 태스크 성공/실패로 판단하는 quality gate

### Spark를 우선 검토할 상황
- 대용량 join / groupBy / repartition / window 연산
- S3 raw 파일을 직접 읽어 재가공해야 하는 경우
- Trino보다 Spark가 유리한 wide transformation
- StarRocks 적재 전 타입 정제, repartition, 파일 수 조절이 필요한 경우

실무 기준:
- "읽어서 숫자 몇 개만 확인"이면 Trino 쪽이 단순하다.
- "데이터를 실제로 재배열/재계산"이면 Spark로 간다.
- Spark job 뒤에 붙는 검증은 Spark로 한 번 더 돌리기보다 Trino/SQL 태스크로 분리하는 편이 운영비가 적다.

## 1. Shuffle 최소화
- join 전에 필요한 컬럼/행을 먼저 줄인다.
- 큰 테이블끼리의 불필요한 `groupBy`, `distinct`, `orderBy`를 피한다.
- wide transformation이 연속되면 단계별 비용을 확인한다.

```python
small_dim = dim_df.select("service_id", "service_name").dropDuplicates(["service_id"])
filtered_fact = fact_df.filter(F.col("dt") == target_dt).select("service_id", "usage", "dt")
result_df = filtered_fact.join(small_dim, on="service_id", how="left")
```

AltimateAI Snowflake 최적화 패턴을 Spark로 옮기면 핵심은 같다.
- filter column에 불필요한 함수를 씌우지 않는다.
- join key cast/가공을 최소화한다.
- 동일한 서브쿼리/중간 집계를 반복 계산하지 않는다.

## 2. Broadcast join 기준
- 브로드캐스트 대상이 충분히 작고 executor 메모리에 무리 없을 때만 사용한다.
- 실제 크기를 모르면 먼저 확인한다.
- Spark가 자동 브로드캐스트를 못 하면 명시적으로 `broadcast()`를 사용한다.

```python
from pyspark.sql.functions import broadcast

result_df = big_df.join(broadcast(small_df), on="key", how="left")
```

브로드캐스트를 피할 상황:
- 조인 대상 크기를 모를 때
- 조인 후 행 수 폭증 가능성이 높을 때
- executor 메모리가 빠듯할 때

## 3. Partition 전략
- `repartition(n)` : shuffle 발생, 분산 재조정이 필요할 때
- `coalesce(n)` : shuffle 최소화, 파일 수를 줄일 때

규칙:
- 쓰기 전 파일 수 제어가 목적이면 먼저 `coalesce()`를 검토한다.
- 키 기반 균등 분산이 필요하면 `repartition(partition_col)`을 쓴다.
- 이유 없이 여러 번 `repartition()` 하지 않는다.

기본 출발점:
- 총 executor core 수 = `executor_instances * executor_cores`
- `spark.sql.shuffle.partitions` = 총 core 수의 2~4배 정도에서 시작

## 4. Data skew 감지 및 처리
Skew 신호:
- 일부 stage/task만 유독 오래 걸림
- Spark UI에서 특정 task input size가 비정상적으로 큼
- join/groupBy 후 일부 executor만 OOM
- 특정 key에 데이터가 몰림

대응 순서:
1. skew key 분포 확인
2. 선필터/사전집계 가능 여부 검토
3. broadcast 가능성 검토
4. salting 또는 hot key 분리 검토
5. AQE skew join 활용 검토

```python
skew_check_df = df.groupBy("customer_id").count().orderBy(F.desc("count"))
```

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
```

## 5. Predicate pushdown
- 읽고 나서 늦게 filter 하지 말고 가능한 빨리 필터링한다.
- Parquet/ORC는 pushdown 이점을 적극 활용한다.
- 파티션 컬럼 필터는 문자열 가공 없이 직접 비교한다.
- Snowflake 최적화 패턴과 동일하게, filter 대상 컬럼에 함수 적용을 최소화한다.

좋은 예:
```python
source_df = read_s3_parquet(spark, SOURCE_PATH).filter(F.col("dt") == target_dt)
```

나쁜 예:
```python
source_df = read_s3_parquet(spark, SOURCE_PATH)
source_df = source_df.withColumn("dt_str", F.date_format("event_time", "yyyy-MM-dd"))
source_df = source_df.filter(F.col("dt_str") == target_dt)
```

체크 포인트:
- `explain()`에 `PushedFilters`가 보이는가
- `PartitionFilters`가 제대로 잡히는가

## 6. Cache / persist 판단
cache 해야 하는 경우:
- 같은 DataFrame을 여러 번 액션/조인에 재사용
- 계산 비용이 큰 중간 결과를 2회 이상 소비

cache 하면 안 되는 경우:
- 한 번만 쓰는 DataFrame
- 매우 큰 원본인데 재사용이 거의 없음
- cache 후 action 없이 버리는 경우

```python
baseline_df = expensive_transform(source_df).cache()
print(baseline_df.count())
write_s3_parquet(baseline_df, target_path)
```

cache 했으면 근거를 남기고, 장기 세션이면 `unpersist()`도 검토한다.

## 7. Wide vs narrow transformation 구분
Narrow transformation:
- `select`, `withColumn`, `filter`, `mapPartitions`

Wide transformation:
- `join`, `groupBy`, `distinct`, `repartition`, `orderBy`

리뷰 기준:
- wide transformation 전에 컬럼/행을 충분히 줄였는가
- 같은 목적의 wide transformation이 중복되는가

## 8. S3 write 최적화
- 기본 포맷은 Parquet
- 파일 크기 목표는 대략 128MB 전후
- 작은 파일이 너무 많이 생기지 않게 파티션 수를 조정한다
- 과도한 `partitionBy`는 directory explosion을 만든다

```python
write_s3_parquet(
    df=result_df.coalesce(32),
    path=TARGET_PATH,
    mode="overwrite",
    partition_by=["dt"],
    compression="snappy",
)
```

금지에 가까운 예:
- `user_id` 같은 고카디널리티 컬럼 파티셔닝
- 쓰기 직전 무의미한 `repartition(1000)`
- 결과가 작은데 수백 개 파일 생성

## 9. StarRocks 적재 최적화
Deck stack에서는 Spark 결과가 최종적으로 StarRocks serving layer로 들어갈 수 있다. 이때는 Spark 성능과 StarRocks 분산 특성을 같이 본다.

원칙:
- 적재 전 컬럼 타입을 명시적으로 고정한다.
- 지나치게 큰 단일 파티션/단일 태스크로 몰리지 않게 분산을 맞춘다.
- StarRocks BE 노드에 부하가 고르게 가도록 병렬도와 배치 크기를 검토한다.

체크 포인트:
- JDBC overwrite가 단일 writer 병목이 아닌가
- 기준일/서비스 단위 분할로 재처리 범위를 줄일 수 있는가
- load 대상이 작은데도 과도한 repartition으로 Spark 비용만 늘어나지 않는가
- serving key(`service_name`, `dt`, `hour` 등)에 맞는 정렬/분할이 사전에 되어 있는가

실무 팁:
- Spark repartition은 StarRocks 분산키/조회 패턴과 무관하게 남발하지 않는다.
- 대량 적재면 staging write + swap, 또는 StarRocks 전용 bulk load 전략 검토를 남긴다.
- overwrite 전량 교체보다 date partition 재적재가 가능하면 그쪽을 우선한다.

## 10. `.collect()` 남용 금지
- 대량 데이터 경로에서 `.collect()`는 기본 금지
- driver에 꼭 필요한 소량 결과만 제한적으로 허용
- 검증/샘플 확인은 `show()`, `limit()`, 집계 결과로 대체한다
- quality gate용 숫자 검증은 가능하면 Trino/SQL 태스크로 뺀다

나쁜 예:
```python
rows = df.collect()
```

허용 예:
```python
top10 = df.orderBy(F.desc("cnt")).limit(10).collect()
```

## 11. `explain()` / Spark UI 근거를 남긴다
리뷰할 때는 코드 감상이 아니라 실행 계획 근거를 남긴다.

```python
result_df.explain(mode="formatted")
```

확인할 것:
- BroadcastHashJoin / SortMergeJoin 중 무엇이 선택됐는가
- Exchange(= shuffle) 횟수
- PushedFilters / PartitionFilters 유무
- 불필요한 Scan / Project 반복 여부

Spark UI에서 볼 것:
- 오래 걸리는 stage / task
- skew task 존재 여부
- shuffle read/write 크기
- spilled bytes
- executor OOM / lost executor

## 12. 품질 게이트 비용도 성능으로 본다
Starlake expectations/freshness 관점에서 보면 검증 자체도 비용이다.
- Spark 본처리와 같은 크기의 full scan 검증을 연달아 붙이지 않는다.
- 가능하면 partition filter가 걸리는 검증만 수행한다.
- metrics는 전체 컬럼 전수 계산보다 핵심 컬럼 중심으로 제한한다.
- freshness는 max(timestamp), max(dt) 같은 경량 집계로 끝낸다.

## 최종 성능 체크리스트
- [ ] 이 처리가 Trino보다 Spark가 적합한 작업인지 먼저 판단했는가
- [ ] join 전에 filter/select/dedup로 데이터 양을 줄였는가
- [ ] broadcast join 후보를 검토했는가
- [ ] repartition/coalesce 사용 이유가 명확한가
- [ ] skew 가능성이 큰 key를 확인했는가
- [ ] predicate pushdown이 적용되는 필터를 사용했는가
- [ ] filter/join key에 불필요한 함수/캐스트를 씌우지 않았는가
- [ ] cache/persist가 재사용 근거 없이 남발되지 않았는가
- [ ] wide transformation 횟수를 최소화했는가
- [ ] S3 write 파일 수와 파티션 전략이 적절한가
- [ ] StarRocks 적재 경로가 BE 분산/재처리 범위를 고려하는가
- [ ] shuffle partitions가 executor core 수 대비 과하거나 부족하지 않은가
- [ ] `.collect()`가 대량 데이터 경로에 남아있지 않은가
- [ ] 품질 게이트가 별도 대형 full scan을 유발하지 않는가
- [ ] `explain()` 또는 Spark UI 근거를 남겼는가
