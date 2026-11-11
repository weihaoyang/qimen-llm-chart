import { describe, expect, it } from "vitest";
import {
  analyzePillarRelations,
  branchRelations,
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
  it("matches all ordered branch pairs against the six-break table and identifies the alternate four-pair source", () => {
    const branches = "子丑寅卯辰巳午未申酉戌亥";
    const pairs = ["子酉", "丑辰", "寅亥", "卯午", "巳申", "未戌"];
    for (const a of branches) for (const b of branches) {
      const match = pairs.some(pair => pair.includes(a) && pair.includes(b) && a !== b);
      const relations = branchRelations(a, b);
      const broken = relations.find(item => item.kind === "地支六破");
      expect(Boolean(broken), `${a}${b}`).toBe(match);
      if (broken) {
        const simultaneous = ["寅亥", "巳申"].some(pair => pair.includes(a) && pair.includes(b));
        expect(broken.detail.includes("《三命通会》破煞条对四生支不取")).toBe(simultaneous);
        expect(relations.some(item => item.kind === "地支六合")).toBe(simultaneous);
      }
    }
  });
  it("reports 天干五合 and 地支六合", () => {
    const result = analyzePillarRelations(
      [pillar("year", "甲子"), pillar("month", "己丑"), pillar("day", "丙寅"), pillar("time", "丁卯")],
      { dayMaster: "丙" },
    );

    expect(result.relations.some((item) => item.kind === "天干五合" && item.symbols === "甲己")).toBe(true);
    expect(result.relations.some((item) => item.kind === "地支六合" && item.symbols === "子丑")).toBe(true);
    for (const relation of result.relations.filter(item => item.kind === "天干五合" || item.kind === "地支六合")) {
      expect(relation.detail).toContain("是否化成需另查条件");
      expect(relation.detail).not.toContain("合化为");
      expect(relation.tone).toBe("neutral");
    }
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

  it("checks broad stem control plus opposite branches for all 60×60 valid pillars", () => {
    const stems = "甲乙丙丁戊己庚辛壬癸";
    const branches = "子丑寅卯辰巳午未申酉戌亥";
    const pillars = Array.from({ length: 60 }, (_, i) => stems[i % 10] + branches[i % 12]);
    for (let i = 0; i < 60; i++) for (let j = 0; j < 60; j++) {
      const first = pillars[i], second = pillars[j];
      const elementGap = (Math.floor((j % 10) / 2) - Math.floor((i % 10) / 2) + 5) % 5;
      const expected = (elementGap === 2 || elementGap === 3) && (j - i + 60) % 12 === 6;
      const found = analyzePillarRelations([pillar("year", first), pillar("day", second)], { dayMaster: second[0] }).relations
        .find(item => item.kind === "天克地冲");
      expect(Boolean(found), `${first}/${second}`).toBe(expected);
    }
    const get = (a: string, b: string) => analyzePillarRelations([pillar("year", a), pillar("day", b)], { dayMaster: b[0] }).relations
      .find(item => item.kind === "天克地冲");
    expect(get("甲子", "戊午")?.detail).toContain("不属天干四冲");
    expect(get("甲子", "庚午")?.detail).toContain("属天干四冲");
    expect(get("甲子", "丙午")).toBeUndefined();
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

  it("retains distinct pillar combinations even when their three branch symbols repeat", () => {
    const result = analyzePillarRelations(
      [pillar("year", "甲申"), pillar("month", "丙申"), pillar("day", "戊子"), pillar("time", "壬辰")],
      { dayMaster: "戊" },
    );
    const trios = result.relations.filter(item => item.kind === "地支三合");
    expect(trios).toHaveLength(2);
    expect(trios.map(item => item.pillars)).toEqual([["year", "day", "time"], ["month", "day", "time"]]);
    expect(result.counts.find(item => item.kind === "地支三合")?.count).toBe(2);
  });

  it("counts relationship categories by kind and does not double-count a six-clash pair as two branch clashes", () => {
    const result = analyzePillarRelations(
      [pillar("year", "甲子"), pillar("month", "己丑"), pillar("day", "庚午"), pillar("time", "丁卯")],
      { dayMaster: "庚" },
    );
    const count = (group: string) => result.relations.filter(item => getBaziRelationGroup(item.kind) === group).length;
    const note = result.notes.find(item => item.includes("干支关系记录"))!;
    expect(note).toContain(`合会 ${count("合会")} 条`);
    expect(note).toContain(`冲 ${count("冲")} 条`);
    expect(note).toContain(`刑害破 ${count("刑害破")} 条`);
    expect(note).toContain(`其他 ${count("其他")} 条`);
    expect(result.notes).toContain("地支六冲涉及 1 对柱位；天克地冲是可同时出现的复合标记。");
  });

  it.each([
    ["申子辰", "地支三合"], ["亥卯未", "地支三合"], ["寅午戌", "地支三合"], ["巳酉丑", "地支三合"],
    ["寅卯辰", "地支三会"], ["巳午未", "地支三会"], ["申酉戌", "地支三会"], ["亥子丑", "地支三会"],
  ] as const)("requires three distinct branches for %s %s", (group, kind) => {
    const analyze = (branches: string) => analyzePillarRelations(
      (["year", "month", "day", "time"] as const).map((key, i) => pillar(key, "甲" + branches[i])),
      { dayMaster: "甲" },
    ).relations;
    expect(analyze(group + group[0]).some(item => item.kind === kind && new Set(item.symbols).size === 3)).toBe(true);
    const incomplete = group[0] + group[0] + group[1] + group[1];
    expect(analyze(incomplete).some(item => item.kind === "地支三合" || item.kind === "地支三会")).toBe(false);
  });

  it.each([
    ["申", "辰", "子"], ["亥", "未", "卯"], ["寅", "戌", "午"], ["巳", "丑", "酉"],
  ] as const)("records %s%s as an arch only while %s is absent", (left, right, middle) => {
    const extra = [..."子丑寅卯辰巳午未申酉戌亥"].find(branch => branch !== left && branch !== right && branch !== middle)!;
    const calc = (fourth: string) => analyzePillarRelations([
      pillar("year", "甲" + left), pillar("month", "丙" + right),
      pillar("day", "戊" + extra), pillar("time", "庚" + fourth),
    ], { dayMaster: "戊" }).relations;
    const match = calc(extra).find(item => item.kind === "地支拱合" && item.pillars.join(",") === "year,month");
    expect(match?.detail).toContain(`虚拱${middle}`);
    expect(match?.detail).toContain("不等于成局或化气");
    expect(calc(middle).some(item => item.kind === "地支拱合" && item.pillars.join(",") === "year,month")).toBe(false);
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
    expect(result.notes.some((note) => note.includes("干支关系记录"))).toBe(true);
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
