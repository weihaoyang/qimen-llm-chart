import { describe, expect, it } from "vitest";
import { buildChart } from "./chart";
import type { QimenSettings } from "./settings";

const settingsFor: QimenSettings = {
  solarTerm: "auto",
  dunType: "auto",
  juNumber: "auto",
  yearDivide: "exact",
};

/** 采样时刻覆盖：冬至后、夏至后、23:00–24:00 子时、非子时、农历闰六月。 */
const SAMPLES = [
  { datetime: "2026-01-05T00:30", term: "冬至", dayGanZhi: "己卯", hourGanZhi: "甲子", yuan: "上元", ju: "阳遁1", zhiFu: "天蓬@1", zhiShi: "休门@1" },
  { datetime: "2026-01-20T23:30", term: "大寒", dayGanZhi: "乙未", hourGanZhi: "丙子", yuan: "上元", ju: "阳遁3", zhiFu: "天辅@1", zhiShi: "杜门@6" },
  { datetime: "2026-02-10T12:30", term: "立春", dayGanZhi: "乙卯", hourGanZhi: "壬午", yuan: "中元", ju: "阳遁5", zhiFu: "天心@9", zhiShi: "开门@2" },
  { datetime: "2026-03-25T09:30", term: "春分", dayGanZhi: "戊戌", hourGanZhi: "丁巳", yuan: "上元", ju: "阳遁3", zhiFu: "天任@9", zhiShi: "生门@2" },
  { datetime: "2026-06-25T12:30", term: "夏至", dayGanZhi: "庚午", hourGanZhi: "壬午", yuan: "中元", ju: "阴遁3", zhiFu: "天芮@8", zhiShi: "死门@3" },
  { datetime: "2026-07-06T23:30", term: "夏至", dayGanZhi: "壬午", hourGanZhi: "庚子", yuan: "上元", ju: "阴遁9", zhiFu: "天心@7", zhiShi: "开门@9" },
  { datetime: "2026-07-20T05:30", term: "小暑", dayGanZhi: "乙未", hourGanZhi: "己卯", yuan: "上元", ju: "阴遁8", zhiFu: "天柱@7", zhiShi: "惊门@2" },
  { datetime: "2026-08-07T18:30", term: "大暑", dayGanZhi: "癸丑", hourGanZhi: "辛酉", yuan: "上元", ju: "阴遁7", zhiFu: "天芮@4", zhiShi: "死门@4" },
  { datetime: "2026-08-23T00:30", term: "立秋", dayGanZhi: "己巳", hourGanZhi: "甲子", yuan: "中元", ju: "阴遁5", zhiFu: "天禽@2", zhiShi: "死门@2" },
  { datetime: "2026-09-23T12:30", term: "秋分", dayGanZhi: "庚子", hourGanZhi: "壬午", yuan: "中元", ju: "阴遁1", zhiFu: "天英@6", zhiShi: "景门@1" },
  { datetime: "2026-10-08T23:30", term: "寒露", dayGanZhi: "丙辰", hourGanZhi: "戊子", yuan: "中元", ju: "阴遁9", zhiFu: "天柱@9", zhiShi: "惊门@3" },
  { datetime: "2026-11-25T15:30", term: "小雪", dayGanZhi: "癸卯", hourGanZhi: "庚申", yuan: "中元", ju: "阴遁8", zhiFu: "天冲@6", zhiShi: "伤门@6" },
  { datetime: "2026-12-25T00:30", term: "冬至", dayGanZhi: "癸酉", hourGanZhi: "壬子", yuan: "中元", ju: "阳遁7", zhiFu: "天芮@2", zhiShi: "死门@1" },
  { datetime: "2025-08-01T12:30", term: "大暑", dayGanZhi: "壬寅", hourGanZhi: "丙午", yuan: "中元", ju: "阴遁1", zhiFu: "天心@3", zhiShi: "开门@4" },
] as const;

describe("qimen ju methods", () => {
  it("pins the production 3meta chart outputs", () => {
    for (const sample of SAMPLES) {
      const chart = buildChart({
        datetime: sample.datetime,
        timeZone: "Asia/Shanghai",
        qimenSettings: settingsFor,
      });

      expect(chart.engine, sample.datetime).toBe("3meta");
      expect(chart.raw.timeInfo.solarTerm, sample.datetime).toBe(sample.term);
      expect(
        `${chart.raw.fourPillars.day.stem}${chart.raw.fourPillars.day.branch}`,
        sample.datetime,
      ).toBe(sample.dayGanZhi);
      expect(
        `${chart.raw.fourPillars.hour.stem}${chart.raw.fourPillars.hour.branch}`,
        sample.datetime,
      ).toBe(sample.hourGanZhi);
      expect(String(chart.raw.yuan), sample.datetime).toBe(sample.yuan);
      expect(
        `${chart.raw.ju.type}${chart.raw.ju.number}`,
        sample.datetime,
      ).toBe(sample.ju);
      expect(
        `${chart.raw.zhiFu.star}@${chart.raw.zhiFu.position}`,
        sample.datetime,
      ).toBe(sample.zhiFu);
      expect(
        `${chart.raw.zhiShi.gate}@${chart.raw.zhiShi.position}`,
        sample.datetime,
      ).toBe(sample.zhiShi);
      expect(Object.keys(chart.hiddenStemsByPalace).length, sample.datetime).toBeGreaterThan(0);
      expect(
        chart.raw.specialPatterns.auspiciousPatterns?.length ?? 0,
        sample.datetime,
      ).toBeGreaterThan(0);
    }
  });
});
