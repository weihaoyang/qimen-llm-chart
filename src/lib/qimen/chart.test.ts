import { describe, expect, it } from "vitest";
import { QimenChart } from "3meta";
import { buildChart, buildQimenChartFromProfile } from "./chart";
import { evaluateQimenPatterns } from "./patterns";
import { DEFAULT_QIMEN_SETTINGS, QIMEN_SOLAR_TERMS } from "./settings";

describe("buildChart", () => {
  it("reproduces the 72 term and yuan entries, using Zhi Gui for Chu Shu", () => {
    const juByTerm = [
      "174", "285", "396", "852", "963", "174", "396", "417", "528", "417", "528", "639",
      "936", "825", "714", "258", "147", "936", "714", "693", "582", "693", "582", "471",
    ];
    const dates = ["2026-01-05T12:00", "2026-01-10T12:00", "2026-01-15T12:00"];
    for (const [termIndex, solarTerm] of QIMEN_SOLAR_TERMS.entries()) {
      const charts = dates.map((datetime) => buildChart({
        datetime, timeZone: "Asia/Shanghai", qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm },
      }));
      expect(charts.map(({ raw }) => raw.ju.number).join(""), solarTerm).toBe(juByTerm[termIndex]);
      expect(charts.map(({ raw }) => raw.ju.type)).toEqual(Array(3).fill(termIndex < 12 ? "阳遁" : "阴遁"));
    }
  });

  it("keeps the Chu Shu textual variants distinct in the resulting plates", () => {
    const datetime = "2026-01-10T12:00";
    const qimenSettings = { ...DEFAULT_QIMEN_SETTINGS, solarTerm: "处暑" };
    const input = { datetime, timeZone: "Asia/Shanghai", qimenSettings };
    const standard = buildChart(input).raw;
    const variant = buildChart({ ...input, qimenSettings: { ...qimenSettings, juNumber: 7 } }).raw;
    expect(standard.ju).toMatchObject({ type: "阴遁", number: 4 });
    expect(variant.ju).toMatchObject({ type: "阴遁", number: 7 });
    expect(standard.palaces.find(({ earthlyStem }) => earthlyStem === "戊")?.position).toBe(4);
    expect(variant.palaces.find(({ earthlyStem }) => earthlyStem === "戊")?.position).toBe(7);
  });

  it("keeps the chosen term's number when the user reverses the dun", () => {
    const { raw } = buildChart({
      datetime: "2026-01-05T12:00", timeZone: "Asia/Shanghai",
      qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm: "夏至", dunType: "yang" },
    });
    expect(raw.timeInfo.solarTerm).toBe("夏至");
    expect(raw.ju).toMatchObject({ type: "阳遁", number: 9 });
  });
  it("matches the Ba Jian nine-star seasonal rule across the twelve solar months", () => {
    // 生序水木火土金，以星为主：同相、我生旺、我克休、克我囚、生我废。
    const elements = new Map([
      ["天蓬", 0], ["天冲", 1], ["天辅", 1], ["天英", 2], ["天任", 3],
      ["天禽", 3], ["天芮", 3], ["天柱", 4], ["天心", 4],
    ]);
    const monthElements = [3, 1, 1, 3, 2, 2, 3, 4, 4, 3, 0, 0];
    const relations = ["相", "旺", "休", "囚", "废"];
    for (const [index, month] of monthElements.entries()) {
      const datetime = `2026-${String(index + 1).padStart(2, "0")}-15T12:00`;
      const { raw } = buildChart({ datetime, timeZone: "Asia/Shanghai" });
      const seen = new Set<string>();
      for (const palace of raw.palaces) {
        if (palace.position === 5) continue;
        const star = Array.isArray(palace.star) ? palace.star[0] : palace.star;
        const element = elements.get(star);
        if (element === undefined) continue;
        seen.add(star);
        expect(palace.status?.star, `${datetime} ${star}`).toBe(relations[(month - element + 5) % 5]);
      }
      expect(seen.size).toBeGreaterThanOrEqual(8);
    }
  });

  it("uses the month-to-gate relationship for eight gates rather than the nine-star rule", () => {
    const gateElements = new Map([
      ["休门", 0], ["伤门", 1], ["杜门", 1], ["景门", 2],
      ["生门", 3], ["死门", 3], ["惊门", 4], ["开门", 4],
    ]);
    const relations = ["旺", "相", "死", "囚", "休"];
    for (const [month, element] of [[2, 1], [4, 3], [5, 2], [8, 4], [11, 0]]) {
      const datetime = `2026-${String(month).padStart(2, "0")}-15T12:00`;
      const { raw } = buildChart({ datetime, timeZone: "Asia/Shanghai" });
      const gates = raw.palaces.filter(({ position }) => position !== 5);
      expect(new Set(gates.map(({ gate }) => gate)).size).toBe(8);
      for (const palace of gates) {
        const gate = gateElements.get(palace.gate);
        expect(gate).toBeDefined();
        expect(palace.status?.gate).toBe(relations[((gate ?? 0) - element + 5) % 5]);
      }
    }
  });
  it("returns nine palaces for a valid datetime input", () => {
    const chart = buildChart({
      datetime: "2026-07-01T21:30",
      timeZone: "Asia/Shanghai",
    });

    expect(chart.raw.palaces).toHaveLength(9);
    expect(chart.raw.palaces[0]?.position).toBe(1);
    expect(chart.raw.palaces[8]?.position).toBe(9);
  });

  it("includes interpreted local datetime metadata", () => {
    const chart = buildChart({
      datetime: "2026-07-01T21:30",
      timeZone: "Asia/Tokyo",
    });

    expect(chart.interpretedDateTime).toBe("2026-07-01 21:30:00");
  });

  it("preserves the selected timezone wall-clock time when building the chart", () => {
    const chart = buildChart({
      datetime: "2026-07-01T23:30",
      timeZone: "Asia/Tokyo",
    });
    const direct = QimenChart.byDatetime("2026-07-01 23:30:00").toJSON();

    expect(chart.raw.timeInfo.chineseTime).toBe(direct.timeInfo.chineseTime);
    expect(chart.raw.fourPillars.hour).toEqual(direct.fourPillars.hour);
  });

  it("builds a qimen chart from normalized profile input", () => {
    const chart = buildQimenChartFromProfile({
      original: {
        calendarMode: "solar",
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        gender: "male",
        timeBasis: "civil",
      },
      normalized: {
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        calendarMode: "solar",
        timeBasis: "civil",
      },
    });

    expect(chart.raw.palaces).toHaveLength(9);
  });

  it("passes through supported qimen chart options", () => {
    const chart = buildChart({
      datetime: "2026-07-03T11:30",
      timeZone: "Asia/Shanghai",
      qimenSettings: {
        solarTerm: "夏至",
        dunType: "yin",
        juNumber: 3,
        yearDivide: "normal",
      },
    });
    const direct = QimenChart.byDatetime("2026-07-03 11:30:00", {
      solarTerm: "夏至",
      isYangdun: false,
      juNumber: 3,
      yearDivide: "normal",
    }).toJSON();

    expect(chart.raw.timeInfo.solarTerm).toBe(direct.timeInfo.solarTerm);
    expect(chart.raw.ju.type).toBe(direct.ju.type);
    expect(chart.raw.ju.number).toBe(direct.ju.number);
    expect(chart.raw.fourPillars.hour).toEqual(direct.fourPillars.hour);
  });

});

it("changes the exact year pillar at Li Chun rather than midnight", () => {
  const input = { timeZone: "Asia/Shanghai" };
  const before = buildChart({ ...input, datetime: "2024-02-04T16:26" });
  const after = buildChart({ ...input, datetime: "2024-02-04T16:28" });
  expect(before.raw.fourPillars.year).toEqual({ stem: "癸", branch: "卯" });
  expect(after.raw.fourPillars.year).toEqual({ stem: "甲", branch: "辰" });
});

it("uses the same astronomical term for equivalent civil instants", () => {
  const shanghai = buildChart({ datetime: "2024-12-22T01:00", timeZone: "Asia/Shanghai" });
  const newYork = buildChart({ datetime: "2024-12-21T12:00", timeZone: "America/New_York" });
  expect(shanghai.raw.timeInfo.solarTerm).toBe("冬至");
  expect(newYork.raw.timeInfo.solarTerm).toBe("冬至");
  expect(newYork.raw.ju.type).toBe("阳遁");
});

it("keeps Li Chun year and month aligned across civil timezones", () => {
  const shanghai = buildChart({ datetime: "2024-02-04T16:28", timeZone: "Asia/Shanghai" });
  const newYork = buildChart({ datetime: "2024-02-04T03:28", timeZone: "America/New_York" });
  expect(newYork.raw.fourPillars.year).toEqual({ stem: "甲", branch: "辰" });
  expect(newYork.raw.fourPillars.month).toEqual({ stem: "丙", branch: "寅" });
  expect(newYork.raw.fourPillars.month).toEqual(shanghai.raw.fourPillars.month);
  expect(newYork.raw.fourPillars.hour).not.toEqual(shanghai.raw.fourPillars.hour);
});

it("agrees with the stem-head rule for an entire sexagenary cycle", () => {
  const stems = "甲乙丙丁戊己庚辛壬癸";
  const branches = "子丑寅卯辰巳午未申酉戌亥";
  const seen = new Set<string>();
  for (let day = 0; day < 60; day++) {
    const date = new Date(Date.UTC(2026, 0, day + 1)).toISOString().slice(0, 10);
    const { raw } = buildChart({ datetime: date + "T12:00", timeZone: "Asia/Shanghai" });
    const { stem, branch } = raw.fourPillars.day;
    seen.add(stem + branch);
    const head = (branches.indexOf(branch) - stems.indexOf(stem) % 5 + 12) % 12;
    expect(raw.yuan, stem + branch).toBe(["上元", "下元", "中元"][head % 3]);
  }
  expect(seen.size).toBe(60);
});

it("reproduces the classic Da Han bird pattern and distinguishes the Jia Xu variant", () => {
  const timeZone = "Asia/Shanghai";
  const classic = buildChart({
    datetime: "2026-01-05T14:00", timeZone,
    qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm: "大寒", juNumber: 9 },
  });
  expect(classic.raw.timeInfo.xunShou).toBe("甲子");
  expect(classic.raw.palaces.find((palace) => palace.position === 9)).toMatchObject({ heavenlyStem: "丙", earthlyStem: "戊" });
  expect(evaluateQimenPatterns(classic).checks.find((check) => check.id === "fei_niao_die_xue")?.positions).toContain(9);

  const variant = buildChart({ datetime: "2026-01-05T22:00", timeZone, qimenSettings: DEFAULT_QIMEN_SETTINGS });
  expect(variant.raw.timeInfo.xunShou).toBe("甲戌");
  expect(variant.raw.palaces.find((palace) => palace.position === 3)).toMatchObject({ heavenlyStem: "丙", earthlyStem: "己" });
  expect(evaluateQimenPatterns(variant).checks.find((check) => check.id === "fei_niao_die_xue")?.positions).not.toContain(3);
});

it("reproduces the Yang Nine 庚午 三奇得使 example from 遁甲演义", () => {
  const chart = buildChart({
    datetime: "2026-01-05T12:00", timeZone: "Asia/Shanghai",
    qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm: "大寒", juNumber: 9 },
  });
  expect(chart.raw.fourPillars.hour).toEqual({ stem: "庚", branch: "午" });
  expect(chart.raw.zhiShi.position).toBe(6);
  const patterns = evaluateQimenPatterns(chart).checks;
  expect(patterns.find(({ id }) => id === "san_qi_de_shi")?.positions).toEqual([3]);
  expect(chart.raw.specialPatterns.auspiciousPatterns?.filter(({ name }) => name === "三奇得使").map(({ position }) => position)).toEqual([3]);
  expect(chart.palaceMap[3].auspiciousPatterns?.some(({ name }) => name === "三奇得使")).toBe(true);

  expect(patterns.find(({ id }) => id === "qing_long_tao_zou")?.positions).toContain(3);
});

it("matches all ten 五不遇 hours from 遁甲演义 and rejects the other hours", () => {
  const expected = new Map([
    ["甲", "庚午"], ["乙", "辛巳"], ["丙", "壬辰"], ["丁", "癸卯"], ["戊", "甲寅"],
    ["己", "乙丑"], ["庚", "丙子"], ["辛", "丁酉"], ["壬", "戊申"], ["癸", "己未"],
  ]);
  const tested = new Set<string>();
  for (let day = 5; day < 15; day += 1) {
    for (let hour = 0; hour < 24; hour += 2) {
      const datetime = `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
      const { raw } = buildChart({ datetime, timeZone: "Asia/Shanghai" });
      const dayStem = raw.fourPillars.day.stem;
      const time = raw.fourPillars.hour.stem + raw.fourPillars.hour.branch;
      const match = time === expected.get(dayStem);
      expect(Boolean(raw.specialPatterns.wuBuYuShi?.isWuBuYuShi), datetime).toBe(match);
      if (match) tested.add(dayStem);
    }
  }
  expect(tested.size).toBe(10);
});

it("reproduces the two 遁甲演义 palace patterns and their non-Wu counterparts", () => {
  const cases = [
    ["2026-01-05T16:00", "立春", 2, "戊", "伏宫格", 2],
    ["2026-01-05T12:00", "春分", 9, "戊", "飞宫格", 2],
    ["2026-01-06T02:00", "auto", "auto", "己", "伏宫格", 3],
    ["2026-01-06T08:00", "auto", "auto", "己", "飞宫格", 4],
  ] as const;
  for (const [datetime, solarTerm, juNumber, chief, name, position] of cases) {
    const chart = buildChart({
      datetime, timeZone: "Asia/Shanghai",
      qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm, juNumber },
    });
    expect(chart.raw.zhiFu.heavenlyStem).toBe(chief);
    expect(evaluateQimenPatterns(chart).checks.find((check) => check.name === name)?.positions).toEqual([position]);
    expect(chart.raw.specialPatterns.inauspiciousPatterns?.filter((pattern) => pattern.name === name).map((pattern) => pattern.position)).toEqual([position]);
  }
});

it("keeps per-palace 六仪击刑 distinct from the classical chief-only rule", () => {
  const chart = buildChart({ datetime: "2026-01-05T02:00", timeZone: "Asia/Shanghai" });
  expect(chart.raw.timeInfo.xunShou).toBe("甲子");
  expect(chart.raw.zhiFu.position).toBe(9);
  expect(chart.palaceMap[9].liuYiJiXing.hasJiXing).toBe(false);
  expect(chart.palaceMap[4].heavenlyStem).toBe("癸");
  const check = evaluateQimenPatterns(chart).checks.find(({ id }) => id === "liu_yi_ji_xing");
  expect(check?.requirement).toContain("逐宫法");
  expect(check?.positions).toContain(4);
});

it("checks 六仪击刑 on both stems of a hosted palace", () => {
  const chart = buildChart({ datetime: "2026-01-05T00:00", timeZone: "Asia/Shanghai" });
  const palace = chart.palaceMap[2];
  expect(palace.heavenlyStem).toEqual(["己", "壬"]);
  expect(palace.liuYiJiXing).toMatchObject({ hasJiXing: true, type: "甲戌己" });
  expect(evaluateQimenPatterns(chart).checks.find(({ id }) => id === "liu_yi_ji_xing")?.positions).toContain(2);
});

it("reproduces the winter-solstice Yang One 伏吟 and 反吟 examples", () => {
  const qimenSettings = { ...DEFAULT_QIMEN_SETTINGS, solarTerm: "冬至", juNumber: 1 } as const;
  const patternsAt = (hour: string) => evaluateQimenPatterns(buildChart({
    datetime: `2026-01-05T${hour}:00`, timeZone: "Asia/Shanghai", qimenSettings,
  })).formed.filter((check) => check.group === "伏吟反吟").map((check) => check.id);
  expect(patternsAt("00")).toEqual(["fu_yin_star", "fu_yin_gate", "fu_yin_zhi_fu"]);
  expect(patternsAt("02")).toEqual(["fan_yin_star", "fan_yin_zhi_fu"]);
});

it("keeps the three zha palace, global and catalog results consistent with heaven stems", () => {
  const rules = [
    ["zhen_zha", "太阴"], ["xiu_zha", "六合"], ["chong_zha", "九地"],
  ];
  let formed = 0;
  for (let day = 1; day <= 8; day += 1) {
    for (let hour = 0; hour < 24; hour += 2) {
      const chart = buildChart({
        datetime: `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:30`,
        timeZone: "Asia/Shanghai",
      });
      const report = evaluateQimenPatterns(chart);
      for (const [name, deity] of rules) {
        const id = "patterns.san_za_wu_jia." + name;
        const expected = chart.raw.palaces.filter(palace => {
          const stems = Array.isArray(palace.heavenlyStem) ? palace.heavenlyStem : [palace.heavenlyStem];
          return stems.some(stem => ["乙", "丙", "丁"].includes(stem))
            && ["开门", "休门", "生门"].includes(palace.gate) && palace.deity === deity;
        }).map(palace => palace.position);
        formed += expected.length;
        expect(chart.raw.palaces.filter(p => (p.auspiciousPatterns ?? []).some(pattern => pattern.id === id))
          .map(p => p.position)).toEqual(expected);
        expect((chart.raw.specialPatterns.auspiciousPatterns ?? []).filter(pattern => pattern.id === id)
          .map(pattern => pattern.position)).toEqual(expected);
        expect(report.checks.find(check => check.id === name)?.positions).toEqual(expected);
      }
    }
  }
  expect(formed).toBeGreaterThan(0);
});

it("keeps corrected dragon, tiger and ghost labels consistent across chart surfaces", () => {
  const ids = ["long", "hu", "gui"];
  for (let day = 1; day <= 8; day += 1) {
    for (let hour = 0; hour < 24; hour += 2) {
      const chart = buildChart({
        datetime: `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:30`,
        timeZone: "Asia/Shanghai",
      });
      const report = evaluateQimenPatterns(chart);
      for (const id of ids) {
        const engineId = "patterns.jiu_dun." + id + "_dun";
        const positions = report.checks.find(item => item.id === "jiu_dun_" + id)?.positions;
        expect(chart.raw.palaces.filter(p => (p.auspiciousPatterns ?? []).some(item => item.id === engineId))
          .map(p => p.position)).toEqual(positions);
        expect((chart.raw.specialPatterns.auspiciousPatterns ?? []).filter(item => item.id === engineId)
          .map(item => item.position)).toEqual(positions);
      }
    }
  }
});


it("synchronizes promotion and salary palace labels with independent heaven-stem conditions", () => {
  for (let day = 1; day <= 8; day += 1) {
    for (let hour = 0; hour < 24; hour += 2) {
      const chart = buildChart({
        datetime: `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:30`,
        timeZone: "Asia/Shanghai",
      });
      const report = evaluateQimenPatterns(chart);
      for (const [name, map, needsGate] of [
        ["qi_you_lu_wei", { 3: "乙", 4: "丙", 9: "丁" }, true],
        ["san_qi_sheng_dian", { 3: "乙", 9: "丙", 7: "丁" }, false],
      ] as const) {
        const expected = chart.raw.palaces.filter(p => {
          const stem = (map as Record<number, string>)[p.position];
          const stems = Array.isArray(p.heavenlyStem) ? p.heavenlyStem : [p.heavenlyStem];
          return stem && stems.some(value => value === stem) && (!needsGate || ["开门", "休门", "生门"].includes(p.gate));
        }).map(p => p.position);
        const id = "patterns.common." + name;
        expect(report.checks.find(item => item.id === name)?.positions).toEqual(expected);
        expect(chart.raw.palaces.filter(p => (p.auspiciousPatterns ?? []).some(item => item.id === id)).map(p => p.position)).toEqual(expected);
        expect((chart.raw.specialPatterns.auspiciousPatterns ?? []).filter(item => item.id === id).map(item => item.position)).toEqual(expected);
      }
    }
  }
});


it("synchronizes the Jia palace, summary and catalog matches against heaven-stem clauses", () => {
  const rules = [
    ["di_jia", ["丁", "己", "癸"], "杜门", ["九地", "太阴", "六合"]],
    ["ren_jia", ["壬"], "惊门", ["九天"]],
    ["shen_jia", ["丁", "己", "癸"], "伤门", ["九地"]],
    ["gui_jia", ["丁", "己", "癸"], "死门", ["九地"]],
  ] as const;
  let formed = 0;
  for (let day = 1; day <= 8; day += 1) {
    for (let hour = 0; hour < 24; hour += 2) {
      const chart = buildChart({
        datetime: `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:30`,
        timeZone: "Asia/Shanghai",
      });
      const report = evaluateQimenPatterns(chart);
      for (const [name, stems, gate, deities] of rules) {
        const expected = chart.raw.palaces.filter(p => {
          const heaven = Array.isArray(p.heavenlyStem) ? p.heavenlyStem : [p.heavenlyStem];
          return heaven.some(value => stems.some(stem => stem === value))
            && p.gate === gate && deities.some(deity => deity === p.deity);
        }).map(p => p.position);
        formed += expected.length;
        const id = "patterns.san_za_wu_jia." + name;
        expect(report.checks.find(item => item.id === name)?.positions).toEqual(expected);
        expect(chart.raw.palaces.filter(p => (p.auspiciousPatterns ?? []).some(item => item.id === id)).map(p => p.position)).toEqual(expected);
        expect((chart.raw.specialPatterns.auspiciousPatterns ?? []).filter(item => item.id === id).map(item => item.position)).toEqual(expected);
      }
    }
  }
  expect(formed).toBeGreaterThan(0);
});
