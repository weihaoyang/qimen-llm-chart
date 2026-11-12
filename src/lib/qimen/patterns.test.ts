import { describe, expect, it } from "vitest";
import type { NormalizedQimenChart } from "./types";
import { QIMEN_PATTERN_CATALOG, evaluateQimenPatterns } from "./patterns";

const palace = (position: number, overrides: Record<string, unknown> = {}) => ({
  position,
  heavenlyStem: "无",
  earthlyStem: "无",
  earthBranch: "无",
  gate: "无门",
  deity: "无神",
  gatePressure: "无",
  fiveElements: "土",
  status: { star: "相", gate: "相" },
  isZhiFu: false,
  liuYiJiXing: { hasJiXing: false },
  ...overrides,
});

const fourPillars = {
  year: { stem: "甲", branch: "子" },
  month: { stem: "丙", branch: "寅" },
  day: { stem: "戊", branch: "辰" },
  hour: { stem: "乙", branch: "卯" },
};

const chartWith = (
  palaces: unknown[],
  options: { zhiShi?: number; zhiFu?: number; wuBuYuShi?: boolean; fourPillars?: unknown } = {},
) =>
  ({
    raw: {
      palaces,
      zhiShi: { position: options.zhiShi ?? 1, gate: "无门" },
      zhiFu: { position: options.zhiFu ?? 1, star: "天蓬", heavenlyStem: "戊" },
      specialPatterns: { wuBuYuShi: { isWuBuYuShi: Boolean(options.wuBuYuShi) } },
      fourPillars: options.fourPillars ?? fourPillars,
    },
  }) as unknown as NormalizedQimenChart;

const statusOf = (report: ReturnType<typeof evaluateQimenPatterns>, id: string) =>
  report.checks.find((check) => check.id === id)?.status;

describe("evaluateQimenPatterns", () => {
  it("separates 鬼遁 conditions in 旨归 verse and prose from the earlier variants", () => {
    const report = evaluateQimenPatterns(chartWith([
      palace(1, { heavenlyStem: "丁", earthlyStem: "乙", gate: "休门", deity: "九地" }),
      palace(8, { heavenlyStem: "辛", earthlyStem: "丁", gate: "杜门", deity: "九地" }),
      palace(2, { heavenlyStem: "丁", gate: "休门", deity: "太阴" }),
      palace(3, { heavenlyStem: "辛", earthlyStem: "丁", gate: "杜门", deity: "九地" }),
    ])).checks.find(item => item.id === "jiu_dun_gui")!;
    expect(report.positions).toEqual([1, 8]);
    expect(report.evidence[0]).toContain("丁休临九地（旨归九遁歌）");
    expect(report.evidence[1]).toContain("辛加地丁合休生杜临艮九地（旨归正文）");
    const overlap = evaluateQimenPatterns(chartWith([
      palace(8, { heavenlyStem: ["丁", "辛"], earthlyStem: "丁", gate: "休门", deity: "九地" }),
    ])).checks.find(item => item.id === "jiu_dun_gui")!;
    expect(overlap.positions).toEqual([8]);
    expect(overlap.evidence[0]).toContain("旨归九遁歌");
    expect(overlap.evidence[0]).toContain("旨归正文");
  });
  it("labels the separate star and gate interpretation and keeps overlapping evidence", () => {
    const check = evaluateQimenPatterns(chartWith([
      palace(6, { star: "天英", gate: "景门" }),
      palace(7, { star: "天英", gate: "休门" }),
      palace(9, { star: "天英", gate: "景门" }),
    ])).checks.find(p => p.id === "huo_ru_jin_xiang_star_gate")!;
    expect(check.positions).toEqual([6, 7]);
    expect(check.evidence[0]).toContain("天英临乾兑");
    expect(check.evidence[0]).toContain("景门临乾兑");
    expect(check.evidence[1]).toContain("天英临乾兑");
    const gate = evaluateQimenPatterns(chartWith([palace(7, { star: "天心", gate: "景门" })])).checks.find(p => p.id === "huo_ru_jin_xiang_star_gate")!;
    expect(gate.positions).toEqual([7]);
    expect(gate.evidence[0]).toContain("景门临乾兑");
    expect(evaluateQimenPatterns(chartWith([palace(6)])).checks.find(p => p.id === "huo_ru_jin_xiang_star_gate")?.status).toBe("未成立");
  });
  it("separates 金入火乡 by star from the 庚加丙 stem rule", () => {
    const report = evaluateQimenPatterns(chartWith([
      palace(9, { star: "天心", heavenlyStem: "乙", earthlyStem: "丁" }),
      palace(6, { star: "天柱", heavenlyStem: "庚", earthlyStem: "丙" }),
    ]));
    expect(report.checks.find(p => p.id === "jin_ru_huo_xiang_star")?.positions).toEqual([9]);
    expect(report.checks.find(p => p.id === "jin_ru_huo_xiang_star")?.evidence[0]).toContain("天心临离九宫");
    expect(report.checks.find(p => p.id === "tai_bai_ru_ying")?.positions).toEqual([6]);
    const pillar = evaluateQimenPatterns(chartWith([palace(9, { star: ["天柱", "天禽"] })]));
    expect(pillar.checks.find(p => p.id === "jin_ru_huo_xiang_star")?.evidence[0]).toContain("天柱临离九宫");
    expect(evaluateQimenPatterns(chartWith([palace(9, { star: "天英" })])).checks.find(p => p.id === "jin_ru_huo_xiang_star")?.status).toBe("未成立");
  });
  it("identifies the sourced 龙遁 clauses and retains both when they overlap", () => {
    const check = evaluateQimenPatterns(chartWith([
      palace(1, { heavenlyStem: "乙", earthlyStem: "癸", gate: "休门" }),
      palace(2, { heavenlyStem: "乙", earthlyStem: "癸", gate: "休门" }),
      palace(3, { heavenlyStem: "乙", earthlyStem: "癸", gate: "开门" }),
    ])).checks.find(item => item.id === "jiu_dun_long")!;
    expect(check.positions).toEqual([1, 2]);
    expect(check.evidence[0]).toContain("乙休临坎（艺术典704一云）");
    expect(check.evidence[0]).toContain("乙合三吉门临坎（艺术典704）");
    expect(check.evidence[0]).toContain("乙休临地癸（奇门吉格）");
    expect(check.evidence[1]).toContain("乙休临地癸（奇门吉格）");
    expect(check.evidence[1]).not.toContain("艺术典704一云");
    const onlyKan = evaluateQimenPatterns(chartWith([palace(1, { heavenlyStem: "乙", earthlyStem: "丁", gate: "休门" })])).checks.find(item => item.id === "jiu_dun_long")!;
    expect(onlyKan.evidence[0]).toContain("艺术典704一云");
    expect(onlyKan.evidence[0]).not.toContain("奇门吉格");
    const openKan = evaluateQimenPatterns(chartWith([palace(1, { heavenlyStem: "乙", earthlyStem: "丁", gate: "开门" })])).checks.find(item => item.id === "jiu_dun_long")!;
    expect(openKan.positions).toEqual([1]);
    expect(openKan.evidence[0]).toContain("乙合三吉门临坎（艺术典704）");
    expect(openKan.evidence[0]).not.toContain("一云");
  });
  it("records both Ren Dun textual variants without duplicating a palace", () => {
    const check = evaluateQimenPatterns(chartWith([
      palace(1, { heavenlyStem: "丁", earthlyStem: "己", gate: "休门", deity: "太阴" }),
      palace(2, { heavenlyStem: "丁", earthlyStem: "丙", gate: "休门", deity: "白虎" }),
      palace(3, { heavenlyStem: "丁", earthlyStem: "丙", gate: "休门", deity: "太阴" }),
      palace(4, { heavenlyStem: "丁", earthlyStem: "丙", gate: "开门", deity: "太阴" }),
      palace(6, { heavenlyStem: "丙", earthlyStem: "丁", gate: "休门", deity: "白虎" }),
    ])).checks.find(item => item.id === "jiu_dun_ren")!;
    expect(check.positions).toEqual([1, 2, 3]);
    expect(check.evidence[0]).toContain("艺术典705");
    expect(check.evidence[0]).not.toContain("艺术典707");
    expect(check.evidence[1]).toContain("艺术典707");
    expect(check.evidence[1]).not.toContain("艺术典705");
    expect(check.evidence[2]).toContain("艺术典705");
    expect(check.evidence[2]).toContain("艺术典707");
  });
  it("retains both sourced 天遁 stem pairings with their actual evidence", () => {
    const report = evaluateQimenPatterns(chartWith([
      palace(1, { heavenlyStem: "丙", earthlyStem: "丁", gate: "生门" }),
      palace(4, { heavenlyStem: "丙", earthlyStem: "戊", gate: "生门" }),
      palace(8, { heavenlyStem: "丙", earthlyStem: ["丁", "戊"], gate: "生门" }),
      palace(9, { heavenlyStem: "丙", earthlyStem: "戊", gate: "开门" }),
    ]));
    const check = report.checks.find(p => p.id === "jiu_dun_tian")!;
    expect(check.positions).toEqual([1, 4, 8]);
    expect(check.evidence[0]).toContain("丙生临地丁");
    expect(check.evidence[1]).toContain("丙生临地戊（行军要略）");
    expect(check.evidence[2]).toContain("丙生临地丁");
    expect(check.evidence[2]).toContain("丙生临地戊（行军要略）");
  });
  it("distinguishes the three-gate heavenly escape variant from the 生门 and 戊 versions", () => {
    const check = evaluateQimenPatterns(chartWith([
      palace(1, { heavenlyStem: "丙", earthlyStem: "丁", gate: "开门" }),
      palace(2, { heavenlyStem: "丙", earthlyStem: "丁", gate: "休门" }),
      palace(3, { heavenlyStem: "丙", earthlyStem: "丁", gate: "杜门" }),
      palace(4, { heavenlyStem: "丙", earthlyStem: "戊", gate: "开门" }),
      palace(5, { heavenlyStem: "乙", earthlyStem: "丁", gate: "开门" }),
    ])).checks.find(p => p.id === "jiu_dun_tian")!;
    expect(check.positions).toEqual([1, 2]);
    expect(check.evidence[0]).toContain("丙开门临地丁（九遁变化法）");
    expect(check.evidence[1]).toContain("丙休门临地丁（九遁变化法）");
  });
  it("distinguishes the 风遁 乙 and 丙 variant conditions", () => {
    const one = evaluateQimenPatterns(chartWith([palace(4, { heavenlyStem: "乙", gate: "休门" })]));
    expect(one.checks.find(p => p.id === "jiu_dun_feng")?.evidence[0]).toContain("乙合三吉门临巽");
    const other = evaluateQimenPatterns(chartWith([palace(4, { heavenlyStem: "丙", gate: "开门" })]));
    expect(other.checks.find(p => p.id === "jiu_dun_feng")?.evidence[0]).toContain("丙开临巽（另式）");
    const both = evaluateQimenPatterns(chartWith([palace(4, { heavenlyStem: ["乙", "丙"], gate: "开门" })]));
    const check = both.checks.find(p => p.id === "jiu_dun_feng")!;
    expect(check.positions).toEqual([4]);
    expect(check.evidence[0]).toContain("乙合三吉门临巽");
    expect(check.evidence[0]).toContain("丙开临巽（另式）");
    for (const input of [{ position: 4, heavenlyStem: "丙", gate: "休门" }, { position: 2, heavenlyStem: "丙", gate: "开门" }]) {
      expect(statusOf(evaluateQimenPatterns(chartWith([palace(input.position, input)])), "jiu_dun_feng")).toBe("未成立");
    }
  });
  it("records 云遁 primary and 乙开坤 variant independently without double counting", () => {
    const report = evaluateQimenPatterns(chartWith([
      palace(2, { heavenlyStem: "乙", earthlyStem: "辛", gate: "开门" }),
      palace(3, { heavenlyStem: "乙", earthlyStem: "辛", gate: "休门" }),
      palace(4, { heavenlyStem: "乙", earthlyStem: "己", gate: "开门" }),
    ]));
    const yun = report.checks.find(check => check.id === "jiu_dun_yun")!;
    expect(yun.positions).toEqual([2, 3]);
    expect(yun.evidence[0]).toContain("乙合三吉门临地辛");
    expect(yun.evidence[0]).toContain("乙开临坤（一云）");
    expect(yun.evidence[1]).toContain("乙合三吉门临地辛");
    const onlyVariant = evaluateQimenPatterns(chartWith([palace(2, { heavenlyStem: "乙", earthlyStem: "己", gate: "开门" })]));
    expect(onlyVariant.checks.find(check => check.id === "jiu_dun_yun")?.evidence[0]).toContain("乙开临坤（一云）");
    expect(onlyVariant.checks.find(check => check.id === "jiu_dun_yun")?.evidence[0]).not.toContain("乙合三吉门临地辛");
    const wrongGate = evaluateQimenPatterns(chartWith([palace(2, { heavenlyStem: "乙", earthlyStem: "己", gate: "休门" })]));
    expect(statusOf(wrongGate, "jiu_dun_yun")).toBe("未成立");
  });
  it("distinguishes 欢怡 from 相佐 by heavenly and earthly plate", () => {
    for (const qi of ["乙", "丙", "丁"]) {
      const report = evaluateQimenPatterns(chartWith([
        palace(3, { heavenlyStem: qi, earthlyStem: "戊" }),
        palace(6, { heavenlyStem: "戊", earthlyStem: qi, deity: "值符", isZhiFu: true }),
      ], { zhiFu: 6 }));
      expect(report.checks.find(({ id }) => id === "huan_yi")?.positions).toEqual([3]);
      expect(report.checks.find(({ id }) => id === "xiang_zuo")?.positions).toEqual([6]);
    }
    const wrong = evaluateQimenPatterns(chartWith([palace(3, { heavenlyStem: "戊", earthlyStem: "乙" })], { zhiFu: 6 }));
    expect(statusOf(wrong, "huan_yi")).toBe("未成立");
    expect(statusOf(wrong, "xiang_zuo")).toBe("未成立");
  });
  it("distinguishes the cited six hour pillars from the heaven-stem palace rule", () => {
    const selected = new Set(["戊戌", "壬辰", "丙戌", "癸未", "丁丑", "己丑"]);
    const stems = "甲乙丙丁戊己庚辛壬癸";
    const branches = "子丑寅卯辰巳午未申酉戌亥";
    for (let i = 0; i < 60; i++) {
      const stem = stems[i % 10];
      const branch = branches[i % 12];
      const report = evaluateQimenPatterns(chartWith([palace(1)], { fourPillars: { ...fourPillars, hour: { stem, branch } } }));
      expect(statusOf(report, "hour_pillar_tomb_baojian"), stem + branch).toBe(selected.has(stem + branch) ? "成立" : "未成立");
      expect(statusOf(report, "shi_gan_ru_mu")).toBe("未成立");
    }
    const report = evaluateQimenPatterns(chartWith([palace(2, { heavenlyStem: "乙", earthBranch: "未" })], { fourPillars }));
    expect(statusOf(report, "shi_gan_ru_mu")).toBe("成立");
    expect(statusOf(report, "hour_pillar_tomb_baojian")).toBe("未成立");
  });
  it("includes stems, gate and deity in composite-pattern evidence", () => {
    const cases = [
      { id: "jiu_dun_tian", position: 1, heavenlyStem: "丙", earthlyStem: "丁", gate: "生门", deity: "九天" },
      { id: "jiu_dun_di", position: 2, heavenlyStem: "乙", earthlyStem: "己", gate: "开门", deity: "太阴" },
      { id: "jiu_dun_ren", position: 3, heavenlyStem: "丁", earthlyStem: "戊", gate: "休门", deity: "太阴" },
      { id: "zhen_zha", position: 4, heavenlyStem: "乙", earthlyStem: "辛", gate: "开门", deity: "太阴" },
    ];
    for (const item of cases) {
      const report = evaluateQimenPatterns(chartWith([palace(item.position, item)]));
      const check = report.checks.find(c => c.id === item.id)!;
      expect(check.status).toBe("成立");
      expect(check.evidence[0]).toContain(`天${item.heavenlyStem}`);
      expect(check.evidence[0]).toContain(`地${item.earthlyStem}`);
      expect(check.evidence[0]).toContain(item.gate);
      expect(check.evidence[0]).toContain(item.deity);
    }
  });

  it("keeps the selected 三奇入墓 rule distinct from the 王璋 palace interpretation", () => {
    // 《遁甲符应经》整理本王璋条按乙二、丙六、丁六比较；不把其他宫视为原文逐项排除。
    const ancient = new Set(["乙2", "丙6", "丁6"]);
    const differences: string[] = [];
    for (const stem of ["乙", "丙", "丁"]) for (const position of [2, 6, 8]) {
      const key = `${stem}${position}`;
      const actual = statusOf(evaluateQimenPatterns(chartWith([palace(position, { heavenlyStem: stem })])), "san_qi_ru_mu") === "成立";
      if (actual !== ancient.has(key)) differences.push(`${key}:${actual ? "本盘口径命中" : "王璋口径命中"}`);
    }
    expect(differences).toEqual(["乙6:本盘口径命中", "丁6:王璋口径命中", "丁8:本盘口径命中"]);
    expect(QIMEN_PATTERN_CATALOG.find(p => p.id === "san_qi_ru_mu")?.requirement).toContain("古籍另有");
  });

  it("reports the specific 三奇入墓 source difference only for the stems on the plate", () => {
    const six = evaluateQimenPatterns(chartWith([palace(6, { heavenlyStem: ["乙", "丁", "丙"] })]));
    const note = six.sourceNotes.find(item => item.startsWith("三奇入墓异说"))!;
    expect(note).toContain("丁临六：王璋列入，本站未列");
    expect(note).toContain("乙临六：本站列入，王璋本段未列");
    expect(note).not.toContain("丁临八");
    const eight = evaluateQimenPatterns(chartWith([palace(8, { heavenlyStem: "丁" })]));
    expect(eight.sourceNotes.join(" ")).toContain("丁临八：本站列入，王璋本段未列");
    const agree = evaluateQimenPatterns(chartWith([palace(2, { heavenlyStem: "乙" }), palace(6, { heavenlyStem: "丙" })]));
    expect(agree.sourceNotes.some(item => item.startsWith("三奇入墓异说"))).toBe(false);
  });

  it("partitions the whole catalog into formed and failed", () => {
    const report = evaluateQimenPatterns(chartWith([palace(1)]));
    expect(report.registered).toBe(QIMEN_PATTERN_CATALOG.length);
    expect(report.formed.length + report.failed.length).toBe(QIMEN_PATTERN_CATALOG.length);
  });

  it("marks a stem pair as formed only when the pairing is on the board", () => {
    const report = evaluateQimenPatterns(chartWith([palace(3, { heavenlyStem: "戊", earthlyStem: "丙" })]));
    expect(statusOf(report, "qing_long_fan_shou")).toBe("成立");
    // 飞鸟跌穴 is the reverse pairing, so it must still be absent.
    expect(statusOf(report, "fei_niao_die_xue")).toBe("未成立");
    expect(report.checks.find((check) => check.id === "qing_long_fan_shou")?.positions).toEqual([3]);
  });

  it("reports the fixed-stem bird pattern separately from a non-Wu chief proxy", () => {
    const report = evaluateQimenPatterns(chartWith([
      palace(2, { heavenlyStem: "丙", earthlyStem: "己" }),
      palace(3, { heavenlyStem: "丙", earthlyStem: "戊" }),
      palace(6, { heavenlyStem: "辛", earthlyStem: "乙" }),
    ]));
    expect(report.checks.find((check) => check.id === "fei_niao_die_xue")?.positions).toEqual([3]);
    expect(report.checks.find((check) => check.id === "bai_hu_chang_kuang")?.positions).toEqual([6]);
  });

  it("ties 玉女守门 to 值使 and 三奇得使 to the classical stem pairings", () => {
    const report = evaluateQimenPatterns(
      chartWith([palace(6, { heavenlyStem: "丁", earthlyStem: "丁" })], { zhiShi: 6 }),
    );
    expect(statusOf(report, "yu_nu_shou_men")).toBe("成立");
    expect(statusOf(report, "san_qi_de_shi")).toBe("未成立");
    // The same palace is not 值使 elsewhere.
    const other = evaluateQimenPatterns(
      chartWith([palace(6, { heavenlyStem: "丁", earthlyStem: "丁" })], { zhiShi: 2 }),
    );
    expect(statusOf(other, "yu_nu_shou_men")).toBe("未成立");
    expect(statusOf(other, "san_qi_de_shi")).toBe("未成立");
    const classical = evaluateQimenPatterns(chartWith([
      palace(3, { heavenlyStem: "乙", earthlyStem: "辛" }),
      palace(4, { heavenlyStem: "丙", earthlyStem: "庚" }),
      palace(9, { heavenlyStem: "丁", earthlyStem: "癸" }),
    ], { zhiShi: 2 }));
    expect(classical.checks.find((check) => check.id === "san_qi_de_shi")?.positions).toEqual([3, 4, 9]);

  });

  it("matches exactly the six classical 三奇得使 pairings", () => {
    const expected = new Set(["乙己", "乙辛", "丙戊", "丙庚", "丁壬", "丁癸"]);
    for (const heavenlyStem of ["乙", "丙", "丁"]) {
      for (const earthlyStem of ["戊", "己", "庚", "辛", "壬", "癸", "乙", "丙", "丁"]) {
        const pair = heavenlyStem + earthlyStem;
        const chart = chartWith([palace(3, { heavenlyStem, earthlyStem })], { zhiShi: 3 });
        expect(statusOf(evaluateQimenPatterns(chart), "san_qi_de_shi"), pair).toBe(
          expected.has(pair) ? "成立" : "未成立",
        );
      }
    }
  });

  it("detects 九遁 and 三诈 from the stem / gate / deity combination", () => {
    const report = evaluateQimenPatterns(
      chartWith([
        palace(1, { heavenlyStem: "丙", earthlyStem: "丁", gate: "生门" }),
        palace(4, { heavenlyStem: "乙", gate: "开门", deity: "太阴" }),
      ]),
    );
    expect(statusOf(report, "jiu_dun_tian")).toBe("成立");
    expect(statusOf(report, "zhen_zha")).toBe("成立");
    expect(statusOf(report, "jiu_dun_gui")).toBe("未成立");
  });

  it("recognizes 甲己 through the actual chief and retains simultaneous odd and instrument matches", () => {
    const evaluate = (fields: Record<string, unknown>, zhiFu: number) => evaluateQimenPatterns(chartWith([palace(3, fields)], { zhiFu })).checks.find(({ id }) => id === "qi_yi_xiang_he")!;
    const chief = evaluate({ heavenlyStem: "辛", earthlyStem: "己", gate: "开门" }, 3);
    expect(chief.status).toBe("成立");
    expect(chief.evidence[0]).toContain("值符加己（甲己）");
    expect(evaluate({ heavenlyStem: "辛", earthlyStem: "己", gate: "开门" }, 1).status).toBe("未成立");
    expect(evaluate({ heavenlyStem: "辛", earthlyStem: "己", gate: "死门" }, 3).status).toBe("未成立");
    const simultaneous = evaluate({ heavenlyStem: ["乙", "戊"], earthlyStem: ["庚", "癸"], gate: "休门" }, 1);
    expect(simultaneous.evidence[0]).toContain("乙庚");
    expect(simultaneous.evidence[0]).toContain("戊癸");
  });

  it("detects 门宫和义 from the gate/palace generation", () => {
    // 休门(水) 生 木(震 3 宫) → 和
    const report = evaluateQimenPatterns(chartWith([palace(3, { gate: "休门", fiveElements: "木" })]));
    expect(statusOf(report, "men_gong_he_yi")).toBe("成立");
    expect(report.checks.find(({ id }) => id === "men_gong_he_yi")?.evidence).toEqual(["休门生3宫（现和/旨归义）"]);
    const reverse = evaluateQimenPatterns(chartWith([palace(1, { gate: "伤门", fiveElements: "水" })]));
    expect(reverse.checks.find(({ id }) => id === "men_gong_he_yi")?.evidence).toEqual(["1宫生伤门（现义/旨归和）"]);
    const same = evaluateQimenPatterns(chartWith([palace(3, { gate: "伤门", fiveElements: "木" })]));
    expect(statusOf(same, "men_gong_he_yi")).toBe("未成立");
  });

  it("detects 奇格 when 庚 presses 三奇", () => {
    const report = evaluateQimenPatterns(chartWith([palace(9, { heavenlyStem: "庚", earthlyStem: "丙" })]));
    expect(statusOf(report, "qi_ge")).toBe("成立");
  });

  it("reports every distinct 三奇受刑 witness without attributing unrelated stems", () => {
    const report = evaluateQimenPatterns(chartWith([
      palace(1, { heavenlyStem: ["丙", "丁", "戊"], earthlyStem: ["壬", "癸"] }),
      palace(6, { heavenlyStem: "乙", earthlyStem: ["庚", "辛"] }),
      palace(8, { heavenlyStem: "乙", earthlyStem: "丁" }),
    ]));
    const check = report.checks.find(({ id }) => id === "san_qi_shou_xing")!;
    expect(check.positions).toEqual([1, 6]);
    expect(check.evidence).toEqual([
      "1宫：丙临坎、丙加壬、丙加癸、丁临坎、丁加壬、丁加癸",
      "6宫：乙临6宫、乙加庚、乙加辛",
    ]);
  });

  it("uses the four pillars for 日格 / 时格 / 飞干格", () => {
    const report = evaluateQimenPatterns(
      chartWith([palace(2, { heavenlyStem: "庚", earthlyStem: "戊" })]),
    );
    // day stem 戊, so 庚+戊 is 日格/伏干格 but not 时格.
    expect(statusOf(report, "ri_ge")).toBe("成立");
    expect(report.checks.find((check) => check.id === "ri_ge")?.name).toBe("日格（伏干格）");
    expect(report.checks.some((check) => check.id === "fu_gan_ge")).toBe(false);
    expect(statusOf(report, "shi_ge")).toBe("未成立");
  });

  it("uses the day's own hidden instrument for all six 甲日 in 伏干 and 飞干", () => {
    for (const [branch, instrument] of [["子", "戊"], ["戌", "己"], ["申", "庚"], ["午", "辛"], ["辰", "壬"], ["寅", "癸"]]) {
      const pillars = { ...fourPillars, day: { stem: "甲", branch }, hour: { stem: "甲", branch: "子" } };
      const make = (heavenlyStem: string, earthlyStem: string) => evaluateQimenPatterns(chartWith([palace(3, { heavenlyStem, earthlyStem })], { fourPillars: pillars }));
      const fu = make("庚", instrument);
      const fei = make(instrument, "庚");
      expect(statusOf(fu, "ri_ge"), branch).toBe("成立");
      expect(statusOf(fei, "fei_gan_ge"), branch).toBe("成立");
      expect(fu.checks.find(({ id }) => id === "ri_ge")?.evidence[0]).toContain(`甲${branch}日遁${instrument}`);
      if (instrument !== "戊") expect(statusOf(make("庚", "戊"), "ri_ge"), branch).toBe("未成立");
    }
  });

  it("marks 天显时格 from the day/time pillar combination", () => {
    const hit = evaluateQimenPatterns(
      chartWith([palace(1)], {
        fourPillars: { ...fourPillars, day: { stem: "甲", branch: "子" }, hour: { stem: "甲", branch: "子" } },
      }),
    );
    expect(statusOf(hit, "tian_xian_shi_ge")).toBe("成立");
    expect(statusOf(evaluateQimenPatterns(chartWith([palace(1)])), "tian_xian_shi_ge")).toBe("未成立");
  });

  it("detects 门迫 and 六仪击刑 from the palace flags", () => {
    const report = evaluateQimenPatterns(chartWith([
      palace(1, { gatePressure: "迫", gate: "开门" }),
      palace(8, { liuYiJiXing: { hasJiXing: true, type: "六仪击刑" } }),
    ]));
    expect(statusOf(report, "men_po")).toBe("成立");
    expect(statusOf(report, "liu_yi_ji_xing")).toBe("成立");
  });

  it("treats 五不遇时 as a global pattern", () => {
    expect(statusOf(evaluateQimenPatterns(chartWith([palace(1)], { wuBuYuShi: true })), "wu_bu_yu_shi")).toBe("成立");
    expect(statusOf(evaluateQimenPatterns(chartWith([palace(1)])), "wu_bu_yu_shi")).toBe("未成立");
  });

  it("gives every check a requirement, a hint, a kind and a group", () => {
    const report = evaluateQimenPatterns(chartWith([palace(1)]));
    for (const check of report.checks) {
      expect(check.requirement.length).toBeGreaterThan(0);
      expect(check.hint.length).toBeGreaterThan(0);
      expect(["吉格", "凶格"]).toContain(check.kind);
      expect(["九遁", "三诈五假", "常用吉格", "常用凶格", "伏吟反吟", "全局"]).toContain(check.group);
    }
  });

  it("detects 门伏吟 / 门反吟 from the gate placement", () => {
    const native = evaluateQimenPatterns(
      chartWith([
        palace(1, { gate: "休门" }),
        palace(2, { gate: "死门" }),
        palace(3, { gate: "伤门" }),
        palace(4, { gate: "杜门" }),
        palace(6, { gate: "开门" }),
        palace(7, { gate: "惊门" }),
        palace(8, { gate: "生门" }),
        palace(9, { gate: "景门" }),
      ]),
    );
    expect(statusOf(native, "fu_yin_gate")).toBe("成立");
    expect(statusOf(native, "fan_yin_gate")).toBe("未成立");

    const reversed = evaluateQimenPatterns(
      chartWith([
        palace(9, { gate: "休门" }),
        palace(8, { gate: "死门" }),
        palace(7, { gate: "伤门" }),
        palace(6, { gate: "杜门" }),
        palace(4, { gate: "开门" }),
        palace(3, { gate: "惊门" }),
        palace(2, { gate: "生门" }),
        palace(1, { gate: "景门" }),
      ]),
    );
    expect(statusOf(reversed, "fan_yin_gate")).toBe("成立");
    expect(statusOf(reversed, "fu_yin_gate")).toBe("未成立");
  });

  it("grades formed patterns by the palace 旺衰 and counts the bands", () => {
    const strong = evaluateQimenPatterns(
      chartWith([palace(3, { heavenlyStem: "戊", earthlyStem: "丙", status: { star: "旺", gate: "旺" } })]),
    );
    expect(strong.checks.find((check) => check.id === "qing_long_fan_shou")?.strength).toBe("有力");
    expect(strong.strengthCounts.有力).toBeGreaterThan(0);

    const weak = evaluateQimenPatterns(
      chartWith([palace(3, { heavenlyStem: "戊", earthlyStem: "丙", status: { star: "死", gate: "死" } })]),
    );
    expect(weak.checks.find((check) => check.id === "qing_long_fan_shou")?.strength).toBe("无力");
    expect(weak.strengthCounts.无力).toBeGreaterThan(0);
  });

  it("leaves global patterns and unformed patterns without a strength band", () => {
    const report = evaluateQimenPatterns(chartWith([palace(1)], { wuBuYuShi: true }));
    expect(report.checks.find((check) => check.id === "wu_bu_yu_shi")?.strength).toBeUndefined();
    expect(report.checks.find((check) => check.id === "qing_long_fan_shou")?.strength).toBeUndefined();
  });
});

it("requires a heaven-plate qi for all three zha patterns", () => {
  for (const [id, deity] of [["zhen_zha", "太阴"], ["xiu_zha", "六合"], ["chong_zha", "九地"]]) {
    const report = (overrides: Record<string, unknown>) =>
      evaluateQimenPatterns(chartWith([palace(4, { gate: "开门", deity, ...overrides })]));
    expect(statusOf(report({}), id)).toBe("未成立");
    expect(statusOf(report({ heavenlyStem: "庚", earthlyStem: "乙" }), id)).toBe("未成立");
    expect(statusOf(report({ heavenlyStem: ["庚", "乙"], earthlyStem: "戊" }), id)).toBe("成立");
    expect(statusOf(report({ heavenlyStem: "丙", gate: "死门" }), id)).toBe("未成立");
  }
});

it("keeps the dragon, tiger and ghost alternatives as complete classical clauses", () => {
  const formed = (id: string, position: number, fields: Record<string, unknown>) =>
    statusOf(evaluateQimenPatterns(chartWith([palace(position, fields)])), id);
  expect(formed("jiu_dun_long", 1, { heavenlyStem: "乙", gate: "开门" })).toBe("成立");
  expect(formed("jiu_dun_long", 1, { heavenlyStem: "乙", gate: "休门" })).toBe("成立");
  expect(formed("jiu_dun_long", 3, { heavenlyStem: "乙", earthlyStem: "癸", gate: "休门" })).toBe("成立");
  expect(formed("jiu_dun_hu", 8, { heavenlyStem: "乙", gate: "休门" })).toBe("未成立");
  expect(formed("jiu_dun_hu", 3, { heavenlyStem: "乙", earthlyStem: "辛", gate: "休门" })).toBe("未成立");
  expect(formed("jiu_dun_hu", 8, { heavenlyStem: ["戊", "乙"], earthlyStem: "辛", gate: "休门" })).toBe("成立");
  expect(formed("jiu_dun_hu", 8, { heavenlyStem: "辛", gate: "生门" })).toBe("成立");
  expect(formed("jiu_dun_hu", 3, { heavenlyStem: "丙", earthlyStem: "辛", gate: "生门" })).toBe("成立");
  expect(formed("jiu_dun_hu", 7, { heavenlyStem: "庚", gate: "开门" })).toBe("未成立");
  expect(formed("jiu_dun_gui", 8, { heavenlyStem: "丁", gate: "生门", deity: "九地" })).toBe("成立");
  expect(formed("jiu_dun_gui", 3, { heavenlyStem: "丁", gate: "生门", deity: "九地" })).toBe("未成立");
  expect(formed("jiu_dun_gui", 3, { heavenlyStem: "乙", gate: "杜门", deity: "九地" })).toBe("成立");
  expect(formed("jiu_dun_gui", 3, { heavenlyStem: "丁", gate: "开门", deity: "九地" })).toBe("成立");
  expect(formed("jiu_dun_gui", 3, { heavenlyStem: "丁", gate: "杜门", deity: "九地" })).toBe("未成立");
});


it("uses heaven stems for promotion and salary palaces, keeping their different positions", () => {
  const cases = [
    [3, "乙", "无", "开门", true, true],
    [4, "丙", "无", "休门", true, false],
    [9, "丁", "无", "生门", true, false],
    [9, "丙", "无", "景门", false, true],
    [7, "丁", "无", "杜门", false, true],
    [3, "庚", "乙", "开门", false, false],
    [4, "庚", "丙", "休门", false, false],
    [7, "庚", "丁", "生门", false, false],
    [3, ["戊", "乙"], "庚", "生门", true, true],
    [3, "乙", "庚", "死门", false, true],
  ] as const;
  for (const [position, heavenlyStem, earthlyStem, gate, lu, dian] of cases) {
    const report = evaluateQimenPatterns(chartWith([palace(position, { heavenlyStem, earthlyStem, gate })]));
    expect(statusOf(report, "qi_you_lu_wei")).toBe(lu ? "成立" : "未成立");
    expect(statusOf(report, "san_qi_sheng_dian")).toBe(dian ? "成立" : "未成立");
  }
});


it("matches the four Jia heaven-stem clauses and rejects earth-only substitutes", () => {
  const rules = [
    ["di_jia", ["丁", "己", "癸"], "杜门", ["九地", "太阴", "六合"]],
    ["ren_jia", ["壬"], "惊门", ["九天"]],
    ["shen_jia", ["丁", "己", "癸"], "伤门", ["九地"]],
    ["gui_jia", ["丁", "己", "癸"], "死门", ["九地"]],
  ] as const;
  for (const [id, stems, gate, deities] of rules) {
    for (const stem of stems) {
      for (const deity of deities) {
        const formed = (overrides: Record<string, unknown>) => statusOf(evaluateQimenPatterns(chartWith([
          palace(6, { heavenlyStem: stem, earthlyStem: "庚", gate, deity, ...overrides }),
        ])), id);
        expect(formed({})).toBe("成立");
        expect(formed({ heavenlyStem: "庚", earthlyStem: stem })).toBe("未成立");
        expect(formed({ heavenlyStem: ["戊", stem] })).toBe("成立");
        expect(formed({ gate: "开门" })).toBe("未成立");
        expect(formed({ deity: "白虎" })).toBe("未成立");
      }
    }
  }
});


it("keeps structure and seasonal grade separate from same-palace classical restrictions", () => {
  const report = evaluateQimenPatterns(chartWith([
    palace(3, { heavenlyStem: "乙", gate: "开门", gatePressure: "迫", status: { gate: "旺", star: "旺" } }),
    palace(8, { heavenlyStem: ["丁", "庚"], earthlyStem: "乙", earthBranch: ["丑", "寅"], gate: "死门", deity: "九地" }),
    // Only an unrelated hosted stem is in tomb: the forming 壬 must not inherit 丙's restriction.
    palace(6, { heavenlyStem: ["壬", "丙"], earthBranch: ["戌", "亥"], gate: "惊门", deity: "九天" }),
  ]));
  const promotion = report.checks.find(item => item.id === "san_qi_sheng_dian")!;
  expect(promotion.status).toBe("成立");
  expect(promotion.strength).toBe("有力");
  expect(promotion.usageRestrictions).toEqual(["第 3 宫：开门门迫，未满足无迫取用条件"]);
  expect(report.checks.find(item => item.id === "gui_jia")?.usageRestrictions)
    .toEqual(["第 8 宫：成立所用天盘丁入墓，未满足无墓取用条件"]);
  expect(report.checks.find(item => item.id === "ren_jia")?.usageRestrictions).toEqual([]);
  expect(report.strengthMethod).toContain("不计入此分");
});

it("does not transfer restrictions from another palace or a pattern that has not formed", () => {
  const report = evaluateQimenPatterns(chartWith([
    palace(3, { heavenlyStem: "乙", gate: "生门" }),
    palace(6, { heavenlyStem: "丙", earthBranch: "戌", gate: "开门", gatePressure: "迫" }),
    palace(8, { heavenlyStem: "丁", earthBranch: "丑", gate: "景门", deity: "九地" }),
  ]));
  expect(report.checks.find(item => item.id === "san_qi_sheng_dian")?.usageRestrictions).toEqual([]);
  expect(report.checks.find(item => item.id === "gui_jia")?.usageRestrictions).toEqual([]);
});

it("uses each 甲 pillar's own hidden instrument for 岁格、月格 and 时格", () => {
  for (const [branch, instrument] of [["子", "戊"], ["戌", "己"], ["申", "庚"], ["午", "辛"], ["辰", "壬"], ["寅", "癸"]]) {
    for (const [key, id, label] of [["year", "sui_ge", "年"], ["month", "yue_ge", "月"], ["hour", "shi_ge", "时"]] as const) {
      const pillars = { ...fourPillars, [key]: { stem: "甲", branch } };
      const evaluate = (earthlyStem: string) => evaluateQimenPatterns(chartWith([palace(3, { heavenlyStem: "庚", earthlyStem })], { fourPillars: pillars }));
      const report = evaluate(instrument);
      expect(statusOf(report, id), `${key} 甲${branch}`).toBe("成立");
      expect(report.checks.find((check) => check.id === id)?.evidence[0]).toContain(`甲${branch}${label}遁${instrument}`);
      if (instrument !== "戊") expect(statusOf(evaluate("戊"), id), `${key} 甲${branch}`).toBe("未成立");
    }
  }
});


it("names only actual 三奇入墓 stems when a palace carries multiple heaven stems", () => {
  const report = evaluateQimenPatterns(chartWith([palace(6, { heavenlyStem: ["丙", "丁", "戊"] })]));
  const hit = report.checks.find((check) => check.id === "san_qi_ru_mu")!;
  expect(hit.evidence).toEqual(["第 6 宫：天盘 丙 入墓"]);
});

it("distinguishes 丙加值符、值符加丙 and 丙加四柱", () => {
  const test = (p: ReturnType<typeof palace>, chief = 1) => evaluateQimenPatterns(chartWith([p], { zhiFu: chief })).checks.find(check => check.id === "bei_ge")!;
  const fu = test(palace(3, { heavenlyStem: "丙", earthlyStem: "戊" }));
  expect(fu.evidence[0]).toContain("天丙加地盘值符遁仪（符悖）");
  const fei = test(palace(1, { earthlyStem: "丙" }));
  expect(fei.evidence[0]).toContain("天盘值符加地丙（飞悖）");
  const hour = test(palace(3, { heavenlyStem: "丙", earthlyStem: "乙" }));
  expect(hour.evidence[0]).toContain("天丙加地盘时干");
  const wrong = test(palace(1, { heavenlyStem: "丙", earthlyStem: "壬", isZhiFu: true, deity: "值符" }));
  expect(wrong.status).toBe("未成立");
  const jia = test(palace(3, { heavenlyStem: "丙", earthlyStem: "戊" }));
  expect(jia.evidence[0]).toContain("甲子遁戊");
});
