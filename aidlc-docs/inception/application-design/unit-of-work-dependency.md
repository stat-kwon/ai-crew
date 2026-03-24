# Unit Dependencies

## 의존성 매트릭스

| Unit | 의존 대상 | 병렬 가능 여부 |
|------|----------|--------------|
| foundation | 없음 | Level 0 (단독) |
| graph-ext | foundation | Level 1 (병렬) |
| verifier | foundation | Level 1 (병렬) |
| install-state | foundation | Level 1 (병렬) |
| shared-memory | foundation | Level 1 (병렬) |
| session-context | foundation | Level 1 (병렬) |
| hook-profiling | 없음 | Level 1 (병렬) |
| cli-validate | foundation | Level 1 (병렬) |
| checkpoint | foundation, shared-memory | Level 2 |
| integration-review | 모든 유닛 | Level 3 |

## 실행 레벨 (DAG)

```
Level 0: [foundation]
            │
Level 1: [graph-ext] [verifier] [install-state] [shared-memory] [session-context] [hook-profiling] [cli-validate]
            │            │            │               │                │                │                │
            └────────────┴────────────┴───────┬───────┘                │                │                │
                                              │                       │                │                │
Level 2:                              [checkpoint]                    │                │                │
            │                             │                           │                │                │
            └─────────────────────────────┴───────────────────────────┴────────────────┴────────────────┘
                                              │
Level 3:                            [integration-review]
```

## Critical Path

```
foundation → shared-memory → checkpoint → integration-review
```

최장 경로: 4 레벨. Level 1에서 7개 유닛이 병렬 실행되어 전체 시간 대폭 단축.
