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

  it("degrades retired split/maoshan settings to the default 3meta chart", () => {
    const input = {
      datetime: "2026-07-06T23:30",
      timeZone: "Asia/Shanghai",
    } as const;
    // `copyright.generatedAt` 是出盘时间戳，比较盘面时剔除它。
    const stableRaw = (chart: ReturnType<typeof buildChart>) => {
      const { copyright: _copyright, ...raw } = chart.raw as ReturnType<typeof buildChart>["raw"] & {
        copyright?: unknown;
      };
      return { raw, hiddenStemsByPalace: chart.hiddenStemsByPalace };
    };
    const defaultChart = buildChart({
      ...input,
      qimenSettings: {
        method: "default",
        solarTerm: "auto",
        dunType: "auto",
        juNumber: "auto",
        yearDivide: "exact",
      },
    });

    for (const method of ["split", "maoshan"] as const) {
      const chart = buildChart({
        ...input,
        qimenSettings: {
          method,
          solarTerm: "auto",
          dunType: "auto",
          juNumber: "auto",
          yearDivide: "exact",
        },
      });

      // 产线只有一条引擎路径：历史设置不再触发跨引擎盘，也不再缺暗干/格局。
      expect(chart.engine).toBe("3meta");
      expect(stableRaw(chart)).toEqual(stableRaw(defaultChart));
      // 生效口径回写为 default，避免下游把 3meta 盘当成跨引擎对照盘解释。
      expect(chart.input.qimenSettings?.method).toBe("default");
    }
  });
});
