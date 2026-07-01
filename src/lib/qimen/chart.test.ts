import { describe, expect, it } from "vitest";
import { buildChart } from "./chart";

describe("buildChart", () => {
  it("returns nine palaces for a valid datetime input", () => {
    const chart = buildChart({
      datetime: "2026-07-01T21:30",
      timeZone: "Asia/Shanghai",
    });

    expect(chart.raw.palaces).toHaveLength(9);
    expect(chart.raw.palaces[0]?.position).toBe(1);
    expect(chart.raw.palaces[8]?.position).toBe(9);
  });

  it("includes interpreted local datetime metadata", () => {
    const chart = buildChart({
      datetime: "2026-07-01T21:30",
      timeZone: "Asia/Tokyo",
    });

    expect(chart.interpretedDateTime).toBe("2026-07-01 21:30:00");
  });
});
