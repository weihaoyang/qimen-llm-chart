import { describe, expect, it } from "vitest";
import { buildBaziStructureAudit, computeStrengthBreakdown, DEFAULT_STRENGTH_FACTORS } from "./structure-audit";
import type { BaziPillarDetail } from "./types";

const pillar = (
  key: BaziPillarDetail["key"],
  heavenlyStem: string,
  earthlyBranch: string,
  hiddenStems: string[],
  shenSha: string[] = [],
): BaziPillarDetail => ({
  key, pillar: heavenlyStem + earthlyBranch, heavenlyStem, earthlyBranch, hiddenStems,
  wuXing: "", naYin: "", shiShenGan: "", shiShenZhi: [], diShi: "", xun: "", xunKong: "", shenSha,
});

describe("buildBaziStructureAudit", () => {
  it("records roots as a hard counter-evidence to a pure follow-weak claim", () => {
    const audit = buildBaziStructureAudit([
      pillar("year", "甲", "子", ["癸"]),
      pillar("month", "庚", "申", ["庚", "壬", "戊"]),
      pillar("day", "戊", "辰", ["戊", "乙", "癸"]),
      pillar("time", "己", "未", ["己", "丁", "乙"], ["禄神"]),
    ], "戊", ["海中金"], "丙午", "壬子");

    expect(audit.rootCount).toBeGreaterThan(0);
    expect(audit.followStructure).toBe("not-supported");
    expect(audit.contradictingEvidence.join(" ")).toContain("不支持判为纯从弱");
    expect(audit.luMingFeatures.some((item) => item.name === "禄神")).toBe(true);
  });

  it("keeps a possible follow-weak chart explicitly low-confidence", () => {
    const audit = buildBaziStructureAudit([
      pillar("year", "庚", "申", ["庚", "壬", "戊"]),
      pillar("month", "庚", "申", ["庚", "壬", "戊"]),
      pillar("day", "甲", "午", ["丁", "己"]),
      pillar("time", "庚", "申", ["庚", "壬", "戊"]),
    ], "甲", ["石榴木"], "丙午", "壬子");

    expect(audit.dayMasterStrength).toBe("extreme-weak");
    expect(["follow-weak-candidate", "follow-officer-killing-candidate"]).toContain(audit.followStructure);
    expect(audit.confidence).toBeLessThan(50);
  });

  it("treats the opposite-polarity stem of the same element as a real root", () => {
    const audit = buildBaziStructureAudit([
      pillar("year", "庚", "申", ["庚", "壬", "戊"]),
      pillar("month", "庚", "申", ["庚", "壬", "戊"]),
      pillar("day", "甲", "未", ["己", "丁", "乙"]),
      pillar("time", "庚", "申", ["庚", "壬", "戊"]),
    ], "甲", ["石榴木"], "丙午", "壬子");

    expect(audit.rootCount).toBe(1);
    expect(audit.followStructure).toBe("not-supported");
    expect(audit.supportingEvidence.join(" ")).toContain("同五行根");
  });

  it("separates a concentrated wealth-follow candidate from generic follow-weak", () => {
    const audit = buildBaziStructureAudit([
      pillar("year", "戊", "丑", ["己", "癸", "辛"]),
      pillar("month", "戊", "戌", ["戊", "辛", "丁"]),
      pillar("day", "甲", "午", ["丁", "己"]),
      pillar("time", "己", "丑", ["己", "癸", "辛"]),
    ], "甲", ["大林木"], "丙午", "壬子");

    expect(audit.followStructure).toBe("follow-wealth-candidate");
    expect(audit.supportingEvidence.join(" ")).toContain("财星最集中");
  });
});

describe("strength sandbox combination membership", () => {
  it.each([
    ["申子辰", "三合", "水", "water"], ["亥卯未", "三合", "木", "wood"],
    ["寅午戌", "三合", "火", "fire"], ["巳酉丑", "三合", "金", "metal"],
    ["寅卯辰", "三会", "木", "wood"], ["巳午未", "三会", "火", "fire"],
    ["申酉戌", "三会", "金", "metal"], ["亥子丑", "三会", "水", "water"],
  ] as const)("includes %s %s in four-pillar sandbox once", (group, kind, element, key) => {
    const makePillars = (branches: string) => (["year", "month", "day", "time"] as const)
      .map((position, index) => pillar(position, "甲", branches[index], []));
    const factors = { ...DEFAULT_STRENGTH_FACTORS, combinations: true };
    const detail = `地支${kind} ${group} → ${element}权重试算`;
    // Fourth pillar duplicates a member: one completed group, not four separate groups.
    const full = computeStrengthBreakdown(makePillars(group + group[0]), "甲", factors);
    expect(full.combinationDetails.filter(item => item === detail)).toHaveLength(1);
    expect(full.contributions.find(item => item.factor === "combinations")?.elements[key]).toBeGreaterThanOrEqual(1.5);
    expect(full.contributions.find(item => item.factor === "combinations")?.detail).toContain("不等同合化成立");
    const incomplete = computeStrengthBreakdown(makePillars(group[0] + group[1] + group[0] + group[1]), "甲", factors);
    expect(incomplete.combinationDetails).not.toContain(detail);
    const disabled = computeStrengthBreakdown(makePillars(group + group[0]), "甲", DEFAULT_STRENGTH_FACTORS);
    expect(disabled.combinationDetails).toEqual([]);
  });
});
