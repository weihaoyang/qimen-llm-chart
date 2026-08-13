import { describe, expect, it } from "vitest";
import { buildBaziStructureAudit } from "./structure-audit";
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
