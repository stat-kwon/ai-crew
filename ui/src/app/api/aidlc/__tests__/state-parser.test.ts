import { describe, it, expect } from "vitest";
import { parseAidlcState } from "../state/parser";

describe("parseAidlcState", () => {
  it("### INCEPTION PHASE + 체크박스 패턴을 정확히 파싱한다", () => {
    const content = `# AI-DLC State Tracking

## Project Information
- **Project Type**: Brownfield
- **Current Stage**: INCEPTION - Units Generation Complete

## Stage Progress

### INCEPTION PHASE
- [x] Workspace Detection
- [x] Requirements Analysis
- [x] User Stories (SKIPPED - pure enhancement)
- [ ] Workflow Planning
- [ ] Application Design
- [ ] Units Generation`;

    const result = parseAidlcState(content);

    expect(result.found).toBe(true);
    expect(result.currentStage).toBe(
      "INCEPTION - Units Generation Complete",
    );
    expect(result.stages).toHaveLength(6);

    expect(result.stages[0]).toMatchObject({
      name: "Workspace Detection",
      status: "complete",
      phase: "INCEPTION PHASE",
    });
    expect(result.stages[2]).toMatchObject({
      name: "User Stories (SKIPPED - pure enhancement)",
      status: "complete",
    });

    expect(result.stages[3]).toMatchObject({
      name: "Workflow Planning",
      status: "pending",
    });

    const completed = result.stages.filter(
      (s) => s.status === "complete",
    ).length;
    expect(completed).toBe(3);
    expect(result.stages.length).toBe(6);
  });

  it("기존 ## N. StageName 패턴도 파싱한다 (하위 호환)", () => {
    const content = `## 1. Requirements
- [x] Gather requirements
- [x] Validate requirements

## 2. Design
- [x] Create architecture
- [ ] Review design`;

    const result = parseAidlcState(content);

    expect(result.stages).toHaveLength(2);
    expect(result.stages[0].name).toBe("Requirements");
    expect(result.stages[0].status).toBe("complete");
    expect(result.stages[1].name).toBe("Design");
    expect(result.stages[1].status).toBe("active");
  });

  it("빈 콘텐츠는 빈 stages 배열을 반환한다", () => {
    const result = parseAidlcState("");
    expect(result.stages).toHaveLength(0);
    expect(result.found).toBe(true);
  });

  it("다중 Phase(INCEPTION + CONSTRUCTION)를 올바르게 구분한다", () => {
    const content = `## Stage Progress

### INCEPTION PHASE
- [x] Workspace Detection
- [x] Requirements Analysis

### CONSTRUCTION PHASE
- [ ] Code Generation
- [ ] Build and Test`;

    const result = parseAidlcState(content);

    expect(result.stages).toHaveLength(4);
    expect(result.stages[0].phase).toBe("INCEPTION PHASE");
    expect(result.stages[1].phase).toBe("INCEPTION PHASE");
    expect(result.stages[2].phase).toBe("CONSTRUCTION PHASE");
    expect(result.stages[3].phase).toBe("CONSTRUCTION PHASE");
  });

  it("실제 aidlc-state.md 전체 포맷의 파싱 결과 스냅샷", () => {
    const realContent = `# AI-DLC State Tracking

## Project Information
- **Project Type**: Brownfield
- **Start Date**: 2026-03-28T17:35:00Z
- **Current Stage**: INCEPTION - Units Generation Complete

## Workspace State
- **Existing Code**: Yes

## Stage Progress

### INCEPTION PHASE
- [x] Workspace Detection
- [x] Requirements Analysis
- [x] User Stories (SKIPPED - pure enhancement)
- [x] Workflow Planning
- [x] Application Design (COMPLETED - unit decomposition artifacts generated)
- [x] Units Generation

## Execution Plan Summary
- **Total Stages**: 3`;

    const result = parseAidlcState(realContent);
    expect(result).toMatchSnapshot();
  });
});
