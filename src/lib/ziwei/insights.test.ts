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
  it("identifies Lu Cun and the actual natal transformation stars separately", () => {
    const { raw } = buildZiweiChartFromProfile(profile);
    const mingBranch = raw.palaces.find(p => p.isOriginalPalace)!.branchIndex;
    for (const scenario of ["lu-cun", "transformed", "both", "none"] as const) {
      const palaces = structuredClone(raw.palaces);
      const ming = palaces.find(p => p.branchIndex === mingBranch)!;
      for (const key of ["majorStars", "minorStars", "adjectiveStars"] as const) {
        ming[key] = ming[key].filter(s => s.name !== "禄存").map(s => ({ ...s, mutagen: undefined }));
      }
      if (scenario === "lu-cun" || scenario === "both") ming.minorStars.push({ name: "禄存" });
      if (scenario === "transformed" || scenario === "both") {
        ming.majorStars.push({ name: "天同", mutagen: "禄" });
        ming.minorStars.push({ name: "文曲", mutagen: "忌" });
      }
      const result = buildZiweiInsights({ palaces, mingGongBranch: mingBranch, shenGongBranch: mingBranch });
      const lu = result.patterns.find(p => p.id === "lu-ru-ming");
      const ji = result.patterns.find(p => p.id === "ji-ru-ming");
      expect(Boolean(lu)).toBe(scenario !== "none");
      expect(lu?.evidence.includes("禄存=同宫") ?? false).toBe(scenario === "lu-cun" || scenario === "both");
      expect(lu?.evidence.includes("天同=生年化禄") ?? false).toBe(scenario === "transformed" || scenario === "both");
      expect(ji?.evidence.includes("文曲=生年化忌") ?? false).toBe(scenario === "transformed" || scenario === "both");
    }
  });

  it("reports Zi Fu co-location as a fact without assigning an unconditional highest rating", () => {
    const { raw } = buildZiweiChartFromProfile(profile);
    const mingBranch = raw.palaces.find(p => p.isOriginalPalace)!.branchIndex;
    const palaces = structuredClone(raw.palaces);
    for (const palace of palaces) palace.majorStars = palace.majorStars.filter(s => s.name !== "紫微" && s.name !== "天府");
    const ming = palaces.find(p => p.branchIndex === mingBranch)!;
    ming.majorStars.push({ name: "紫微", mutagen: "忌" }, { name: "天府" });
    ming.minorStars.push({ name: "擎羊" });
    const result = buildZiweiInsights({ palaces, mingGongBranch: mingBranch, shenGongBranch: mingBranch });
    const combination = result.patterns.find(p => p.id === "zi-fu-tong-gong")!;
    expect(combination.level).toBe("neutral");
    expect(combination.source).toContain("安天府图");
    expect(combination.summary).toContain("结构事实");
    ming.majorStars = ming.majorStars.filter(s => s.name !== "天府");
    expect(buildZiweiInsights({ palaces, mingGongBranch: mingBranch, shenGongBranch: mingBranch }).patterns.some(p => p.id === "zi-fu-tong-gong")).toBe(false);
  });

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
    expect(insights.patterns.some((item) => item.id === "tan-huo" || item.id === "tan-huo-meeting")).toBe(false);
  });
});


it("requires both stars in the life palace with temple or prosperous brightness for Tan Huo", () => {
  const chart = buildZiweiChartFromProfile(profile);
  const mingBranch = chart.raw.palaces.find(p => p.earthlyBranch === chart.raw.earthlyBranchOfSoulPalace)!.branchIndex;
  const cases = [
    [0, 0, "庙", "旺", true],
    [0, 0, "旺", "庙", true],
    [0, 4, "庙", "旺", false],
    [4, 4, "庙", "旺", false],
    [0, 0, "陷", "庙", false],
    [0, 0, "庙", "利", false],
    [0, 0, "庙", undefined, false],
  ] as const;
  for (const [tanOffset, huoOffset, tanBrightness, huoBrightness, expected] of cases) {
    const palaces = structuredClone(chart.raw.palaces);
    for (const palace of palaces) {
      palace.majorStars = palace.majorStars.filter(s => s.name !== "贪狼");
      palace.minorStars = palace.minorStars.filter(s => s.name !== "火星");
    }
    palaces.find(p => p.branchIndex === (mingBranch + tanOffset) % 12)!.majorStars.push({ name: "贪狼", brightness: tanBrightness });
    palaces.find(p => p.branchIndex === (mingBranch + huoOffset) % 12)!.minorStars.push({ name: "火星", brightness: huoBrightness });
    const result = buildZiweiInsights({ palaces, mingGongBranch: mingBranch, shenGongBranch: mingBranch });
    expect(result.patterns.some(p => p.id === "tan-huo")).toBe(expected);
    if (expected) {
      expect(result.patterns.find(p => p.id === "tan-huo")?.summary).toContain("现用亮度表");
      expect(result.patterns.find(p => p.id === "tan-huo")?.source).toContain("iztro");
    }
    expect(result.patterns.some(p => p.id === "tan-huo-meeting")).toBe(true);
    expect(result.patterns.find(p => p.id === "tan-huo-meeting")?.name).toBe("贪狼会火星");
  }
});


it("distinguishes real same-palace examples that do and do not meet the chosen brightness clause", () => {
  for (const [datetime, branch, tanBrightness, expected] of [
    ["1990-03-15T02:00", "寅", "平", false],
    ["1990-07-15T18:00", "戌", "庙", true],
  ] as const) {
    const input = structuredClone(profile);
    input.original.datetime = datetime;
    input.normalized.datetime = datetime;
    const { raw } = buildZiweiChartFromProfile(input);
    const ming = raw.palaces.find(p => p.earthlyBranch === raw.earthlyBranchOfSoulPalace)!;
    expect(ming.earthlyBranch).toBe(branch);
    expect(ming.majorStars.find(s => s.name === "贪狼")?.brightness).toBe(tanBrightness);
    expect(ming.minorStars.find(s => s.name === "火星")?.brightness).toBe("庙");
    expect(raw.patterns.some(p => p.id === "tan-huo")).toBe(expected);
    expect(raw.patterns.some(p => p.id === "tan-huo-meeting")).toBe(true);
  }
});


it("does not turn a generic Ji Liang or Sun Moon co-location into an auspicious judgement", () => {
  const chart = buildZiweiChartFromProfile(profile);
  const mingBranch = chart.raw.palaces.find(p => p.earthlyBranch === chart.raw.earthlyBranchOfSoulPalace)!.branchIndex;
  for (const [stars, id] of [
    [["天机", "天梁"], "ji-liang-tong-gong"],
    [["太阳", "太阴"], "ri-yue-tong-gong"],
  ] as const) {
    for (const offset of [0, 3]) {
      const palaces = structuredClone(chart.raw.palaces);
      for (const palace of palaces) palace.majorStars = palace.majorStars.filter(s => !stars.some(name => name === s.name));
      const target = palaces.find(p => p.branchIndex === (mingBranch + offset) % 12)!;
      target.majorStars.push({ name: stars[0], brightness: "陷", mutagen: "忌" }, { name: stars[1], brightness: "平" });
      target.minorStars.push({ name: "擎羊" });
      const result = buildZiweiInsights({ palaces, mingGongBranch: mingBranch, shenGongBranch: mingBranch });
      const combination = result.patterns.find(p => p.id === id)!;
      expect(combination.level).toBe("neutral");
      expect(combination.evidence).toContain(`所在宫是否命宫=${offset === 0 ? "是" : "否"}`);
      expect(combination.evidence).toContain(`${stars[0]}亮度=陷`);
      expect(combination.summary).toContain("结构事实");
    }
  }
});
