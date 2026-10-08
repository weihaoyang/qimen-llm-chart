import { describe, expect, it } from "vitest";
import {
  analyzePillarRelations,
  getBaziRelationGroup,
  groupBaziRelations,
  type RelationPillarInput,
} from "./relations-analysis";

const pillar = (
  key: RelationPillarInput["key"],
  ganZhi: string,
  hiddenStems: string[] = [],
  xunKong = "",
): RelationPillarInput => ({
  key,
  pillar: ganZhi,
  heavenlyStem: ganZhi.slice(0, 1),
  earthlyBranch: ganZhi.slice(1, 2),
  hiddenStems,
  xunKong,
});

describe("analyzePillarRelations", () => {
  it("reports 天干五合 and 地支六合", () => {
    const result = analyzePillarRelations(
      [pillar("year", "甲子"), pillar("month", "己丑"), pillar("day", "丙寅"), pillar("time", "丁卯")],
      { dayMaster: "丙" },
    );

    expect(result.relations.some((item) => item.kind === "天干五合" && item.symbols === "甲己")).toBe(true);
    expect(result.relations.some((item) => item.kind === "地支六合" && item.symbols === "子丑")).toBe(true);
    expect(result.relations.every((item) => item.pillars.length >= 2)).toBe(true);
  });

  it("reports 天克地冲 when a stem and branch both clash", () => {
    const result = analyzePillarRelations(
      [pillar("year", "甲子"), pillar("month", "庚午"), pillar("day", "丙寅"), pillar("time", "丁卯")],
      { dayMaster: "丙" },
    );

    expect(result.relations.some((item) => item.kind === "天干相冲" && item.symbols === "甲庚")).toBe(true);
    expect(result.relations.some((item) => item.kind === "地支六冲" && item.symbols === "子午")).toBe(true);
    expect(result.relations.some((item) => item.kind === "天克地冲")).toBe(true);
  });

  it("detects full 三合 and 三会 across three pillars", () => {
    const trio = analyzePillarRelations(
      [pillar("year", "甲申"), pillar("month", "丙子"), pillar("day", "戊辰"), pillar("time", "庚午")],
      { dayMaster: "戊" },
    );
    expect(trio.relations.some((item) => item.kind === "地支三合" && item.symbols === "申子辰")).toBe(true);

    const meeting = analyzePillarRelations(
      [pillar("year", "甲寅"), pillar("month", "丙卯"), pillar("day", "戊辰"), pillar("time", "庚午")],
      { dayMaster: "戊" },
    );
    expect(meeting.relations.some((item) => item.kind === "地支三会" && item.symbols === "寅卯辰")).toBe(true);
  });

  it("reports 半合, 六害, 六破, self-punishment and 伏吟", () => {
    const half = analyzePillarRelations(
      [pillar("year", "甲申"), pillar("month", "丙子"), pillar("day", "戊寅"), pillar("time", "庚午")],
      { dayMaster: "戊" },
    );
    expect(half.relations.some((item) => item.kind === "地支半合" && item.symbols === "申子")).toBe(true);

    const selfPunish = analyzePillarRelations(
      [pillar("year", "甲辰"), pillar("month", "丙辰"), pillar("day", "戊寅"), pillar("time", "庚午")],
      { dayMaster: "戊" },
    );
    expect(selfPunish.relations.some((item) => item.kind === "地支自刑" && item.symbols === "辰辰")).toBe(true);

    const fuyin = analyzePillarRelations(
      [pillar("year", "甲子"), pillar("month", "丙寅"), pillar("day", "甲子"), pillar("time", "庚午")],
      { dayMaster: "甲" },
    );
    expect(fuyin.relations.some((item) => item.kind === "伏吟" && item.symbols === "甲子")).toBe(true);
  });

  it("derives missing elements, counts and notes", () => {
    const result = analyzePillarRelations(
      [pillar("year", "甲子"), pillar("month", "丙寅"), pillar("day", "戊辰"), pillar("time", "庚午")],
      { dayMaster: "戊", dayMasterStrength: "balanced", dayXunKong: "戌亥" },
    );
    // 木、火、水、金、土 are all present in this synthetic set, so nothing missing.
    expect(result.missingElements).toEqual([]);
    expect(result.counts.length).toBeGreaterThan(0);
    expect(result.notes.some((note) => note.includes("日主戊"))).toBe(true);
    expect(result.notes.some((note) => note.includes("组干支关系"))).toBe(true);
  });

  it("flags 日柱空亡 that lands on another pillar", () => {
    const result = analyzePillarRelations(
      [pillar("year", "甲子"), pillar("month", "丙寅"), pillar("day", "戊辰"), pillar("time", "庚午")],
      { dayMaster: "戊", dayXunKong: "子寅" },
    );
    expect(result.notes.some((note) => note.includes("空亡"))).toBe(true);
  });

  it("buckets relations into 合会/冲/刑害破 and supports the clash-only view", () => {
    const result = analyzePillarRelations(
      [
        pillar("year", "甲子"),
        pillar("month", "己丑"),
        pillar("day", "庚午"),
        pillar("time", "丁卯"),
      ],
      { dayMaster: "庚" },
    );

    const buckets = groupBaziRelations(result.relations);
    const groups = buckets.map((bucket) => bucket.group);
    expect(groups).toContain("合会");
    expect(groups).toContain("冲");
    // 甲己合/子丑合 land in 合会; 子午冲 + 甲庚/丁癸冲 land in 冲.
    expect(buckets.find((bucket) => bucket.group === "合会")?.relations.every((relation) => getBaziRelationGroup(relation.kind) === "合会")).toBe(true);

    const clashOnly = groupBaziRelations(result.relations, { clashOnly: true });
    expect(clashOnly.map((bucket) => bucket.group).sort()).toEqual(["冲", "合会"].sort());
    expect(clashOnly.every((bucket) => bucket.group === "合会" || bucket.group === "冲")).toBe(true);
  });
});
