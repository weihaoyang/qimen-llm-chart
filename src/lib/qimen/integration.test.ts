import { describe, expect, it } from "vitest";
import { buildChart } from "./chart";
import { serializeChartToStructuredText } from "./serializer";

describe("qimen integration", () => {
  it("includes all palace numbers in the structured text", () => {
    const chart = buildChart({
      datetime: "2026-07-01T21:30",
      timeZone: "Asia/Shanghai",
    });
    const text = serializeChartToStructuredText(chart);

    for (let position = 1; position <= 9; position += 1) {
      expect(text).toContain(`宫位编号: ${position}`);
    }
  });

  it("mirrors overview values from the chart source data", () => {
    const chart = buildChart({
      datetime: "2026-07-01T21:30",
      timeZone: "Asia/Shanghai",
    });
    const text = serializeChartToStructuredText(chart);

    expect(text).toContain(`值符星: ${chart.raw.zhiFu.star}`);
    expect(text).toContain(`值使门: ${chart.raw.zhiShi.gate}`);
  });

  it("changes timezone metadata when timezone input changes", () => {
    const shanghai = buildChart({
      datetime: "2026-07-01T21:30",
      timeZone: "Asia/Shanghai",
    });
    const tokyo = buildChart({
      datetime: "2026-07-01T21:30",
      timeZone: "Asia/Tokyo",
    });

    expect(shanghai.input.timeZone).toBe("Asia/Shanghai");
    expect(tokyo.input.timeZone).toBe("Asia/Tokyo");
    expect(shanghai.raw.timeInfo.chineseTime).not.toBe(tokyo.raw.timeInfo.chineseTime);
  });
});
