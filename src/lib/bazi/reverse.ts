import { Solar } from "lunar-typescript";
import { DEFAULT_BAZI_SETTINGS, type BaziSettings } from "./settings";
import type { BaziPillarKey } from "./types";

export const HEAVENLY_STEMS = "甲乙丙丁戊己庚辛壬癸";

export const EARTHLY_BRANCHES = "子丑寅卯辰巳午未申酉戌亥";

/** 六十甲子，按甲子起序；同时作为四柱下拉的可选项。 */
export const SEXAGENARY_CYCLE: string[] = Array.from(
  { length: 60 },
  (_, index) => `${HEAVENLY_STEMS[index % 10]}${EARTHLY_BRANCHES[index % 12]}`,
);

/** lunar-typescript 的节气表在该区间内有据可查，超出即拒绝，避免给出无依据的盘面。 */
export const BAZI_REVERSE_MIN_YEAR = 1900;
export const BAZI_REVERSE_TIME_ZONE = "Etc/GMT-8";

export const BAZI_REVERSE_MAX_YEAR = 2100;

/** 1949-10-01 为甲子日，是日柱六十甲子的算术锚点。 */
const DAY_CYCLE_ANCHOR_UTC = Date.UTC(1949, 9, 1);

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type BaziReversePillars = Partial<Record<BaziPillarKey, string>>;

export type BaziReverseQuery = {
  /** 已知干支；年、月、日、时四柱都可留空，但至少要给出年、月、日柱之一。 */
  pillars: BaziReversePillars;
  /** 公历搜索范围，闭区间。 */
  startYear: number;
  endYear: number;
  /** 与工作台一致的换年、换日口径；缺省用默认口径。 */
  settings?: BaziSettings;
  /** 结果条数上限，缺省 200。 */
  maxResults?: number;
};

export type BaziReverseCandidate = {
  /** 可直接回填工作台的公历时间。整日命中时取 12:00，否则取首个命中分钟。 */
  datetime: string;
  date: string;
  lunar: string;
  /** 命中的分钟区间，如 ["13:00-14:59"]；整日命中为 ["00:00-23:59"]。 */
  hourRanges: string[];
  ganzhi: [string, string, string, string];
  dayMaster: string;
};

export type BaziReverseResult = {
  engineVersion: "bazi-reverse-v1";
  candidates: BaziReverseCandidate[];
  /** 找到超出 maxResults 的额外匹配时提前停止扫描。 */
  truncated: boolean;
  /** 实际走过天数（含被干支预筛排除的天）。 */
  scannedDays: number;
  /** 至少有一分钟与所填干支一致的天数。 */
  matchedDays: number;
  givenPillars: Record<BaziPillarKey, string | null>;
  conventions: BaziSettings;
  notes: string[];
};

type ParsedPillar = { text: string; gan: number; zhi: number } | null;

const parsePillar = (value: string | undefined, label: string): ParsedPillar => {
  const text = (value ?? "").trim();

  if (!text) {
    return null;
  }

  if (text.length !== 2) {
    throw new Error(`${label}格式应为两个字，例如「庚午」。`);
  }

  const gan = HEAVENLY_STEMS.indexOf(text[0]);
  const zhi = EARTHLY_BRANCHES.indexOf(text[1]);

  if (gan < 0 || zhi < 0) {
    throw new Error(`${label}「${text}」含有无法识别的字，请从下拉中选择。`);
  }

  if (gan % 2 !== zhi % 2) {
    throw new Error(`${label}「${text}」不是有效干支：阳干只能配阳支，阴干只能配阴支。`);
  }

  return { text, gan, zhi };
};

const parseYear = (value: number, label: string) => {
  if (!Number.isInteger(value)) {
    throw new Error(`${label}必须是整数年份。`);
  }

  if (value < BAZI_REVERSE_MIN_YEAR || value > BAZI_REVERSE_MAX_YEAR) {
    throw new Error(`${label}须在 ${BAZI_REVERSE_MIN_YEAR} 至 ${BAZI_REVERSE_MAX_YEAR} 之间。`);
  }

  return value;
};

const dayCycleIndex = (year: number, month: number, day: number) => {
  const elapsed = Math.round((Date.UTC(year, month - 1, day) - DAY_CYCLE_ANCHOR_UTC) / MILLISECONDS_PER_DAY);
  return ((elapsed % 60) + 60) % 60;
};

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * 四柱引擎的唯一入口：与 buildBaziChartFromProfile 用同一套换年、换日口径，
 * 逆推结果因此可以直接回填工作台而不会出现「搜出来的盘对不上」。
 */
const pillarsAt = (
  year: number,
  month: number,
  day: number,
  minute: number,
  settings: BaziSettings,
): [string, string, string, string] => {
  const lunar = Solar.fromYmdHms(year, month, day, Math.floor(minute / 60), minute % 60, 0).getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(settings.dayBoundary === "zi-start" ? 1 : 2);
  const yearPillar = settings.yearBoundary === "lunar-new-year"
    ? lunar.getYearInGanZhi()
    : eightChar.getYear();

  return [yearPillar, eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()];
};

/** 年柱在 7 月 1 日必已越过立春与春节，可用它一次性读出该公历年的年柱。 */
const yearGanZhiOf = (year: number, settings: BaziSettings) =>
  pillarsAt(year, 7, 1, 720, settings)[0];

const formatMinute = (minute: number) =>
  `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;

// 子时跨公历午夜，23:00 也是可选的换日边界。
const TIME_BOUNDARIES = [0, ...Array.from({ length: 12 }, (_, i) => (2 * i + 1) * 60), 1440];

/** 子初换日时，23 时的日柱已属次日；日柱预筛必须把这一天也算进候选。 */
const dayPillarFits = (index: number, target: string, settings: BaziSettings) =>
  SEXAGENARY_CYCLE[index] === target ||
  (settings.dayBoundary === "zi-start" && SEXAGENARY_CYCLE[(index + 1) % 60] === target);

/**
 * 从四柱反查公历生日。
 *
 * 四柱到生日不是一一对应：一个时辰含两个整点、年柱每 60 年重复一次、只给
 * 部分柱时结果天然是一片区间。这里只负责给出「与所填干支一致」的候选日期，
 * 并原样标注命中的时间范围，不宣称任何一个是唯一出生时间。
 */
export const deriveBirthDatesFromBazi = (query: BaziReverseQuery): BaziReverseResult => {
  const settings: BaziSettings = { ...DEFAULT_BAZI_SETTINGS, ...query.settings };
  const maxResults = query.maxResults ?? 200;

  if (!Number.isInteger(maxResults) || maxResults < 1) {
    throw new Error("结果上限必须是正整数。");
  }

  const startYear = parseYear(query.startYear, "起始年");
  const endYear = parseYear(query.endYear, "结束年");

  if (startYear > endYear) {
    throw new Error("起始年不能晚于结束年。");
  }

  const parsed: Record<BaziPillarKey, ParsedPillar> = {
    year: parsePillar(query.pillars.year, "年柱"),
    month: parsePillar(query.pillars.month, "月柱"),
    day: parsePillar(query.pillars.day, "日柱"),
    time: parsePillar(query.pillars.time, "时柱"),
  };

  if (!parsed.year && !parsed.month && !parsed.day) {
    throw new Error("请至少给出年柱、月柱或日柱之一，否则无法缩小搜索范围。");
  }

  const target: Record<BaziPillarKey, string | null> = {
    year: parsed.year?.text ?? null,
    month: parsed.month?.text ?? null,
    day: parsed.day?.text ?? null,
    time: parsed.time?.text ?? null,
  };

  const matches = (pillars: [string, string, string, string]) =>
    pillars.every((pillar, index) => {
      const expected = target[["year", "month", "day", "time"][index] as BaziPillarKey];
      return expected === null || pillar === expected;
    });

  // 年柱只在立春/春节换，先按年收窄能省掉绝大部分逐日排盘。
  const candidateYears: number[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    if (!target.year) {
      candidateYears.push(year);
      continue;
    }

    const currentYear = yearGanZhiOf(year, settings);
    const previousYear = yearGanZhiOf(year - 1, settings);

    if (currentYear === target.year || previousYear === target.year) {
      candidateYears.push(year);
    }
  }

  const rangesFor = (year: number, month: number, day: number) => {
    const at = (minute: number) => pillarsAt(year, month, day, minute, settings);
    const early = at(0);
    const late = at(1439);
    const boundaries = target.time || settings.dayBoundary === "zi-start" && target.day
      ? [...TIME_BOUNDARIES]
      : [0, 1440];

    // 公历日内至多有一个换月的节。找首个新月柱的可输入分钟，
    // 以免把交节前后整个小时错判为同一柱。
    if (early[0] !== late[0] || early[1] !== late[1]) {
      let lo = 0;
      let hi = 1439;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        const [yearPillar, monthPillar] = at(mid);
        if (yearPillar === early[0] && monthPillar === early[1]) lo = mid;
        else hi = mid;
      }
      if (!boundaries.includes(hi)) {
        boundaries.push(hi);
        boundaries.sort((a, b) => a - b);
      }
    }

    const ranges: Array<[number, number]> = [];
    for (let i = 0; i < boundaries.length - 1; i += 1) {
      const start = boundaries[i];
      const end = boundaries[i + 1] - 1;
      if (!matches(start === 0 ? early : at(start))) continue;
      const previous = ranges[ranges.length - 1];
      if (previous && previous[1] + 1 === start) previous[1] = end;
      else ranges.push([start, end]);
    }
    return ranges;
  };

  /** 只给月柱时，逐日排盘太贵：先用三个探针判断整月，再进逐日。 */
  const monthPillarFits = (year: number, month: number) => {
    if (!target.month || target.day || target.year) {
      return true;
    }

    const lastDay = new Date(year, month, 0).getDate();
    const probed = [1, 15, lastDay].map((day) => pillarsAt(year, month, day, 720, settings)[1]);

    if (probed.every((value) => value === probed[0])) {
      return probed[0] === target.month;
    }

    return probed.includes(target.month);
  };

  const candidates: BaziReverseCandidate[] = [];
  let scannedDays = 0;
  let matchedDays = 0;
  let truncated = false;

  for (const year of candidateYears) {
    for (let month = 1; month <= 12; month += 1) {
      if (!monthPillarFits(year, month)) {
        continue;
      }

      const daysInMonth = new Date(year, month, 0).getDate();

      for (let day = 1; day <= daysInMonth; day += 1) {
        scannedDays += 1;

        if (target.day && !dayPillarFits(dayCycleIndex(year, month, day), target.day, settings)) {
          continue;
        }

        const ranges = rangesFor(year, month, day);

        if (ranges.length === 0) {
          continue;
        }

        matchedDays += 1;
        if (candidates.length >= maxResults) {
          truncated = true;
          break;
        }
        const representative = ranges[0][0] === 0 && ranges[0][1] === 1439 ? 720 : ranges[0][0];
        const date = `${year}-${pad(month)}-${pad(day)}`;
        const lunar = Solar.fromYmdHms(year, month, day, Math.floor(representative / 60), representative % 60, 0).getLunar();
        const ganzhi = pillarsAt(year, month, day, representative, settings);

        candidates.push({
          datetime: `${date}T${formatMinute(representative)}`,
          date,
          lunar: lunar.toString(),
          hourRanges: ranges.map(([start, end]) => `${formatMinute(start)}-${formatMinute(end)}`),
          ganzhi,
          dayMaster: ganzhi[2][0],
        });

      }

      if (truncated) {
        break;
      }
    }

    if (truncated) {
      break;
    }
  }

  const notes: string[] = [
    "逆推只说明该时刻与所填干支一致，不能证明它是唯一的出生时间。",
  ];

  if (!target.time) {
    notes.push("未给出时柱：只按年、月、日柱匹配，整日命中取 12:00，否则取首个命中分钟。");
  } else {
    notes.push("时柱已参与匹配，结果按分钟给出。");
  }

  if (settings.dayBoundary === "zi-start") {
    notes.push("日柱按子初换日（23 时起算次日）口径匹配。");
  }

  if (settings.yearBoundary === "lunar-new-year") {
    notes.push("年柱按春节换年口径匹配。");
  }

  if (truncated) {
    notes.push(`结果超过 ${maxResults} 条上限已截断，可缩小年份范围或补齐干支后再查。`);
  }

  if (candidates.length === 0) {
    notes.push("该年份范围内没有与所填干支一致的生日，请检查干支或放宽年份范围。");
  }

  return {
    engineVersion: "bazi-reverse-v1",
    candidates,
    truncated,
    scannedDays,
    matchedDays,
    givenPillars: target,
    conventions: settings,
    notes,
  };
};
