import { describe, expect, it } from "vitest";
import { buildChartSequence, buildSequenceInputs } from "./sequence";

describe("buildSequenceInputs", () => {
  it("creates inclusive double-hour sequence inputs", () => {
    const result = buildSequenceInputs({
      startDatetime: "2026-07-01T21:30",
      endDatetime: "2026-07-02T01:30",
      timeZone: "Asia/Shanghai",
      step: "double-hour",
    });

    expect(result).toEqual([
      { datetime: "2026-07-01T21:30", timeZone: "Asia/Shanghai" },
      { datetime: "2026-07-01T23:30", timeZone: "Asia/Shanghai" },
      { datetime: "2026-07-02T01:30", timeZone: "Asia/Shanghai" },
    ]);
  });

  it("creates inclusive daily sequence inputs", () => {
    const result = buildSequenceInputs({
      startDatetime: "2026-07-01T21:30",
      endDatetime: "2026-07-03T21:30",
      timeZone: "Asia/Shanghai",
      step: "day",
    });

    expect(result.map((item) => item.datetime)).toEqual([
      "2026-07-01T21:30",
      "2026-07-02T21:30",
      "2026-07-03T21:30",
    ]);
  });
});

describe("buildChartSequence", () => {
  it("builds a chart for every sequence input", () => {
    const result = buildChartSequence({
      startDatetime: "2026-07-01T21:30",
      endDatetime: "2026-07-01T23:30",
      timeZone: "Asia/Shanghai",
      step: "double-hour",
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.chart.raw.palaces).toHaveLength(9);
    expect(result[1]?.input.datetime).toBe("2026-07-01T23:30");
  });
});
