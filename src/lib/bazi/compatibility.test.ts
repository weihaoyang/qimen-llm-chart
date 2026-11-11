import { describe, expect, it } from "vitest";
import { normalizeProfileInput } from "@/lib/profile/normalize";
import { buildBaziChartFromProfile } from "./chart";
import { buildBaziCompatibility } from "./compatibility";

const chart = (date: string) => buildBaziChartFromProfile(normalizeProfileInput({
  calendarMode: "solar", datetime: `${date}T12:00`, timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil",
}));

describe("cross-chart stem and branch control", () => {
  it("compares day pillars under both broad and four-stem-clash readings", () => {
    const jiaZi = chart("2024-10-27");
    expect(jiaZi.raw.baZi[2]).toBe("甲子");
    for (const [date, expected, label] of [
      ["2024-10-21", "戊午", "不属天干四冲"],
      ["2024-11-02", "庚午", "也属天干四冲"],
    ] as const) {
      const other = chart(date);
      expect(other.raw.baZi[2]).toBe(expected);
      const value = buildBaziCompatibility(jiaZi, other);
      const hit = value.relations.find(item => item.type === "天克地冲" && item.left === "日柱" && item.right === "日柱");
      expect(hit?.detail).toContain(label);
    }
    const bingWu = chart("2024-10-09");
    expect(bingWu.raw.baZi[2]).toBe("丙午");
    expect(buildBaziCompatibility(jiaZi, bingWu).relations.some(item => item.type === "天克地冲" && item.left === "日柱" && item.right === "日柱")).toBe(false);
  });
});
