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

  it("detects 门宫和义 from the gate/palace generation", () => {
    // 休门(水) 生 木(震 3 宫) → 和
    const report = evaluateQimenPatterns(chartWith([palace(3, { gate: "休门", fiveElements: "木" })]));
    expect(statusOf(report, "men_gong_he_yi")).toBe("成立");
  });

  it("detects 奇格 when 庚 presses 三奇", () => {
    const report = evaluateQimenPatterns(chartWith([palace(9, { heavenlyStem: "庚", earthlyStem: "丙" })]));
    expect(statusOf(report, "qi_ge")).toBe("成立");
  });

  it("uses the four pillars for 日格 / 时格 / 飞干格", () => {
    const report = evaluateQimenPatterns(
      chartWith([palace(2, { heavenlyStem: "庚", earthlyStem: "戊" })]),
    );
    // day stem 戊, so 庚+戊 is 日格/伏干格 but not 时格.
    expect(statusOf(report, "ri_ge")).toBe("成立");
    expect(statusOf(report, "fu_gan_ge")).toBe("成立");
    expect(statusOf(report, "shi_ge")).toBe("未成立");
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
  expect(formed("jiu_dun_long", 1, { heavenlyStem: "乙", gate: "开门" })).toBe("未成立");
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
