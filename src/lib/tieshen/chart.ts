/**
 * 铁板神数（含邵子神数占位）——条文索引盘。
 *
 * `buildTieshenChart(profile, settings)` 只做两件事：
 *   1. 用 `rules.ts` 里**有据可依**的铁板索引链把生辰算到条文编号；
 *   2. 用内置的 12000 条条文库（Apache-2.0，见 `data/SOURCE.md`）把编号翻成断词。
 * 邵子神数条文与六亲条文字号未获可核验来源，本盘不生成——`coverage` 与 `todo` 会如实写出。
 */

import { Lunar, Solar } from "lunar-typescript";
import type { NormalizedProfileInput } from "@/lib/profile";
import {
  getTiebanTiaowenLibrary,
  lookupTiaowen,
  TIEBAN_DATA_SOURCE,
  type TieshenTiaowenLibrary,
} from "./data";
import {
  alignLiunianSequence,
  applyJiaze,
  branchGroupOf,
  congNumberOf,
  correctionOf,
  destinyRowOf,
  dayLifeNumberOf,
  finalFortuneNumberOf,
  ganGroupOf,
  ganZhiOfAge,
  groupOf,
  hexagramOf,
  houTianNumberOf,
  isYangYearGan,
  jiazeStartOf,
  keGanNumberOf,
  keOfHourMinute,
  liunianCorrectedRowOf,
  liunianLetterOf,
  liunianLetterRowOf,
  liunianSequenceOf,
  liunianStartOf,
  mainNumberOf,
  markerOf,
  momentOf,
  sanYuanOf,
  timeLuckNumberOf,
  toneOf,
  toneNumberOf,
  wuShuJiGongHexagramOf,
  HOU_TIAN_GUA_NUMBER,
  TIESHEN_UNIMPLEMENTED,
  type KeName,
} from "./rules";

export type TieshenSettings = {
  /** 求测时间（公历 `YYYY-MM-DDTHH:mm`）。缺省取当前盘面时间。 */
  queryDatetime?: string;
  /** 考刻定分覆盖（初刻…正刻）。缺省按出生分钟推算。 */
  keOverride?: KeName | null;
  /** 条文库覆盖（外部导入，如自有条文数据）。缺省用内置铁板条文库。 */
  library?: TieshenTiaowenLibrary;
};

export type TieshenPillars = { year: string; month: string; day: string; time: string };

export type TieshenTiaowenHit = {
  category: string;
  fortune: number;
  volume: string;
  age: string;
  text: string;
};

export type TieshenLiunianRow = {
  age: number;
  ganZhi: string;
  sound: string;
  marker: string;
  letter: string;
  originalCorrection: number;
  correctedCorrection: number;
  originalFortune: number | null;
  correctedFortune: number | null;
  tiebanFortune: number | null;
  originalText: string;
  correctedText: string;
  tiebanText: string;
  /** 落定条文取用顺序：校正后 → 原条文 → 铁板公式条文。 */
  textSource: "corrected" | "original" | "formula" | "none";
  jiaze: { result: number | null; stopped: boolean };
};

export type TieshenChart = {
  format: "qmdj-tieshen-v1";
  input: {
    datetime: string;
    timeZone: string;
    gender: "male" | "female";
    genderLabel: "男" | "女";
    queryDatetime: string;
    queryDerived: boolean;
    keOverride: KeName | null;
  };
  lunar: { year: number; month: number; day: number; isLeap: boolean; dayInChinese: string };
  pillars: { birth: TieshenPillars; query: TieshenPillars };
  keys: {
    congNumber: number;
    ganGroup: string;
    tone: string;
    toneNumber: number;
    dayLife: number;
    timeLuck: number;
    sum: number;
    base: number;
    factor: number;
    mainNumber: number;
    finalFortuneNumber: number;
    keName: KeName;
    keGanNumber: number;
    group: string;
    moment: "Initial" | "Main";
    momentMatched: boolean;
    yangYear: boolean;
    hexagram: string;
    hexagramSource: "detail" | "simple" | "unmatched";
    houTianNumber: number;
    houTianNumberBeforeJiGong: number;
    wuShuJiGong: { hexagram: string; number: number; basis: string } | null;
    sanYuan: string;
    jiaze: { start: number; result: number | null; stopped: boolean; steps: number };
  };
  /** 终局条文（本命数 + 刻干数 × 48）。 */
  native: { fortune: number; volume: string; age: string; text: string } | null;
  /** 14-10 本命条文：性格 / 才能前程 / 财运 / 兄弟个数。 */
  benming: { table: { base: number; seq: number } | null; hits: TieshenTiaowenHit[] };
  /** 流年条文 1–108 岁（三种口径并列：原条文 / 校正后 / 铁板公式）。 */
  liunian: TieshenLiunianRow[];
  library: { id: string; name: string; license: string; repository: string; commit: string; size: number };
  coverage: {
    ruleSource: { repository: string; license: string; commit: string };
    benming: "ready" | "missing-destiny-row";
    liunian: { total: number; resolved: number };
    shaoziShenshu: { available: false; licenseBlocked: true; reason: string };
    sixQin: { available: false; reason: string };
  };
  todo: readonly string[];
  disclaimer: string;
};

const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const parseDatetime = (datetime: string) => {
  const match = datetime.match(DATETIME_PATTERN);
  if (!match) throw new Error(`无法解析日期时间: ${datetime}`);
  const [, year, month, day, hour, minute] = match;
  return { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour), minute: Number(minute) };
};

/** 与 `bazi/chart.ts` 同口径：农历输入用 `Lunar.fromYmdHms`，公历输入用 `Solar → Lunar`。 */
const birthLunarOf = (profile: NormalizedProfileInput) => {
  const { year, month, day, hour, minute } = parseDatetime(profile.normalized.datetime);
  if (profile.original.calendarMode === "lunar" && profile.original.lunar) {
    const lunarMonth = profile.original.lunar.isLeapMonth ? -profile.original.lunar.month : profile.original.lunar.month;
    return Lunar.fromYmdHms(
      profile.original.lunar.year,
      lunarMonth,
      profile.original.lunar.day,
      profile.original.lunar.hour ?? hour,
      profile.original.lunar.minute ?? minute,
      0,
    );
  }
  return Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
};

const pillarsOf = (lunar: Lunar): TieshenPillars => ({
  year: lunar.getYearInGanZhi(),
  month: lunar.getMonthInGanZhi(),
  day: lunar.getDayInGanZhiExact(),
  time: lunar.getTimeInGanZhi(),
});

export const buildTieshenChart = (
  profile: NormalizedProfileInput,
  settings: TieshenSettings = {},
): TieshenChart => {
  const library = settings.library ?? getTiebanTiaowenLibrary();
  const genderLabel: "男" | "女" = profile.original.gender === "female" ? "女" : "男";
  const queryDatetime = settings.queryDatetime ?? profile.normalized.datetime;
  const queryDerived = !settings.queryDatetime;

  const birthLunar = birthLunarOf(profile);
  const birthPillars = pillarsOf(birthLunar);
  const signedLunarMonth = birthLunar.getMonth();
  const birthLunarMonth = Math.abs(signedLunarMonth);
  const birthLunarDay = birthLunar.getDay();
  const birthIsLeap = signedLunarMonth < 0;

  const query = parseDatetime(queryDatetime);
  const queryPillars = pillarsOf(Solar.fromYmdHms(query.year, query.month, query.day, query.hour, query.minute, 0).getLunar());

  const yearGan = birthPillars.year[0] ?? "";
  const yearBranch = birthPillars.year[1] ?? "";
  const hourBranch = birthPillars.time[1] ?? "";
  const queryHourGan = queryPillars.time[0] ?? "";
  const yangYear = isYangYearGan(yearGan);

  // 1. 先天命数 → 五音命数
  const congNumber = congNumberOf(birthLunarMonth, birthIsLeap, hourBranch);
  const ganGroup = ganGroupOf(yearGan);
  const tone = toneOf(congNumber, ganGroup);
  const toneNumber = toneNumberOf(tone);

  // 2. 日命数 / 时运数 / 本命数 / 终局条文数
  const dayLife = dayLifeNumberOf(birthPillars.day, queryHourGan);
  const timeLuck = timeLuckNumberOf(queryPillars.time);
  const { sum, base, factor, mainNumber } = mainNumberOf(toneNumber, dayLife, timeLuck, birthLunarDay);

  // 3. 分刻（考刻定分）与组别
  const birthClock = parseDatetime(profile.normalized.datetime);
  const keName: KeName = settings.keOverride ?? keOfHourMinute(birthClock.hour, birthClock.minute);
  const keGanNumber = keGanNumberOf(keName);
  const group = groupOf(genderLabel, yangYear);
  const { moment, matched: momentMatched } = momentOf(group, sum);
  const finalFortuneNumber = finalFortuneNumberOf(mainNumber, keGanNumber);

  // 4. 卦名与后天命数
  const hexagram = hexagramOf(keName, mainNumber);
  const houTianNumberBeforeJiGong = houTianNumberOf(congNumber, mainNumber);
  const sanYuan = sanYuanOf(birthClock.year);
  const jiGongHexagram = houTianNumberBeforeJiGong === 5 ? wuShuJiGongHexagramOf(sanYuan, genderLabel, yangYear) : "";
  const wuShuJiGong = houTianNumberBeforeJiGong === 5
    ? {
        hexagram: jiGongHexagram,
        number: HOU_TIAN_GUA_NUMBER[jiGongHexagram] ?? 5,
        basis: `${sanYuan} · ${genderLabel} · ${yangYear ? "阳" : "阴"}年干`,
      }
    : null;
  const houTianNumber = wuShuJiGong ? wuShuJiGong.number : houTianNumberBeforeJiGong;
  const jiaze = hexagram.source === "unmatched"
    ? { start: 0, result: null, stopped: false, steps: 0 }
    : (() => {
        const outcome = applyJiaze(finalFortuneNumber, hexagram.name);
        return { start: jiazeStartOf(hexagram.name), result: outcome.result, stopped: outcome.stopped, steps: outcome.steps };
      })();

  // 5. 条文：终局条文 + 14-10 本命条文
  const nativeEntry = lookupTiaowen(finalFortuneNumber, library);
  const destinyRow = destinyRowOf(hexagram.name, moment, congNumber);
  const hits: TieshenTiaowenHit[] = [];
  if (destinyRow) {
    for (const category of Object.keys(destinyRow.offsets)) {
      for (const offset of destinyRow.offsets[category]) {
        const fortune = destinyRow.base + destinyRow.seq + offset;
        const entry = lookupTiaowen(fortune, library);
        hits.push({ category, fortune, volume: entry?.volume ?? "", age: entry?.age ?? "", text: entry?.text ?? "" });
      }
    }
  }

  // 6. 流年 1–108 岁
  const branchGroup = branchGroupOf(yearBranch);
  const start = liunianStartOf(congNumber, branchGroup, genderLabel);
  const sequence = alignLiunianSequence(liunianSequenceOf(congNumber, yearGan), start);
  const liunian: TieshenLiunianRow[] = [];
  for (let age = 1; age <= 108; age += 1) {
    const ganZhi = ganZhiOfAge(yearGan, yearBranch, age);
    const sound = sequence.length >= 12 ? sequence[(age - 1) % 12] : "";
    const marker = markerOf(ganZhi[1] ?? "", houTianNumber);
    const letter = sound ? liunianLetterOf(keGanNumber, age, sound, marker) : "";
    const row = letter ? liunianLetterRowOf(letter, age) : null;
    const originalCorrection = row?.correction ?? 0;
    const correctedCorrection = correctionOf(originalCorrection, age);
    const correctedRow = correctedCorrection > 0 ? liunianCorrectedRowOf(correctedCorrection, age) : null;

    const originalFortune = row ? row.originalFortune : null;
    const correctedFortune = correctedRow ? correctedRow.fortune : null;
    const tiebanFortune = originalFortune === null ? null : originalFortune + keGanNumber * 48;

    const originalText = originalFortune === null ? "" : lookupTiaowen(originalFortune, library)?.text ?? "";
    const correctedText = correctedFortune === null ? "" : lookupTiaowen(correctedFortune, library)?.text ?? "";
    const tiebanText = tiebanFortune === null ? "" : lookupTiaowen(tiebanFortune, library)?.text ?? "";
    const textSource = correctedText ? "corrected" : originalText ? "original" : tiebanText ? "formula" : "none";

    const jiazeRow = correctedFortune === null || hexagram.source === "unmatched"
      ? { result: null, stopped: false }
      : (() => {
          const outcome = applyJiaze(correctedFortune, hexagram.name);
          return { result: outcome.result, stopped: outcome.stopped };
        })();

    liunian.push({
      age,
      ganZhi,
      sound,
      marker,
      letter,
      originalCorrection,
      correctedCorrection,
      originalFortune,
      correctedFortune,
      tiebanFortune,
      originalText,
      correctedText,
      tiebanText,
      textSource,
      jiaze: jiazeRow,
    });
  }

  const resolved = liunian.filter((row) => row.textSource !== "none").length;

  return {
    format: "qmdj-tieshen-v1",
    input: {
      datetime: profile.normalized.datetime,
      timeZone: profile.normalized.timeZone,
      gender: profile.original.gender,
      genderLabel,
      queryDatetime,
      queryDerived,
      keOverride: settings.keOverride ?? null,
    },
    lunar: {
      year: birthLunar.getYear(),
      month: birthLunarMonth,
      day: birthLunarDay,
      isLeap: birthIsLeap,
      dayInChinese: birthLunar.getDayInChinese(),
    },
    pillars: { birth: birthPillars, query: queryPillars },
    keys: {
      congNumber,
      ganGroup,
      tone,
      toneNumber,
      dayLife,
      timeLuck,
      sum,
      base,
      factor,
      mainNumber,
      finalFortuneNumber,
      keName,
      keGanNumber,
      group,
      moment,
      momentMatched,
      yangYear,
      hexagram: hexagram.name,
      hexagramSource: hexagram.source,
      houTianNumber,
      houTianNumberBeforeJiGong,
      wuShuJiGong,
      sanYuan,
      jiaze,
    },
    native: nativeEntry
      ? { fortune: finalFortuneNumber, volume: nativeEntry.volume, age: nativeEntry.age, text: nativeEntry.text }
      : null,
    benming: { table: destinyRow ? { base: destinyRow.base, seq: destinyRow.seq } : null, hits },
    liunian,
    library: {
      id: library.id,
      name: library.name,
      license: library.license,
      repository: library.repository,
      commit: library.commit,
      size: library.size,
    },
    coverage: {
      ruleSource: {
        repository: TIEBAN_DATA_SOURCE.repository,
        license: TIEBAN_DATA_SOURCE.license,
        commit: TIEBAN_DATA_SOURCE.commit,
      },
      benming: destinyRow ? "ready" : "missing-destiny-row",
      liunian: { total: 108, resolved },
      shaoziShenshu: {
        available: false,
        licenseBlocked: true,
        reason: "未找到宽松许可的邵子神数条文源：检索到的实现为 AGPL-3.0，公共领域古籍均为版权状态不明的民间抄本，故本盘不生成邵子条文。",
      },
      sixQin: {
        available: false,
        reason: "父母宫/兄弟宫等六亲条文字号未获可核验的公开编号规则，本仓不采用上游的关键词启发式分类，故不生成六亲条文。",
      },
    },
    todo: TIESHEN_UNIMPLEMENTED,
    disclaimer:
      "铁板神数研究盘（条文索引链 + 条文库检索），非预测。索引链按 Apache-2.0 开源实现 `ForceMind/Tieban-Shenshu` 的方法文档与代码实现：先天命数＝月份表(闰月 +1)+3−时辰表；五音命数由先天命数与年干干组查表；本命数＝(五音数×5+日命数+时运数−[和值≤6?1:6])×30+农历日；终局条文数＝本命数+刻干数×48；卦名按刻别+本命数取详表、未命中取简表；后天命数＝(先天命数+本命数) mod 8 且为 0 记 8，得 5 则按三元九运寄宫；八卦加则按乾 36、兑 3、其余 30 起，遇十不用、六八即止。分刻以方法文档表格（初刻＝时辰内第 0–15 分钟）为准，与上游 JS 对非子时的 hour%2 口径相反，差异已记录。**邵子神数条文源未接入，六亲条文字号与太玄数换算未获公开规则，本盘不生成这些条文**；条文断词一律取自条文库原文，本仓不新增、不改写、不做吉凶断语。仅供研究，不构成预测或现实裁决。",
  };
};
