import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildTieshenChart, type TieshenSettings } from "./chart";
import {
  createTieshenTiaowenLibrary,
  deriveCorrectionMaps,
  getTiebanTiaowenLibrary,
  importTieshenTiaowen,
  lookupTiaowen,
  PERMISSIVE_DATA_LICENSES,
  TIEBAN_CORRECTION_ROW_TABLE,
  TIEBAN_DATA_SOURCE,
  TIEBAN_DESTINY_TABLE,
  TIEBAN_LETTER_ROW_TABLE,
  TIEBAN_TIAOWEN_COUNT,
  TIEBAN_TIAOWEN_SAMPLE,
  TIESHEN_VOLUMES,
  volumeOfTiaowen,
} from "./data";
import {
  applyJiaze,
  congNumberOf,
  correctionOf,
  groupOf,
  keGanNumberOf,
  keOfHourMinute,
  liunianLetterOf,
  sanYuanOf,
  wuShuJiGongHexagramOf,
  KE_NAMES,
  TIESHEN_UNIMPLEMENTED,
  TONE_NUMBERS,
} from "./rules";
import { serializeTieshenToCompactJson, serializeTieshenToStructuredText } from "./serializer";

const profile = (datetime = "1990-05-20T08:30", gender: "male" | "female" = "male") => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  // 显式固定时间与时基，避免宿主机时区影响测试期望值
  input.datetime = datetime;
  input.timeBasis = "civil";
  input.gender = gender;
  return normalizeProfileInput(input);
};

const settings: TieshenSettings = { queryDatetime: "2026-10-11T14:20" };

describe("tieshen data sources", () => {
  it("only ships permissively licensed data and declares its provenance", () => {
    expect(PERMISSIVE_DATA_LICENSES).toContain("Apache-2.0");
    expect(TIEBAN_DATA_SOURCE.license).toBe("Apache-2.0");
    expect(TIEBAN_DATA_SOURCE.repository).toBe("https://github.com/ForceMind/Tieban-Shenshu");
    expect(TIEBAN_DATA_SOURCE.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(TIEBAN_DATA_SOURCE.retrievedFiles).toContain("DB/List.csv");
  });

  it("loads the twelve volumes of the 12000-entry 条文库", () => {
    expect(TIEBAN_TIAOWEN_COUNT).toBe(12000);
    expect(TIESHEN_VOLUMES).toHaveLength(12);
    expect(volumeOfTiaowen(1001)).toBe("子集");
    expect(volumeOfTiaowen(2000)).toBe("子集");
    expect(volumeOfTiaowen(2001)).toBe("丑集");
    expect(volumeOfTiaowen(13000)).toBe("亥集");

    const library = getTiebanTiaowenLibrary();
    expect(library.size).toBe(12000);
    expect(library.license).toBe("Apache-2.0");
    expect(lookupTiaowen(1001)?.text).toBe("一树残花，有枝复茂。");
    expect(lookupTiaowen(13000)?.text).toBe("万象更新，周而复始。");
    expect(lookupTiaowen(0)).toBeNull();
  });

  it("keeps the small in-source sample identical to the full library", () => {
    const library = getTiebanTiaowenLibrary();
    for (const sample of TIEBAN_TIAOWEN_SAMPLE) {
      const entry = library.entries.get(sample.number);
      expect(entry).toMatchObject({ volume: sample.volume, age: sample.age, text: sample.text });
    }
  });

  it("re-derives the correction projections from 14-14 without extra files", () => {
    const letterKeys = Object.keys(TIEBAN_LETTER_ROW_TABLE);
    expect(letterKeys.length).toBeGreaterThan(1000);
    // (校正数, 岁数) 取行序末次出现的口径，必须与 14-14 的两种投影键数一致
    expect(Object.keys(TIEBAN_CORRECTION_ROW_TABLE)).toHaveLength(1493);
    const { byCorrection, correctionToLetter } = deriveCorrectionMaps(TIEBAN_LETTER_ROW_TABLE);
    expect(Object.keys(byCorrection)).toHaveLength(Object.keys(TIEBAN_CORRECTION_ROW_TABLE).length);
    expect(Object.values(correctionToLetter).every((letter) => letter.length > 0)).toBe(true);
  });

  it("refuses to import a 条文库 whose license is not permissive", () => {
    const base = {
      format: "qmdj-tieshen-tiaowen-v1" as const,
      id: "shaozi-test",
      name: "邵子神数条文（测试）",
      entries: [{ number: 1, text: "测试" }],
    };
    expect(() => importTieshenTiaowen({ ...base, license: "AGPL-3.0" })).toThrow(/许可/);
    expect(() => importTieshenTiaowen({ ...base, format: "qmdj-shaozi-tiaowen-v1" })).toThrow(/format/);
    expect(() => importTieshenTiaowen({ ...base, license: "CC0-1.0" })).not.toThrow();
    expect(importTieshenTiaowen({ ...base, license: "MIT" }).size).toBe(1);
  });
});

describe("tieshen index rules", () => {
  it("splits the birth 时辰 into the eight 刻 from the 时辰 start", () => {
    expect(KE_NAMES).toHaveLength(8);
    expect(keOfHourMinute(23, 0)).toBe("初刻");
    expect(keOfHourMinute(23, 14)).toBe("初刻");
    expect(keOfHourMinute(23, 15)).toBe("一刻");
    expect(keOfHourMinute(0, 0)).toBe("四刻");
    expect(keOfHourMinute(0, 15)).toBe("五刻");
    expect(keOfHourMinute(0, 59)).toBe("正刻");
    expect(keOfHourMinute(1, 0)).toBe("初刻");
    expect(keOfHourMinute(2, 0)).toBe("四刻");
    expect(keOfHourMinute(2, 59)).toBe("正刻");
    expect(keGanNumberOf("初刻")).toBe(1);
    expect(keGanNumberOf("正刻")).toBe(8);
  });

  it("derives 先天命数 with the documented 14-1/14-2 tables", () => {
    // 农历 4 月 → 4；时支 辰 → 5
    expect(congNumberOf(4, false, "辰")).toBe(2);
    expect(congNumberOf(5, false, "子")).toBe(7);
    // 闰 1 月未超 12 → 月份表取 2：2 + 3 − 12 = −7 → +12
    expect(congNumberOf(1, true, "亥")).toBe(5);
    // 闰 12 月超 12 归 1
    expect(congNumberOf(12, true, "子")).toBe(3);
  });

  it("matches the shipped tables for 五音 and 考刻 groupings", () => {
    expect(TONE_NUMBERS).toEqual({ 宫: 5, 商: 4, 角: 3, 徵: 2, 羽: 1 });
    expect(groupOf("男", true)).toBe("阳男阴女");
    expect(groupOf("女", true)).toBe("阴男阳女");
    expect(groupOf("男", false)).toBe("阴男阳女");
    expect(groupOf("女", false)).toBe("阳男阴女");
    expect(Object.keys(TIEBAN_DESTINY_TABLE).length).toBeGreaterThan(100);
  });

  it("resolves 三元 / 五数寄宫 / 八卦加则 / 条文校正", () => {
    expect(sanYuanOf(1864)).toBe("上元");
    expect(sanYuanOf(1923)).toBe("上元");
    expect(sanYuanOf(1924)).toBe("中元");
    expect(sanYuanOf(1984)).toBe("下元");
    expect(sanYuanOf(2043)).toBe("下元");
    expect(wuShuJiGongHexagramOf("上元", "男", true)).toBe("艮");
    expect(wuShuJiGongHexagramOf("上元", "女", false)).toBe("坤");
    expect(wuShuJiGongHexagramOf("中元", "男", true)).toBe("艮");
    expect(wuShuJiGongHexagramOf("中元", "男", false)).toBe("坤");
    expect(wuShuJiGongHexagramOf("下元", "男", true)).toBe("离");
    expect(wuShuJiGongHexagramOf("下元", "女", false)).toBe("兑");

    const stopped = applyJiaze(6, "坤");
    expect(stopped).toEqual({ result: 6, stopped: true, steps: 1 });
    // 乾起 36，结果只落在奇数上，10 步内不会遇到 6/8
    const cyclic = applyJiaze(5, "乾");
    expect(cyclic.stopped).toBe(false);
    expect(cyclic.steps).toBe(10);
    expect(cyclic.result).toBeGreaterThanOrEqual(1);
    expect(cyclic.result).toBeLessThanOrEqual(9);
    // 遇十当不用：结果只保留个位
    expect(String(cyclic.result).length).toBe(1);

    expect(correctionOf(0, 5)).toBe(0);
    expect(correctionOf(1, 5)).toBe(3);
    expect(correctionOf(5, 5)).toBe(1);
    expect(correctionOf(1, 50)).toBe(4);
    expect(correctionOf(19, 50)).toBe(2);
  });

  it("falls back to an empty letter when the 流年 sound / marker is unknown", () => {
    expect(liunianLetterOf(1, 1, "四", "开")).toBe("问");
    expect(liunianLetterOf(8, 2, "五", "石")).toBe("省");
    expect(liunianLetterOf(1, 1, "", "开")).toBe("");
  });
});

describe("tieshen chart", () => {
  const chart = buildTieshenChart(profile(), settings);

  it("walks the index chain to a key and a 条文 number", () => {
    expect(chart.format).toBe("qmdj-tieshen-v1");
    expect(chart.keys.congNumber).toBeGreaterThanOrEqual(1);
    expect(chart.keys.congNumber).toBeLessThanOrEqual(12);
    expect(chart.keys.mainNumber).toBe(
      (chart.keys.toneNumber * 5 + chart.keys.dayLife + chart.keys.timeLuck - (chart.keys.sum <= 6 ? 1 : 6)) * 30 + chart.lunar.day,
    );
    expect(chart.keys.finalFortuneNumber).toBe(chart.keys.mainNumber + chart.keys.keGanNumber * 48);
    expect(chart.keys.hexagram.length).toBeGreaterThan(0);
    expect(chart.keys.hexagramSource).not.toBe("unmatched");
    expect(chart.keys.houTianNumber).toBeGreaterThanOrEqual(1);
    expect(chart.keys.houTianNumber).toBeLessThanOrEqual(9);
    expect(chart.keys.momentMatched).toBe(true);
  });

  it("uses the query 时干 for 日命数 and the birth 时支 for 先天命数", () => {
    const other = buildTieshenChart(profile(), { queryDatetime: "2000-01-01T03:10" });
    expect(other.pillars.birth).toEqual(chart.pillars.birth);
    expect(other.pillars.query).not.toEqual(chart.pillars.query);
    expect(other.keys.congNumber).toBe(chart.keys.congNumber);
  });

  it("derives the 分刻 and 刻干数 from the fixed birth clock", () => {
    // 08:30 在辰时（07:00–09:00）内 90 分钟 → 六刻 → 刻干数 7
    expect(chart.input.datetime).toBe("1990-05-20T08:30");
    expect(chart.keys.keName).toBe("六刻");
    expect(chart.keys.keGanNumber).toBe(7);
    expect(chart.keys.finalFortuneNumber).toBe(chart.keys.mainNumber + 7 * 48);
    // 23:50 属子时（23:00–01:00）内第 50 分钟 → 三刻
    const lateZi = buildTieshenChart(profile("1990-05-20T23:50"), settings);
    expect(lateZi.keys.keName).toBe("三刻");
    expect(lateZi.keys.keGanNumber).toBe(4);
    expect(lateZi.pillars.birth.time).not.toBe(chart.pillars.birth.time);
  });

  it("lets 考刻定分 override the 刻干数 without touching the natural derivation", () => {
    const overridden = buildTieshenChart(profile(), { ...settings, keOverride: "正刻" });
    expect(overridden.keys.keName).toBe("正刻");
    expect(overridden.keys.keGanNumber).toBe(8);
    expect(overridden.keys.mainNumber).toBe(chart.keys.mainNumber);
    expect(overridden.keys.finalFortuneNumber).toBe(chart.keys.mainNumber + 8 * 48);
  });

  it("keeps every 条文 text traceable to the shipped library", () => {
    const library = getTiebanTiaowenLibrary();
    const native = chart.native;
    if (native) {
      expect(library.entries.get(native.fortune)?.text).toBe(native.text);
    }
    for (const hit of chart.benming.hits) {
      expect(library.entries.get(hit.fortune)?.text ?? "").toBe(hit.text);
    }
    for (const row of chart.liunian) {
      for (const [fortune, text] of [
        [row.originalFortune, row.originalText],
        [row.correctedFortune, row.correctedText],
        [row.tiebanFortune, row.tiebanText],
      ] as const) {
        if (fortune === null) continue;
        expect(library.entries.get(fortune)?.text ?? "").toBe(text);
      }
    }
  });

  it("enumerates 108 流年 rows and resolves a non-trivial subset", () => {
    expect(chart.liunian).toHaveLength(108);
    expect(chart.liunian[0]?.age).toBe(1);
    expect(chart.liunian[107]?.age).toBe(108);
    expect(new Set(chart.liunian.map((row) => row.ganZhi)).size).toBeGreaterThan(10);
    expect(chart.coverage.liunian.resolved).toBe(chart.liunian.filter((row) => row.textSource !== "none").length);
    expect(chart.coverage.liunian.resolved).toBeGreaterThan(0);
    for (const row of chart.liunian) {
      expect(row.tiebanFortune).toBe(row.originalFortune === null ? null : row.originalFortune + chart.keys.keGanNumber * 48);
      if (row.correctedFortune !== null) {
        expect(row.correctedCorrection).toBeGreaterThan(0);
        const table = TIEBAN_CORRECTION_ROW_TABLE[`${row.correctedCorrection}|${row.age}`];
        expect(row.correctedFortune).toBe(table[0] + table[1]);
      }
      if (row.textSource === "none") expect(row.correctedText || row.originalText || row.tiebanText).toBe("");
    }
    expect(chart.liunian.some((row) => row.correctedFortune !== null)).toBe(true);
  });

  it("states plainly that 邵子神数 and 六亲条文 are not wired", () => {
    expect(chart.coverage.shaoziShenshu.available).toBe(false);
    expect(chart.coverage.shaoziShenshu.licenseBlocked).toBe(true);
    expect(chart.coverage.shaoziShenshu.reason).toContain("AGPL");
    expect(chart.coverage.sixQin.available).toBe(false);
    expect(chart.coverage.sixQin.reason).toContain("未获");
    expect(chart.todo).toEqual(TIESHEN_UNIMPLEMENTED);
    expect(chart.disclaimer).toContain("邵子神数条文源未接入");
  });

  it("degrades to an empty library without throwing or inventing text", () => {
    const empty = createTieshenTiaowenLibrary({
      id: "empty",
      name: "空条文库（测试）",
      license: "CC0-1.0",
      repository: "",
      commit: "",
      entries: [],
    });
    const bare = buildTieshenChart(profile(), { ...settings, library: empty });
    expect(bare.native).toBeNull();
    expect(bare.library.size).toBe(0);
    expect(bare.coverage.liunian.resolved).toBe(0);
    for (const hit of bare.benming.hits) expect(hit.text).toBe("");
    for (const row of bare.liunian) {
      expect(row.originalText).toBe("");
      expect(row.correctedText).toBe("");
      expect(row.tiebanText).toBe("");
      expect(row.textSource).toBe("none");
    }
    // 空库只影响断词，索引链本身照常算出
    expect(bare.keys.finalFortuneNumber).toBe(chart.keys.finalFortuneNumber);
  });

  it("is deterministic and serializes both forms with the boundary spelled out", () => {
    const again = buildTieshenChart(profile(), settings);
    expect(again.keys).toEqual(chart.keys);
    expect(again.liunian).toEqual(chart.liunian);

    const text = serializeTieshenToStructuredText(chart);
    expect(text).toContain("铁板神数（条文索引盘）");
    expect(text).toContain("索引链（生辰 → 条文编号）");
    expect(text).toContain("流年条文（1–108 岁");
    expect(text).toContain("邵子神数条文源未接入");
    expect(text).toContain("Apache-2.0");

    const payload = JSON.parse(serializeTieshenToCompactJson(chart)) as {
      format: string;
      liunian: unknown[];
      liunianTotal: number;
      liunianResolved: number;
      library: [string, string, number, string];
    };
    expect(payload.format).toBe("qmdj-tieshen-v1");
    expect(payload.liunianTotal).toBe(108);
    expect(payload.liunian).toHaveLength(payload.liunianResolved);
    expect(payload.library[1]).toBe("Apache-2.0");
    expect(payload.library[2]).toBe(12000);
  });
});
