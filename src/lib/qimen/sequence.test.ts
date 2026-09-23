import { describe, expect, it } from "vitest";
import { buildChartSequence, buildChartSequenceByCount, buildSequenceInputs } from "./sequence";

describe("buildChartSequenceByCount", () => {
  it("creates 20 points for each relationship scale", () => {
    for (const step of ["double-hour", "day", "month", "year"] as const) {
      const result = buildChartSequenceByCount("2026-08-01T10:00", "Asia/Shanghai", step, 20);
      expect(result).toHaveLength(20);
      expect(result[0]?.input.datetime).toBe("2026-08-01T10:00");
    }
  });
});

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

  it("does not skip a month when the anchor day is missing from the next month", () => {
    const result = buildSequenceInputs({
      startDatetime: "2026-01-31T10:00",
      endDatetime: "2026-04-30T10:00",
      timeZone: "Asia/Shanghai",
      step: "month",
    });

    // A naive `setUTCMonth` rolls 2026-01-31 +1 month into 2026-03-03, so
    // February never appears in the sequence. The day is clamped to each
    // month's last valid day instead.
    expect(result.map((item) => item.datetime)).toEqual([
      "2026-01-31T10:00",
      "2026-02-28T10:00",
      "2026-03-31T10:00",
      "2026-04-30T10:00",
    ]);
  });

  it("clamps a leap day instead of rolling it into March", () => {
    const result = buildSequenceInputs({
      startDatetime: "2024-02-29T10:00",
      endDatetime: "2026-02-28T10:00",
      timeZone: "Asia/Shanghai",
      step: "year",
    });

    expect(result.map((item) => item.datetime)).toEqual([
      "2024-02-29T10:00",
      "2025-02-28T10:00",
      "2026-02-28T10:00",
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
