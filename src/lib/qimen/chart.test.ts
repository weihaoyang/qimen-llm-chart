import { describe, expect, it } from "vitest";
import { QimenChart } from "3meta";
import { buildChart, buildQimenChartFromProfile } from "./chart";
import { evaluateQimenPatterns } from "./patterns";
import { DEFAULT_QIMEN_SETTINGS, QIMEN_SOLAR_TERMS } from "./settings";

describe("buildChart", () => {
  it("compares the six 玉女守门 hours from 宝鉴 across all ju and both dun", () => {
    const hours = new Set(["庚午", "己卯", "戊子", "丁酉", "丙午", "乙卯"]);
    const seen = new Set<string>();
    const discrepancies: string[] = [];
    let centerStem = 0, centerGate = 0, both = 0;
    for (const dunType of ["yang", "yin"] as const) for (let juNumber = 1; juNumber <= 9; juNumber++) {
      for (let day = 1; day <= 10; day++) for (let hour = 0; hour < 24; hour += 2) {
        const datetime = `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
        const chart = buildChart({ datetime, timeZone: "Asia/Shanghai", qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm: dunType === "yang" ? "冬至" : "夏至", dunType, juNumber: juNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 } });
        const pillar = chart.raw.fourPillars.hour.stem + chart.raw.fourPillars.hour.branch;
        const report = evaluateQimenPatterns(chart).checks.find(item => item.id === "yu_nu_shou_men")!;
        const expected = hours.has(pillar);
        if (expected) seen.add(pillar);
        if ((report.status === "成立") !== expected) discrepancies.push(`${dunType} ${juNumber} ${datetime} ${pillar} ${chart.raw.zhiShi.position} ${chart.raw.zhiShi.gate} ${expected ? "time-only" : "palace-only"}`);
        if ((report.status === "成立") !== expected) {
          const ownStem = (p: typeof chart.raw.palaces[number]) => Array.isArray(p.earthlyStem) ? p.earthlyStem[0] : p.earthlyStem;
          const origin = chart.raw.palaces.find(p => ownStem(p) === chart.raw.zhiFu.heavenlyStem)!.position;
          const branches = "子丑寅卯辰巳午未申酉戌亥";
          const steps = (branches.indexOf(chart.raw.fourPillars.hour.branch) - branches.indexOf(chart.raw.timeInfo.xunShou[1]) + 12) % 12;
          const rawPosition = ((origin - 1 + (dunType === "yang" ? steps : -steps)) % 9 + 9) % 9 + 1;
          const middleStem = ownStem(chart.raw.palaces.find(p => p.position === 5)!) === "丁";
          centerStem += Number(middleStem); centerGate += Number(rawPosition === 5); both += Number(middleStem && rawPosition === 5);
          expect(middleStem || rawPosition === 5).toBe(true);
          expect(chart.raw.zhiShi.position).toBe(dunType === "yang" ? 8 : 2);
          expect(evaluateQimenPatterns(chart).sourceNotes.find(note => note.startsWith("玉女守门"))).toContain(middleStem ? "地丁原在中五宫" : "值使原到中五宫");
        }
        expect(evaluateQimenPatterns(chart).sourceNotes.some(note => note.startsWith("玉女守门")), `${dunType} ${juNumber} ${datetime}`).toBe((report.status === "成立") !== expected);
      }
    }
    expect(seen).toEqual(hours);
    expect(discrepancies.filter(item => item.endsWith("time-only"))).toHaveLength(0);
    expect(discrepancies.filter(item => item.endsWith("palace-only"))).toHaveLength(56);
    expect(discrepancies).toContain("yang 2 2026-01-01T00:00 丙子 8 伤门 palace-only");
    expect([centerStem, centerGate, both]).toEqual([28, 28, 0]);
  });
  it("counts 值使 from 中五 while borrowing the 坤 gate", () => {
    const chart = buildChart({ datetime: "2026-01-03T12:00", timeZone: "Asia/Shanghai", qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm: "冬至", dunType: "yang", juNumber: 1 } });
    expect(chart.raw.zhiShi).toMatchObject({ gate: "死门", position: 7 });
    expect(chart.raw.palaces.find(p => p.position === 7)?.earthlyStem).toBe("丁");
    expect(evaluateQimenPatterns(chart).checks.find(item => item.id === "yu_nu_shou_men")?.status).toBe("成立");
  });
  it("discloses the separate hosts used by the earth and celestial layers", () => {
    const settings = { ...DEFAULT_QIMEN_SETTINGS, solarTerm: "冬至" as const, dunType: "yang" as const, juNumber: 1 as const };
    const chart = buildChart({ datetime: "2026-01-01T12:00", timeZone: "Asia/Shanghai", qimenSettings: settings });
    expect(chart.raw.fourPillars.hour.stem).toBe("壬");
    expect(chart.raw.palaces.find(p => p.position === 5)?.earthlyStem).toBe("壬");
    expect(chart.raw.palaces.find(p => p.position === 8)?.earthlyStem).toContain("壬");
    expect(chart.raw.zhiFu.position).toBe(2);
    expect(evaluateQimenPatterns(chart).sourceNotes.join(" ")).toContain("地盘中五寄艮八；天禽随天芮、时干中五寄坤二");
    const yin = buildChart({ datetime: "2026-01-01T12:00", timeZone: "Asia/Shanghai", qimenSettings: { ...settings, solarTerm: "夏至", dunType: "yin" } });
    expect(evaluateQimenPatterns(yin).sourceNotes.some(note => note.startsWith("阳遁寄宫"))).toBe(false);
  });
  it("shows 丙生临戊 天遁 and its bird pattern in the same real palace", () => {
    const chart = buildChart({ datetime: "2026-01-01T20:00", timeZone: "Asia/Shanghai" });
    const checks = evaluateQimenPatterns(chart).checks;
    const tian = checks.find(item => item.id === "jiu_dun_tian")!;
    expect(tian.positions).toContain(4);
    expect(tian.evidence.join(" ")).toContain("丙生临地戊（行军要略）");
    expect(checks.find(item => item.id === "fei_niao_die_xue")?.positions).toContain(4);
    const id = "patterns.jiu_dun.tian_dun";
    expect(chart.raw.palaces.find(p => p.position === 4)?.auspiciousPatterns?.filter(p => p.id === id)).toHaveLength(1);
    expect(chart.raw.specialPatterns.auspiciousPatterns?.filter(p => p.id === id).map(p => p.position)).toContain(4);
  });
  it("reconstructs both classical 天遁 examples using their stated ju and time pillars", () => {
    const examples = [
      { datetime: "2026-01-01T18:00", dayStem: "乙", hour: "乙酉", dunType: "yang", solarTerm: "冬至", juNumber: 4, palace: 1, chief: "天心", gate: "开门", gatePosition: 7 },
      { datetime: "2026-01-04T16:00", dayStem: "戊", hour: "庚申", dunType: "yin", solarTerm: "夏至", juNumber: 6, palace: 9, chief: "天蓬", gate: "休门", gatePosition: 4 },
    ] as const;
    for (const x of examples) {
      const chart = buildChart({ datetime: x.datetime, timeZone: "Asia/Shanghai", qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm: x.solarTerm, dunType: x.dunType, juNumber: x.juNumber } });
      expect(chart.raw.fourPillars.day.stem).toBe(x.dayStem);
      expect(chart.raw.fourPillars.hour.stem + chart.raw.fourPillars.hour.branch).toBe(x.hour);
      expect(chart.raw.zhiFu.star).toBe(x.chief);
      expect(chart.raw.zhiShi).toMatchObject({ gate: x.gate, position: x.gatePosition });
      const p = chart.raw.palaces.find(p => p.position === x.palace)!;
      expect(p.gate).toBe("生门");
      expect([p.heavenlyStem].flat()).toContain("丙");
      expect([p.earthlyStem].flat()).toContain("丁");
      const check = evaluateQimenPatterns(chart).checks.find(item => item.id === "jiu_dun_tian")!;
      expect(check.positions).toContain(x.palace);
      expect(check.evidence.join(" ")).toContain("丙生临地丁");
      const id = "patterns.jiu_dun.tian_dun";
      expect(p.auspiciousPatterns?.filter(item => item.id === id)).toHaveLength(1);
      expect(chart.raw.specialPatterns.auspiciousPatterns?.some(item => item.id === id && item.position === x.palace)).toBe(true);
    }
  });
  it("records the 九遁变化法 开门 variant on a real chart", () => {
    const chart = buildChart({ datetime: "2026-01-03T04:00", timeZone: "Asia/Shanghai" });
    const p = chart.raw.palaces.find(p => p.position === 1)!;
    expect(p.gate).toBe("开门");
    expect([p.heavenlyStem].flat()).toContain("丙");
    expect([p.earthlyStem].flat()).toContain("丁");
    const check = evaluateQimenPatterns(chart).checks.find(item => item.id === "jiu_dun_tian")!;
    expect(check.positions).toContain(1);
    expect(check.evidence.join(" ")).toContain("丙开门临地丁（九遁变化法）");
  });
  it("checks sourced 天遁 pairings across 96 real charts and both raw outputs", () => {
    const values = (value: unknown): string[] => Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    for (let day = 1; day <= 10; day++) for (let hour = 0; hour < 24; hour += 2) {
      const datetime = `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
      const chart = buildChart({ datetime, timeZone: "Asia/Shanghai" });
      const expected = chart.raw.palaces.filter(p => values(p.heavenlyStem).includes("丙") && ((p.gate === "生门" && values(p.earthlyStem).some(stem => ["丁", "戊"].includes(stem))) || (["开门", "休门"].includes(p.gate) && values(p.earthlyStem).includes("丁")))).map(p => p.position);
      expect(evaluateQimenPatterns(chart).checks.find(p => p.id === "jiu_dun_tian")?.positions, datetime).toEqual(expected);
      const id = "patterns.jiu_dun.tian_dun";
      expect(chart.raw.palaces.filter(p => p.auspiciousPatterns?.some(q => q.id === id)).map(p => p.position), datetime).toEqual(expected);
      expect((chart.raw.specialPatterns.auspiciousPatterns ?? []).filter(p => p.id === id).map(p => p.position), datetime).toEqual(expected);
    }
  });
  it("checks both 人遁 readings across 96 real charts and all outputs", () => {
    const values = (value: unknown): string[] => Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    for (let day = 1; day <= 8; day++) for (let hour = 0; hour < 24; hour += 2) {
      const datetime = `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
      const chart = buildChart({ datetime, timeZone: "Asia/Shanghai" });
      const expected = chart.raw.palaces.filter(p => values(p.heavenlyStem).includes("丁") && p.gate === "休门" && (p.deity === "太阴" || values(p.earthlyStem).includes("丙"))).map(p => p.position);
      expect(evaluateQimenPatterns(chart).checks.find(p => p.id === "jiu_dun_ren")?.positions, datetime).toEqual(expected);
      const id = "patterns.jiu_dun.ren_dun";
      expect(chart.raw.palaces.filter(p => p.auspiciousPatterns?.some(q => q.id === id)).map(p => p.position), datetime).toEqual(expected);
      expect((chart.raw.specialPatterns.auspiciousPatterns ?? []).filter(p => p.id === id).map(p => p.position), datetime).toEqual(expected);
    }
  });
  it("labels 龙遁 sources consistently across actual chart outputs", () => {
    let kanHits = 0, guiHits = 0;
    const values = (value: unknown): string[] => Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    for (let day = 1; day <= 10; day++) for (let hour = 0; hour < 24; hour += 2) {
      const datetime = `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
      const chart = buildChart({ datetime, timeZone: "Asia/Shanghai" });
      const expected = chart.raw.palaces.filter(p => values(p.heavenlyStem).includes("乙") && ((p.position === 1 && ["开门", "休门", "生门"].includes(p.gate as string)) || (p.gate === "休门" && values(p.earthlyStem).includes("癸"))));
      const report = evaluateQimenPatterns(chart).checks.find(p => p.id === "jiu_dun_long")!;
      expect(report.positions, datetime).toEqual(expected.map(p => p.position));
      const id = "patterns.jiu_dun.long_dun";
      const summary = (chart.raw.specialPatterns.auspiciousPatterns ?? []).filter(p => p.id === id);
      expect(summary.map(p => p.position), datetime).toEqual(expected.map(p => p.position));
      for (const p of expected) {
        const isKan = p.position === 1, isGui = p.gate === "休门" && values(p.earthlyStem).includes("癸");
        kanHits += Number(isKan); guiHits += Number(isGui);
        const record = p.auspiciousPatterns?.filter(item => item.id === id) ?? [];
        expect(record).toHaveLength(1);
        expect(record[0].description?.includes("乙合三吉门临坎（艺术典704）")).toBe(isKan);
        expect(record[0].description?.includes("艺术典704一云")).toBe(isKan && p.gate === "休门");
        expect(record[0].description?.includes("奇门吉格")).toBe(isGui);
        expect(summary.find(item => item.position === p.position)?.description).toBe(record[0].description);
      }
    }
    expect(kanHits).toBeGreaterThan(0);
    expect(guiHits).toBeGreaterThan(0);
  });
  it("compares the 人遁 example across 艺术典 704 and 705", () => {
    const chart = buildChart({ datetime: "2026-01-01T00:00", timeZone: "Asia/Shanghai", qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm: "冬至", dunType: "yang", juNumber: 7 } });
    expect(chart.raw.fourPillars.day.stem).toBe("乙");
    expect(chart.raw.fourPillars.hour.stem + chart.raw.fourPillars.hour.branch).toBe("丙子");
    expect(chart.raw.zhiFu).toMatchObject({ star: "天任", heavenlyStem: "己", position: 2 });
    expect(chart.raw.zhiShi).toMatchObject({ gate: "生门", position: 1 });
    const palace = chart.raw.palaces.find(p => p.position === 6)!;
    expect(palace.gate).toBe("休门");
    expect([palace.heavenlyStem].flat()).toContain("丁");
    expect([palace.earthlyStem].flat()).toContain("乙");
    expect(palace.deity).toBe("太阴");
    expect(evaluateQimenPatterns(chart).checks.find(p => p.id === "jiu_dun_ren")?.positions).toContain(6);
  });
  it("reconstructs the two 地遁 examples in 遁甲演义 without dropping 乙 from the rule", () => {
    const examples = [
      { datetime: "2026-01-02T06:00", dayStem: "丙", hour: "辛卯", dunType: "yang", solarTerm: "冬至", juNumber: 1, palace: 2, chief: "天冲" },
      { datetime: "2026-01-05T04:00", dayStem: "己", hour: "丙寅", dunType: "yin", solarTerm: "夏至", juNumber: 9, palace: 8, chief: "天英" },
    ] as const;
    for (const example of examples) {
      const chart = buildChart({ datetime: example.datetime, timeZone: "Asia/Shanghai", qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm: example.solarTerm, dunType: example.dunType, juNumber: example.juNumber } });
      expect(chart.raw.fourPillars.day.stem).toBe(example.dayStem);
      expect(chart.raw.fourPillars.hour.stem + chart.raw.fourPillars.hour.branch).toBe(example.hour);
      expect(chart.raw.zhiFu.star).toBe(example.chief);
      const palace = chart.raw.palaces.find(p => p.position === example.palace)!;
      expect(palace).toMatchObject({ gate: "开门", heavenlyStem: "乙", earthlyStem: "己" });
      expect(evaluateQimenPatterns(chart).checks.find(p => p.id === "jiu_dun_di")?.positions).toContain(example.palace);
      expect(palace.auspiciousPatterns?.some(p => p.id === "patterns.jiu_dun.di_dun")).toBe(true);
    }
  });
  it("reports 丙开临巽 风遁 consistently in the registry and both chart outputs", () => {
    const chart = buildChart({ datetime: "2026-01-04T06:00", timeZone: "Asia/Shanghai" });
    const check = evaluateQimenPatterns(chart).checks.find(item => item.id === "jiu_dun_feng")!;
    expect(check.positions).toEqual([4]);
    expect(check.evidence[0]).toContain("丙开临巽（另式）");
    expect(check.evidence[0]).not.toContain("乙合三吉门临巽");
    const id = "patterns.jiu_dun.feng_dun";
    expect(chart.raw.palaces.find(p => p.position === 4)?.auspiciousPatterns?.filter(p => p.id === id)).toHaveLength(1);
    expect(chart.raw.specialPatterns.auspiciousPatterns?.filter(p => p.id === id).map(p => p.position)).toEqual([4]);
  });
  it("checks 风遁 readings across 96 real charts and both raw outputs", () => {
    const values = (value: unknown): string[] => Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    for (let day = 1; day <= 8; day++) for (let hour = 0; hour < 24; hour += 2) {
      const datetime = `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
      const chart = buildChart({ datetime, timeZone: "Asia/Shanghai" });
      const expected = chart.raw.palaces.filter(p => p.position === 4 && (
        (values(p.heavenlyStem).includes("乙") && ["开门", "休门", "生门"].includes(p.gate as string))
        || (values(p.heavenlyStem).includes("丙") && p.gate === "开门")
      )).map(p => p.position);
      expect(evaluateQimenPatterns(chart).checks.find(p => p.id === "jiu_dun_feng")?.positions, datetime).toEqual(expected);
      const id = "patterns.jiu_dun.feng_dun";
      expect(chart.raw.palaces.filter(p => p.auspiciousPatterns?.some(q => q.id === id)).map(p => p.position), datetime).toEqual(expected);
      expect((chart.raw.specialPatterns.auspiciousPatterns ?? []).filter(p => p.id === id).map(p => p.position), datetime).toEqual(expected);
    }
  });
  it("recognizes 乙开坤 云遁 variant on a real chart without falsely adding 地辛", () => {
    const chart = buildChart({ datetime: "2026-01-06T18:00", timeZone: "Asia/Shanghai" });
    const check = evaluateQimenPatterns(chart).checks.find(item => item.id === "jiu_dun_yun")!;
    expect(check.positions).toEqual([2]);
    expect(check.evidence[0]).toContain("天乙 地戊 开门");
    expect(check.evidence[0]).toContain("乙开临坤（一云）");
    expect(check.evidence[0]).not.toContain("乙合三吉门临地辛");
    const id = "patterns.jiu_dun.yun_dun";
    expect(chart.raw.palaces.find(p => p.position === 2)?.auspiciousPatterns?.filter(p => p.id === id)).toHaveLength(1);
    expect(chart.raw.specialPatterns.auspiciousPatterns?.filter(p => p.id === id).map(p => p.position)).toEqual([2]);
  });
  it("checks both 云遁 readings across 96 real charts and all outputs", () => {
    const values = (value: unknown): string[] => Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    for (let day = 1; day <= 8; day++) for (let hour = 0; hour < 24; hour += 2) {
      const datetime = `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
      const chart = buildChart({ datetime, timeZone: "Asia/Shanghai" });
      const expected = chart.raw.palaces.filter(p => values(p.heavenlyStem).includes("乙") && (
        (["开门", "休门", "生门"].includes(p.gate as string) && values(p.earthlyStem).includes("辛"))
        || (p.position === 2 && p.gate === "开门")
      )).map(p => p.position);
      const check = evaluateQimenPatterns(chart).checks.find(p => p.id === "jiu_dun_yun")!;
      expect(check.positions, datetime).toEqual(expected);
      const id = "patterns.jiu_dun.yun_dun";
      expect(chart.raw.palaces.filter(p => p.auspiciousPatterns?.some(q => q.id === id)).map(p => p.position), datetime).toEqual(expected);
      expect((chart.raw.specialPatterns.auspiciousPatterns ?? []).filter(p => p.id === id).map(p => p.position), datetime).toEqual(expected);
    }
  });
  it("distinguishes the real 欢怡 and 相佐 palace examples", () => {
    const xiang = evaluateQimenPatterns(buildChart({ datetime: "2026-01-01T00:00", timeZone: "Asia/Shanghai" }));
    expect(xiang.checks.find(check => check.id === "xiang_zuo")?.positions).toEqual([2]);
    expect(xiang.checks.find(check => check.id === "huan_yi")?.positions).not.toContain(2);
    const huan = evaluateQimenPatterns(buildChart({ datetime: "2026-01-01T10:00", timeZone: "Asia/Shanghai" }));
    expect(huan.checks.find(check => check.id === "huan_yi")?.positions).toEqual([8]);
    expect(huan.checks.find(check => check.id === "xiang_zuo")?.positions).not.toContain(8);
  });
  it("keeps 欢怡 and 相佐 consistent across registry, palace marks and summary on real charts", () => {
    let huanYiHits = 0;
    let xiangZuoHits = 0;
    const values = (item: unknown): string[] => Array.isArray(item) ? item : typeof item === "string" ? [item] : [];
    for (let day = 1; day <= 8; day++) for (let hour = 0; hour < 24; hour += 2) {
      const datetime = `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
      const chart = buildChart({ datetime, timeZone: "Asia/Shanghai" });
      const report = evaluateQimenPatterns(chart);
      const cases = [
        { key: "huan_yi", expected: chart.raw.palaces.filter(p => values(p.heavenlyStem).some(s => "乙丙丁".includes(s)) && values(p.earthlyStem).includes(chart.raw.zhiFu.heavenlyStem)).map(p => p.position) },
        { key: "xiang_zuo", expected: chart.raw.palaces.filter(p => p.position === chart.raw.zhiFu.position && values(p.earthlyStem).some(s => "乙丙丁".includes(s))).map(p => p.position) },
      ];
      huanYiHits += cases[0].expected.length;
      xiangZuoHits += cases[1].expected.length;
      for (const { key, expected } of cases) {
        const id = `patterns.common.${key}`;
        expect(report.checks.find(check => check.id === key)?.positions, datetime).toEqual(expected);
        expect(chart.raw.palaces.filter(p => p.auspiciousPatterns?.some(pattern => pattern.id === id)).map(p => p.position), datetime).toEqual(expected);
        expect((chart.raw.specialPatterns.auspiciousPatterns ?? []).filter(p => p.id === id).map(p => p.position), datetime).toEqual(expected);
      }
    }
    expect(huanYiHits).toBeGreaterThan(0);
    expect(xiangZuoHits).toBeGreaterThan(0);
  });
  it("names the actual 三奇受刑 cause on adjacent real charts", () => {
    for (const [datetime, expected] of [["2026-01-01T00:00", "1宫：丁临坎"], ["2026-01-01T02:00", "1宫：丙临坎"]] as const) {
      const chart = buildChart({ datetime, timeZone: "Asia/Shanghai" });
      const report = evaluateQimenPatterns(chart);
      const check = report.checks.find(({ id }) => id === "san_qi_shou_xing")!;
      expect(check.evidence).toContain(expected);
      const id = "patterns.bad.san_qi_shou_xing";
      const palaceHits = chart.raw.palaces.filter(p => p.inauspiciousPatterns?.some(pattern => pattern.id === id)).map(p => p.position);
      const overview = (chart.raw.specialPatterns.inauspiciousPatterns ?? []).filter(pattern => pattern.id === id);
      expect(palaceHits.sort()).toEqual([...check.positions].sort());
      expect(overview.map(pattern => pattern.position).sort()).toEqual([...check.positions].sort());
      expect(overview.find(pattern => pattern.position === 1)?.description).toContain(expected.split("：")[1]);
    }
  });
  it("recognizes chief over earth 己 without requiring a literal 甲 on the heaven plate", () => {
    const chart = buildChart({ datetime: "2026-01-02T08:00", timeZone: "Asia/Shanghai" });
    expect(chart.raw.timeInfo.xunShou).toBe("甲申");
    expect(chart.raw.zhiFu.position).toBe(8);
    const check = evaluateQimenPatterns(chart).checks.find(({ id }) => id === "qi_yi_xiang_he")!;
    expect(check.positions).toContain(8);
    expect(check.evidence.join(" ")).toContain("值符加己（甲己）");
    expect(chart.raw.palaces.find(({ position }) => position === 8)?.gate).toBe("开门");
  });
  it("exposes both 门宫和义 naming conventions on the same chart", () => {
    const report = evaluateQimenPatterns(buildChart({ datetime: "2026-01-01T06:00", timeZone: "Asia/Shanghai" }));
    const check = report.checks.find(({ id }) => id === "men_gong_he_yi")!;
    expect(check.evidence).toContain("休门生4宫（现和/旨归义）");
    expect(check.evidence).toContain("8宫生惊门（现义/旨归和）");
  });
  it("keeps two sourced 天网 conditions distinct while counting one catalog entry", () => {
    const cases = [
      { datetime: "2026-01-01T00:00", position: 9, evidence: ["癸加癸"], absent: "值符加地癸" },
      { datetime: "2026-01-01T14:00", position: 9, evidence: ["值符加地癸"], absent: "癸加癸" },
      { datetime: "2026-01-04T04:00", position: 9, evidence: ["癸加癸", "值符加地癸"], absent: "不存在的条件" },
    ];
    for (const item of cases) {
      const chart = buildChart({ datetime: item.datetime, timeZone: "Asia/Shanghai" });
      const report = evaluateQimenPatterns(chart);
      const hits = report.formed.filter(({ id }) => id === "tian_wang_si_zhang");
      const overview = (chart.raw.specialPatterns.inauspiciousPatterns ?? []).filter(({ id }) => id === "patterns.bad.tian_wang_si_zhang");
      const palaceHits = chart.raw.palaces.flatMap((palace) => (palace.inauspiciousPatterns ?? []).filter(({ id }) => id === "patterns.bad.tian_wang_si_zhang"));
      expect(overview.map(({ position }) => position)).toEqual(hits[0].positions);
      expect(palaceHits.map(({ position }) => position)).toEqual(hits[0].positions);
      for (const expected of item.evidence) expect(overview[0].description).toContain(expected);
      expect(hits).toHaveLength(1);
      expect(hits[0].positions).toContain(item.position);
      for (const expected of item.evidence) expect(hits[0].evidence.join(" ")).toContain(expected);
      expect(hits[0].evidence.join(" ")).not.toContain(item.absent);
    }
    const neither = evaluateQimenPatterns(buildChart({ datetime: "2026-01-01T02:00", timeZone: "Asia/Shanghai" }));
    expect(neither.checks.find(({ id }) => id === "tian_wang_si_zhang")?.status).toBe("未成立");
  });
  it("counts 日格 and its 伏干格 alias once on a real chart", () => {
    const chart = buildChart({ datetime: "2026-01-01T02:00", timeZone: "Asia/Shanghai" });
    const report = evaluateQimenPatterns(chart);
    expect(chart.raw.fourPillars.day.stem).toBe("乙");
    expect(report.formed.filter(({ id }) => id === "ri_ge")).toMatchObject([{ name: "日格（伏干格）", positions: [3] }]);
    expect(report.checks.some(({ id }) => id === "fu_gan_ge")).toBe(false);
  });

  it("finds both day-stem patterns on a 甲午 day using 辛 rather than the hour's hidden instrument", () => {
    const chart = buildChart({ datetime: "2026-01-20T22:00", timeZone: "Asia/Shanghai" });
    expect(chart.raw.fourPillars.day).toMatchObject({ stem: "甲", branch: "午" });
    expect(chart.raw.fourPillars.hour).toMatchObject({ stem: "乙", branch: "亥" });
    const checks = evaluateQimenPatterns(chart).checks;
    expect(checks.find(({ id }) => id === "ri_ge")?.positions).toEqual([6]);
    expect(checks.find(({ id }) => id === "fei_gan_ge")?.positions).toEqual([8]);
    expect(checks.find(({ id }) => id === "ri_ge")?.evidence[0]).toContain("甲午日遁辛");
  });
  it("distinguishes Taiyin and earth-Bing versions of Ren Dun on actual charts", () => {
    // 艺术典705卷取丁休太阴，707卷另列上丁中休下丙，独立列明命中依据。
    for (const item of [
      { datetime: "2026-01-02T12:00", position: 1, earth: "丁", deity: "太阴", reason: "艺术典705", absent: "艺术典707" },
      { datetime: "2026-01-04T20:00", position: 2, earth: "丙", deity: "白虎", reason: "艺术典707", absent: "艺术典705" },
    ] as const) {
      const chart = buildChart({ datetime: item.datetime, timeZone: "Asia/Shanghai" });
      const palace = chart.raw.palaces.find(p => p.position === item.position)!;
      expect(palace.heavenlyStem).toBe("丁");
      expect(palace.earthlyStem).toBe(item.earth);
      expect(palace.gate).toBe("休门");
      expect(palace.deity).toBe(item.deity);
      const check = evaluateQimenPatterns(chart).checks.find(p => p.id === "jiu_dun_ren")!;
      expect(check.positions).toContain(item.position);
      const evidence = check.evidence[check.positions.indexOf(item.position)];
      expect(evidence).toContain(item.reason);
      expect(evidence).not.toContain(item.absent);
      const id = "patterns.jiu_dun.ren_dun";
      expect(palace.auspiciousPatterns?.find(p => p.id === id)?.description).toContain(item.reason);
      expect(chart.raw.specialPatterns.auspiciousPatterns?.find(p => p.id === id && p.position === item.position)?.description).toContain(item.reason);
    }
  });

  it("reproduces two classical tomb palace examples while keeping school-specific decisions distinct", () => {
    // 《古今图书集成》艺术典705：丙辛日阴四局庚寅时丙入六；阳一局辛卯时丁入六。
    const cases = [
      { datetime: "2026-01-02T04:00", solarTerm: "夏至", dunType: "yin", juNumber: 4, hour: "庚寅", stem: "丙", selectedHit: true },
      { datetime: "2026-01-02T06:00", solarTerm: "冬至", dunType: "yang", juNumber: 1, hour: "辛卯", stem: "丁", selectedHit: false },
    ] as const;
    for (const item of cases) {
      const chart = buildChart({ datetime: item.datetime, timeZone: "Asia/Shanghai", qimenSettings: { ...DEFAULT_QIMEN_SETTINGS, solarTerm: item.solarTerm, dunType: item.dunType, juNumber: item.juNumber } });
      expect(chart.raw.fourPillars.day.stem).toBe("丙");
      expect(chart.raw.fourPillars.hour.stem + chart.raw.fourPillars.hour.branch).toBe(item.hour);
      expect(chart.raw.ju.number).toBe(item.juNumber);
      expect(chart.raw.palaces.find(p => p.position === 6)?.heavenlyStem).toBe(item.stem);
      const check = evaluateQimenPatterns(chart).checks.find(p => p.id === "san_qi_ru_mu")!;
      expect(check.positions.includes(6)).toBe(item.selectedHit);
      const id = "patterns.bad.san_qi_ru_mu";
      const palaceHits = chart.raw.palaces.filter(p => p.inauspiciousPatterns?.some(pattern => pattern.id === id)).map(p => p.position);
      const overviewHits = (chart.raw.specialPatterns.inauspiciousPatterns ?? []).filter(pattern => pattern.id === id).map(pattern => pattern.position);
      expect(palaceHits.sort()).toEqual([...check.positions].sort());
      expect(overviewHits.sort()).toEqual([...check.positions].sort());
    }
  });

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
  it("distinguishes the site's five-status winter solstice from the 統宗 eight-status table", () => {
    // 統宗卷二〈八节应八门旺相〉的冬至例，与本站子月五行法分列。
    const classical: Record<string, string> = { 休门: "旺", 生门: "绝", 伤门: "胎", 杜门: "没", 景门: "死", 死门: "囚", 惊门: "休", 开门: "废" };
    // 《奇门要略》NCL-06565 影印第 41 页；生门与《统宗》影印不同。
    const yaolue: Record<string, string> = { 休门: "旺", 生门: "相", 伤门: "胎", 杜门: "没", 景门: "死", 死门: "囚", 惊门: "休", 开门: "废" };
    const current: Record<string, string> = { 休门: "旺", 生门: "囚", 伤门: "相", 杜门: "相", 景门: "死", 死门: "囚", 惊门: "休", 开门: "休" };
    const { raw } = buildChart({ datetime: "2026-12-22T12:00", timeZone: "Asia/Shanghai" });
    const gates = raw.palaces.filter(p => p.position !== 5);
    expect(gates).toHaveLength(8);
    for (const palace of gates) expect(palace.status?.gate, palace.gate).toBe(current[palace.gate]);
    expect(Object.keys(classical).filter(gate => classical[gate] !== yaolue[gate])).toEqual(["生门"]);
    expect(Object.keys(classical).filter(gate => classical[gate] !== current[gate])).toEqual(["生门", "伤门", "杜门", "开门"]);
    expect(Object.keys(yaolue).filter(gate => yaolue[gate] !== current[gate])).toEqual(["生门", "伤门", "杜门", "开门"]);
  });
  it("compares each of the eight classical peak gates against the site's monthly statuses", () => {
    // 《统宗》列八节的当旺门；这里只比较当旺门，不推造其余状态。
    const cases = [
      ["2026-02-05", "生门", "死"], ["2026-03-21", "伤门", "旺"],
      ["2026-05-06", "杜门", "休"], ["2026-06-22", "景门", "旺"],
      ["2026-08-08", "死门", "休"], ["2026-09-24", "惊门", "旺"],
      ["2026-11-08", "开门", "休"], ["2026-12-22", "休门", "旺"],
    ] as const;
    for (const [date, gate, expected] of cases) {
      const { raw } = buildChart({ datetime: `${date}T12:00`, timeZone: "Asia/Shanghai" });
      expect(raw.palaces.find(p => p.position !== 5 && p.gate === gate)?.status?.gate, `${date} ${gate}`).toBe(expected);
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

it("keeps 甲柱 庚格 entries aligned between catalog and raw palace/overview on real charts", () => {
  const ids = [["year", "sui_ge"], ["month", "yue_ge"], ["hour", "shi_ge"]] as const;
  const observed = new Set<string>();
  for (let month = 1; month <= 12; month++) {
    for (const day of [1, 8, 15, 22]) {
      for (let hour = 0; hour < 24; hour += 2) {
        const datetime = `2024-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
        const chart = buildChart({ datetime, timeZone: "Asia/Shanghai" });
        const report = evaluateQimenPatterns(chart);
        for (const [key, id] of ids) {
          if (chart.raw.fourPillars[key].stem !== "甲") continue;
          const positions = report.checks.find((check) => check.id === id)!.positions;
          const fromPalaces = chart.raw.palaces.filter((palace) => palace.inauspiciousPatterns?.some((pattern) => pattern.id === `patterns.bad.${id}`)).map((palace) => palace.position);
          const fromOverview = (chart.raw.specialPatterns.inauspiciousPatterns ?? []).filter((pattern) => pattern.id === `patterns.bad.${id}`).map((pattern) => pattern.position);
          expect(fromPalaces.sort(), `${datetime} ${id}`).toEqual([...positions].sort());
          expect(fromOverview.sort(), `${datetime} ${id}`).toEqual([...positions].sort());
          if (positions.length) observed.add(key);
        }
      }
    }
  }
  expect([...observed].sort()).toEqual(["hour", "month", "year"]);
});

it("keeps day patterns consistent across the catalog, palace and overview", () => {
  for (const datetime of ["2026-01-01T02:00", "2026-01-20T22:00"]) {
    const chart = buildChart({ datetime, timeZone: "Asia/Shanghai" });
    const report = evaluateQimenPatterns(chart);
    for (const id of ["ri_ge", "fei_gan_ge"]) {
      const expected = report.checks.find((check) => check.id === id)!.positions;
      const palaceHits = chart.raw.palaces.filter((palace) => palace.inauspiciousPatterns?.some((pattern) => pattern.id === `patterns.bad.${id}`)).map((palace) => palace.position);
      const overviewHits = (chart.raw.specialPatterns.inauspiciousPatterns ?? []).filter((pattern) => pattern.id === `patterns.bad.${id}`).map((pattern) => pattern.position);
      expect(palaceHits.sort(), `${datetime} ${id}`).toEqual([...expected].sort());
      expect(overviewHits.sort(), `${datetime} ${id}`).toEqual([...expected].sort());
    }
    expect((chart.raw.specialPatterns.inauspiciousPatterns ?? []).some((pattern) => pattern.id === "patterns.bad.fu_gan_ge")).toBe(false);
  }
});

it("keeps 悖格 palace and overview consistent with the catalog across actual charts", () => {
  let formed = 0;
  let empty = 0;
  for (let hour = 0; hour < 24; hour += 2) {
    const chart = buildChart({ datetime: `2026-01-01T${String(hour).padStart(2, "0")}:00`, timeZone: "Asia/Shanghai" });
    const check = evaluateQimenPatterns(chart).checks.find((item) => item.id === "bei_ge")!;
    const id = "patterns.bad.bei_ge";
    const palaces = chart.raw.palaces.filter(p => p.inauspiciousPatterns?.some(pattern => pattern.id === id)).map(p => p.position);
    const overview = (chart.raw.specialPatterns.inauspiciousPatterns ?? []).filter(pattern => pattern.id === id);
    expect(palaces.sort()).toEqual([...check.positions].sort());
    expect(overview.map(pattern => pattern.position).sort()).toEqual([...check.positions].sort());
    if (check.positions.length) formed++; else empty++;
  }
  expect(formed).toBeGreaterThan(0);
  expect(empty).toBeGreaterThan(0);
});
