import { describe, expect, it } from "vitest";
import { groupLifeKlineBands, movingAverage } from "./life-kline-reading";
import type { KlinePoint } from "@/lib/qimen/kline";

const point = (close: number, evidence: string[]): KlinePoint => ({
  index: close,
  datetime: "2026-01-01T00:00",
  open: close,
  high: close,
  low: close,
  close,
  score: close,
  delta: 0,
  phase: "震荡",
  label: String(close),
  keyPoint: "",
  evidence,
  prediction: "",
});

describe("life K-line reading helpers", () => {
  it("calculates a trailing moving average without inventing early values", () => {
    expect(movingAverage([point(40, []), point(50, []), point(70, [])], 2)).toEqual([null, 45, 60]);
  });

  it("groups contiguous dayun evidence into readable bands", () => {
    expect(groupLifeKlineBands([
      point(40, ["大运 甲子（2020 起）"]),
      point(50, ["大运 甲子（2020 起）"]),
      point(70, ["大运 乙丑（2030 起）"]),
    ])).toEqual([
      { label: "甲子（2020 起）", startIndex: 0, endIndex: 1 },
      { label: "乙丑（2030 起）", startIndex: 2, endIndex: 2 },
    ]);
  });
});
