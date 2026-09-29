import { describe, expect, it } from "vitest";
import { buildZiweiChartFromProfile } from "./chart";
import { buildZiweiInsights } from "./insights";

const profile = {
  original: {
    calendarMode: "solar" as const,
    datetime: "2026-07-03T11:30",
    timeZone: "Asia/Shanghai",
    gender: "female" as const,
    timeBasis: "civil" as const,
  },
  normalized: {
    datetime: "2026-07-03T11:30",
    timeZone: "Asia/Shanghai",
    calendarMode: "solar" as const,
    timeBasis: "civil" as const,
  },
};

describe("buildZiweiInsights", () => {
  it("recognizes auxiliary stars from iztro minor-star data and preserves palace relationships", () => {
    const chart = buildZiweiChartFromProfile(profile);
    const palaces = chart.raw.palaces;
    const ming = palaces.find((palace) => palace.earthlyBranch === chart.raw.earthlyBranchOfSoulPalace);

    expect(ming).toBeDefined();
    expect(palaces.some((palace) => palace.minorStars.some((star) => star.name === "禄存"))).toBe(true);
    expect(palaces.some((palace) => palace.minorStars.some((star) => star.name === "火星"))).toBe(true);
    expect(palaces.some((palace) => palace.minorStars.some((star) => star.name === "铃星"))).toBe(true);
    expect(ming?.sanFangSiZheng).toEqual(chart.raw.sanFangSiZheng);
    expect(chart.raw.emptyPalaces.length).toBeGreaterThan(0);
    expect(chart.raw.emptyPalaces.every((item) => item.oppositePalace && item.borrowedStars.length >= 0)).toBe(true);
  });

  it("does not combine贪狼 with a fire star outside命宫三方四正", () => {
    const chart = buildZiweiChartFromProfile(profile);
    const mingBranch = chart.raw.palaces.find((palace) => palace.isOriginalPalace)?.branchIndex ?? 0;
    const inSanFang = new Set([mingBranch, (mingBranch + 4) % 12, (mingBranch + 8) % 12, (mingBranch + 6) % 12]);
    const palaces = chart.raw.palaces.map((palace) => ({
      ...palace,
      majorStars: palace.majorStars.filter((star) => star.name !== "贪狼"),
      minorStars: palace.minorStars.filter((star) => star.name !== "火星"),
    }));
    const tanLangPalace = palaces.find((palace) => inSanFang.has(palace.branchIndex));
    const outsidePalace = palaces.find((palace) => !inSanFang.has(palace.branchIndex));

    expect(tanLangPalace).toBeDefined();
    expect(outsidePalace).toBeDefined();
    tanLangPalace!.majorStars = [...tanLangPalace!.majorStars, { name: "贪狼" }];
    outsidePalace!.minorStars = [...outsidePalace!.minorStars, { name: "火星" }];

    const insights = buildZiweiInsights({ palaces, mingGongBranch: mingBranch, shenGongBranch: mingBranch });
    expect(insights.patterns.some((item) => item.id === "tan-huo")).toBe(false);
  });
});
