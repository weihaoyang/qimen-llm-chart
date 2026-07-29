import { describe, expect, it } from "vitest";
import { QimenChart } from "3meta";
import { buildChart, buildQimenChartFromProfile } from "./chart";

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

  it("preserves the selected timezone wall-clock time when building the chart", () => {
    const chart = buildChart({
      datetime: "2026-07-01T23:30",
      timeZone: "Asia/Tokyo",
    });
    const direct = QimenChart.byDatetime("2026-07-01 23:30:00").toJSON();

    expect(chart.raw.timeInfo.chineseTime).toBe(direct.timeInfo.chineseTime);
    expect(chart.raw.fourPillars.hour).toEqual(direct.fourPillars.hour);
  });

  it("builds a qimen chart from normalized profile input", () => {
    const chart = buildQimenChartFromProfile({
      original: {
        calendarMode: "solar",
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        gender: "male",
        timeBasis: "civil",
      },
      normalized: {
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        calendarMode: "solar",
        timeBasis: "civil",
      },
    });

    expect(chart.raw.palaces).toHaveLength(9);
  });

  it("passes through supported qimen chart options", () => {
    const chart = buildChart({
      datetime: "2026-07-03T11:30",
      timeZone: "Asia/Shanghai",
      qimenSettings: {
        method: "default",
        solarTerm: "夏至",
        dunType: "yin",
        juNumber: 3,
        yearDivide: "normal",
      },
    });
    const direct = QimenChart.byDatetime("2026-07-03 11:30:00", {
      solarTerm: "夏至",
      isYangdun: false,
      juNumber: 3,
      yearDivide: "normal",
    }).toJSON();

    expect(chart.raw.timeInfo.solarTerm).toBe(direct.timeInfo.solarTerm);
    expect(chart.raw.ju.type).toBe(direct.ju.type);
    expect(chart.raw.ju.number).toBe(direct.ju.number);
    expect(chart.raw.fourPillars.hour).toEqual(direct.fourPillars.hour);
  });

  it("switches to the taobi adapter when using split method", () => {
    const chart = buildChart({
      datetime: "2026-07-06T23:30",
      timeZone: "Asia/Shanghai",
      qimenSettings: {
        method: "split",
        solarTerm: "auto",
        dunType: "auto",
        juNumber: "auto",
        yearDivide: "exact",
      },
    });

    expect(chart.engine).toBe("taobi");
    expect(chart.raw.timeInfo.solarTerm).toBe("夏至");
    expect(chart.raw.ju.type).toBe("阴遁");
    expect(chart.raw.ju.number).toBe(9);
    expect(chart.raw.zhiFu.position).toBe(9);
    expect(chart.raw.zhiShi.gate).toBe("惊门");
    expect(chart.raw.zhiShi.position).toBe(3);
  });
});
