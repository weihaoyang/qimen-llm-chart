import { describe, expect, it } from "vitest";
import { buildDefaultGravityLine, buildMoveTemplates, buildOppositionScan, calculateRunwayDays, classifyRealityInput, detectJunctions, evaluateBreaker } from "./rules";
import type { BattleInput } from "./types";

describe("battle deterministic rules", () => {
  it("classifies user input without treating AI as reality", () => {
    expect(classifyRealityInput("我希望三个月内转行")).toBe("goal");
    expect(classifyRealityInput("可能能拿到这份工作")).toBe("assumption");
    expect(classifyRealityInput("已收到正式 offer")).toBe("fact");
    expect(classifyRealityInput("模型推测会成功", "ai")).toBe("assumption");
  });

  it("calculates a finite cash runway only from measurable cash and cost", () => {
    expect(calculateRunwayDays({ cashAvailable: 15000, monthlyFixedCost: 10000 })).toBe(45);
    expect(calculateRunwayDays({ cashAvailable: 15000 })).toBeNull();
  });

  it("builds a grounded gravity line and detects hard intersections", () => {
    const input: BattleInput = { objective: "守住现金并争取项目", minimumOutcome: "不借高利贷", hardDeadline: "2026-08-28T00:00:00.000Z", facts: [], constraints: [{ id: "c", battleId: "b", kind: "legal", label: "合同不能违约", description: "", hard: true, severity: 5, threshold: {}, source: {} }], inventory: [], resourceSnapshot: { cashAvailable: 9000, monthlyFixedCost: 12000 } };
    const gravity = buildDefaultGravityLine(input, new Date("2026-08-20T00:00:00.000Z"));
    expect(gravity.summary).toContain("常规路径");
    expect(gravity.resourceCost.runwayDays).toBe(23);
    const junctions = detectJunctions(input, new Date("2026-08-20T00:00:00.000Z"));
    expect(junctions.map((junction) => junction.id)).toEqual(expect.arrayContaining(["deadline", "cash-runway", "hard-boundary"]));
    const moves = buildMoveTemplates(input, gravity, junctions[0]);
    expect(moves.map((move) => move.kind)).toEqual(["strong_attack", "probe", "hedge"]);
    expect(moves.every((move) => move.actions.length === 1 && move.actions[0].dueAt)).toBe(true);
  });

  it("triggers breakers from physical conditions", () => {
    expect(evaluateBreaker({ kind: "cash", enabled: true, threshold: { maxRunwayDays: 14 } }, { runwayDays: 10 })).toEqual({ triggered: true, reason: "现金跑道已低于 14 天" });
    expect(evaluateBreaker({ kind: "assumption", enabled: true, threshold: {} }, { assumptionDisproved: true })).toEqual({ triggered: true, reason: "核心假设已被事实证伪" });
  });

  it("scans the opponent field without inventing hidden facts", () => {
    const scan = buildOppositionScan({ objective: "拿到试点", opponentSummary: "采购流程和大公司竞品", hardDeadline: "2026-08-30T00:00:00.000Z", facts: [{ id: "f", battleId: "b", kind: "unknown", content: "谁能拍板未知", source: "user", confidence: 20, occurredAt: null, verifiedAt: null, createdAt: "" }], constraints: [], inventory: [{ id: "i", battleId: "b", category: "information", label: "客户真实痛点", description: "", quantity: 1, unit: "项", availability: "available", expiresAt: null, cost: {}, evidence: {} }] });
    expect(scan.pressurePoints.join(" ")).toContain("采购流程");
    expect(scan.leverageOpenings.join(" ")).toContain("客户真实痛点");
    expect(scan.unknowns).toContain("谁能拍板未知");
    expect(scan.ethicalBoundary).toContain("公开、合法");
  });

  it("builds all three moves for each detected intersection", () => {
    const input: BattleInput = { objective: "守住现金", hardDeadline: "2026-08-25T00:00:00.000Z", facts: [], constraints: [], inventory: [], resourceSnapshot: { cashAvailable: 5000, monthlyFixedCost: 10000 } };
    const gravity = buildDefaultGravityLine(input, new Date("2026-08-20T00:00:00.000Z"));
    const junctions = detectJunctions(input, new Date("2026-08-20T00:00:00.000Z"));
    expect(junctions.length).toBeGreaterThan(1);
    expect(junctions.flatMap((junction) => buildMoveTemplates(input, gravity, junction)).filter((move) => move.kind === "probe")).toHaveLength(junctions.length);
  });
});
