/**
 * 铁板神数索引键推算（生辰 → 条文编号）。
 *
 * 规则来源：`ForceMind/Tieban-Shenshu`（Apache-2.0）的 `docs/铁板神数方法.md` 与 `js/tieban.js` 移植自的
 * Python 主体。**只放有据可依的部分**：这里每一个常量与公式都能在同仓库的方法文档或代码里找到出处，
 * 找不到出处的（邵子神数编号、六亲条文字号）一律不实现，见文件末尾的 TODO。
 *
 * 已记录的分歧：
 * - 分刻（八刻）：上游 JS `getEightKeFromTime` 用 `(hour % 2) * 60 + minute` 计算"时辰内分钟数"，
 *   对子时以外的时辰与同仓库方法文档的表格（初刻 = 时辰内第 0–15 分钟）相反。本仓以**文档表格**为准，
 *   即 `时辰内偏移 = 时辰起始小时 → 0 起算`，并把该分歧记在这里，不静默对某一边。
 * - 三元分期：上游只给出 1864–2043 三段与 2043 之后按 120 年循环取前两段的口径，本仓照此实现。
 */

import {
  TIEBAN_CORRECTION_LETTER_TABLE,
  TIEBAN_CORRECTION_ROW_TABLE,
  TIEBAN_DAY_LIFE_TABLE,
  TIEBAN_DESTINY_TABLE,
  TIEBAN_HEXAGRAM_DETAIL_TABLE,
  TIEBAN_HEXAGRAM_TABLE,
  TIEBAN_HOUR_BRANCH_TABLE,
  TIEBAN_LETTER_ROW_TABLE,
  TIEBAN_LETTER_TABLE,
  TIEBAN_LIUNIAN_SEQ_TABLE,
  TIEBAN_LIUNIAN_START_TABLE,
  TIEBAN_MARKER_TABLE,
  TIEBAN_MONTH_TABLE,
  TIEBAN_RULE_TABLES,
  TIEBAN_TIME_LUCK_TABLE,
  TIEBAN_TONE_NUMBER_TABLE,
  TIEBAN_TONE_TABLE,
  type TieshenDestinyRow,
} from "./data";

export const TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

/** 八刻名。上游 `KE_GAN_NUMBER`：初刻 1 … 正刻 8。 */
export const KE_NAMES = ["初刻", "一刻", "二刻", "三刻", "四刻", "五刻", "六刻", "正刻"] as const;
export type KeName = (typeof KE_NAMES)[number];

/** 铁板核心常数：终局条文数 = 本命数 + 刻干数 × 48。 */
export const TIEBAN_CORE_SECRET = 48;

/** 五音 → 五音数（14-4）。 */
export const TONE_NUMBERS = TIEBAN_TONE_NUMBER_TABLE;

/** 六十甲子纳音五行：日命数以出生日柱纳音、时运数以求测时柱纳音取值（14-5 / 14-6）。 */
export const NAYIN_WUXING: Record<string, string> = {
  甲子: "金", 乙丑: "金", 丙寅: "火", 丁卯: "火", 戊辰: "木", 己巳: "木",
  庚午: "土", 辛未: "土", 壬申: "金", 癸酉: "金", 甲戌: "火", 乙亥: "火",
  丙子: "水", 丁丑: "水", 戊寅: "土", 己卯: "土", 庚辰: "金", 辛巳: "金",
  壬午: "木", 癸未: "木", 甲申: "水", 乙酉: "水", 丙戌: "土", 丁亥: "土",
  戊子: "火", 己丑: "火", 庚寅: "木", 辛卯: "木", 壬辰: "水", 癸巳: "水",
  甲午: "金", 乙未: "金", 丙申: "火", 丁酉: "火", 戊戌: "木", 己亥: "木",
  庚子: "土", 辛丑: "土", 壬寅: "金", 癸卯: "金", 甲辰: "火", 乙巳: "火",
  丙午: "水", 丁未: "水", 戊申: "土", 己酉: "土", 庚戌: "金", 辛亥: "金",
  壬子: "木", 癸丑: "木", 甲寅: "水", 乙卯: "水", 丙辰: "土", 丁巳: "土",
  戊午: "火", 己未: "火", 庚申: "木", 辛酉: "木", 壬戌: "水", 癸亥: "水",
};

export const nayinOf = (pillar: string) => NAYIN_WUXING[pillar] ?? "";

/** 干组：甲己 / 乙庚 / 丙辛 / 丁壬 / 戊癸。 */
export const ganGroupOf = (gan: string) => {
  const index = TIAN_GAN.indexOf(gan as (typeof TIAN_GAN)[number]);
  return ["甲己", "乙庚", "丙辛", "丁壬", "戊癸"][index < 0 ? 0 : index % 5];
};

/** 流年五音序列的取用组：甲丙戊庚壬 属阳干组，其余按 甲乙丙丁 / 戊己 / 庚辛 / 壬癸 归组。 */
export const ganSequenceGroupOf = (gan: string) => {
  if ("甲乙丙丁".includes(gan)) return "甲乙丙丁";
  if ("戊己".includes(gan)) return "戊己";
  if ("庚辛".includes(gan)) return "庚辛";
  if ("壬癸".includes(gan)) return "壬癸";
  return "";
};

export const isYangYearGan = (gan: string) => "甲丙戊庚壬".includes(gan);

/** 支组（流年起始表 14-11-1 用）：寅午戌 / 申子辰 / 巳酉丑 / 亥卯未。 */
export const branchGroupOf = (branch: string) => {
  if ("寅午戌".includes(branch)) return "寅午戌";
  if ("申子辰".includes(branch)) return "申子辰";
  if ("巳酉丑".includes(branch)) return "巳酉丑";
  if ("亥卯未".includes(branch)) return "亥卯未";
  return "";
};

export const groupOf = (genderLabel: "男" | "女", yangYear: boolean): "阳男阴女" | "阴男阳女" =>
  (genderLabel === "男" && yangYear) || (genderLabel === "女" && !yangYear) ? "阳男阴女" : "阴男阳女";

/**
 * 分刻（八刻）。以「时辰内的分钟数」定位：
 * 子时 23:00–01:00 对应 0–120；其余时辰自起始小时（奇数小时）起算。
 */
export const keOfHourMinute = (hour: number, minute: number): KeName => {
  const startHour = hour === 23 ? 23 : hour - (hour % 2 === 0 ? 1 : 0);
  const minutesInKe = ((((hour - startHour) % 24) + 24) % 24) * 60 + minute;
  return KE_NAMES[Math.max(0, Math.min(KE_NAMES.length - 1, Math.floor(minutesInKe / 15)))];
};

/** 刻干数：初刻 1 … 正刻 8。 */
export const keGanNumberOf = (ke: KeName) => KE_NAMES.indexOf(ke) + 1;

/**
 * 先天命数 = 月份表(农历月，闰月 +1 且超 12 归 1) + 3 − 时辰表(出生时支)；≤0 时 +12。
 * 见 14-1 / 14-2。
 */
export const congNumberOf = (lunarMonth: number, isLeap: boolean, hourBranch: string) => {
  let month = lunarMonth + (isLeap ? 1 : 0);
  if (month > 12) month = 1;
  const monthValue = TIEBAN_MONTH_TABLE[String(month)] ?? month;
  const hourValue = TIEBAN_HOUR_BRANCH_TABLE[hourBranch] ?? 0;
  let cong = monthValue + 3 - hourValue;
  if (cong <= 0) cong += 12;
  return cong;
};

/** 五音命数：由（先天命数，年干干组）查 14-3 得五音，再由 14-4 得五音数。 */
export const toneOf = (congNumber: number, ganGroup: string) =>
  TIEBAN_TONE_TABLE[String(congNumber)]?.[ganGroup] ?? "宫";

export const toneNumberOf = (tone: string) => TONE_NUMBERS[tone] ?? 5;

/** 日命数：出生日柱纳音五行 → 14-5，列取求测时干。 */
export const dayLifeNumberOf = (dayPillar: string, queryHourGan: string) =>
  TIEBAN_DAY_LIFE_TABLE[nayinOf(dayPillar)]?.[queryHourGan] ?? 0;

/** 时运数：求测时柱纳音五行 → 14-6。 */
export const timeLuckNumberOf = (queryHourPillar: string) => TIEBAN_TIME_LUCK_TABLE[nayinOf(queryHourPillar)] ?? 0;

/**
 * 本命数 = (五音数 × 5 + 日命数 + 时运数 − [和值 ≤6 ? 1 : 6]) × 30 + 农历日。
 * 上游同仓 doc 写作「基数 = 五音数 × 5 + 日命数 + 时运数；因子 = 和值 ≤6 ? 基数−1 : 基数−6」。
 */
export const mainNumberOf = (toneNumber: number, dayLife: number, timeLuck: number, lunarDay: number) => {
  const sum = dayLife + timeLuck;
  const base = toneNumber * 5 + dayLife + timeLuck;
  const factor = sum <= 6 ? base - 1 : base - 6;
  return { base, sum, factor, mainNumber: factor * 30 + lunarDay };
};

/** 终局条文数 = 本命数 + 刻干数 × 48。 */
export const finalFortuneNumberOf = (mainNumber: number, keGanNumber: number) =>
  mainNumber + keGanNumber * TIEBAN_CORE_SECRET;

/** 考刻（初刻 / 正刻 = Initial / Main）：由（组别，和值条件）查 14-7。 */
export const momentOf = (group: string, sum: number): { moment: "Initial" | "Main"; matched: boolean } => {
  const condition = sum > 6 ? ">6" : "<=6";
  const row = TIEBAN_RULE_TABLES.find((item) => item.组别 === group && item.和值条件 === condition);
  if (!row) return { moment: "Main", matched: false };
  return { moment: row.刻别 === "初刻" ? "Initial" : "Main", matched: true };
};

/** 卦名：先查 14-9 详表（刻别 + 本命数），未命中再查 14-8 简表。 */
export const hexagramOf = (ke: KeName, mainNumber: number): { name: string; source: "detail" | "simple" | "unmatched" } => {
  const detailed = TIEBAN_HEXAGRAM_DETAIL_TABLE[`${ke}|${mainNumber}`];
  if (detailed) return { name: detailed, source: "detail" };
  const simple = TIEBAN_HEXAGRAM_TABLE[String(mainNumber)];
  if (simple) return { name: simple, source: "simple" };
  return { name: "", source: "unmatched" };
};

/** 本命条文行（14-10）：键为（卦名 | Initial/Main | 先天命数）。 */
export const destinyRowOf = (hexagram: string, moment: "Initial" | "Main", congNumber: number): TieshenDestinyRow | null =>
  TIEBAN_DESTINY_TABLE[`${hexagram}|${moment}|${congNumber}`] ?? null;

/** 后天命数 =（先天命数 + 本命数）mod 8，为 0 记作 8。 */
export const houTianNumberOf = (congNumber: number, mainNumber: number) => {
  const remainder = (congNumber + mainNumber) % 8;
  return remainder === 0 ? 8 : remainder;
};

/** 三元九运分期（出生年）。 */
export const sanYuanOf = (year: number): "上元" | "中元" | "下元" => {
  if (year >= 1864 && year <= 1923) return "上元";
  if (year >= 1924 && year <= 1983) return "中元";
  if (year >= 1984 && year <= 2043) return "下元";
  if (year > 2043) {
    const offset = (year - 1864) % 120;
    if (offset < 60) return "上元";
    if (offset < 120) return "中元";
  }
  return "下元";
};

/** 后天八卦数（五数寄宫用）。 */
export const HOU_TIAN_GUA_NUMBER: Record<string, number> = { 坎: 1, 坤: 2, 震: 3, 巽: 4, 中: 5, 乾: 6, 兑: 7, 艮: 8, 离: 9 };

/** 五数寄宫卦：上元男艮女坤；中元阳男阴女用艮、否则坤；下元男离女兑。 */
export const wuShuJiGongHexagramOf = (sanYuan: string, genderLabel: "男" | "女", yangYear: boolean) => {
  if (sanYuan === "上元") return genderLabel === "男" ? "艮" : "坤";
  if (sanYuan === "中元") return (genderLabel === "男" && yangYear) || (genderLabel === "女" && !yangYear) ? "艮" : "坤";
  if (sanYuan === "下元") return genderLabel === "男" ? "离" : "兑";
  return "坤";
};

/** 八卦加则起始数：乾 36、兑 3、其余 30。 */
export const jiazeStartOf = (hexagram: string) => (hexagram === "乾" ? 36 : hexagram === "兑" ? 3 : 30);

/**
 * 八卦加则演变：起始数 + 当前数，遇十当不用（≥10 只取个位），变知六八止（6 或 8 即停，最多 10 步）。
 */
export const applyJiaze = (value: number, hexagram: string, maxSteps = 10) => {
  const start = jiazeStartOf(hexagram);
  let result = value;
  for (let step = 1; step <= maxSteps; step += 1) {
    result = start + result;
    if (result >= 10) result %= 10;
    if (result === 6 || result === 8) return { result, stopped: true, steps: step };
  }
  return { result, stopped: false, steps: maxSteps };
};

/** 条文校正数：1–10 岁与 81–108 岁 +2（>6 则 −6），其余 +3（>20 则 −20）；原数为 0 则不校正。 */
export const correctionOf = (originalCorrection: number, age: number) => {
  if (originalCorrection === 0) return 0;
  if ((age >= 1 && age <= 10) || (age >= 81 && age <= 108)) {
    const next = originalCorrection + 2;
    return next > 6 ? next - 6 : next;
  }
  const next = originalCorrection + 3;
  return next > 20 ? next - 20 : next;
};

/** 流年起始数（14-11-1）：先按（先天命数，支组，性别），退回 generic 行。 */
export const liunianStartOf = (congNumber: number, branchGroup: string, genderLabel: "男" | "女") => {
  const specific = TIEBAN_LIUNIAN_START_TABLE[`${congNumber}|${branchGroup}|${genderLabel}`];
  if (specific !== undefined) return specific;
  return TIEBAN_LIUNIAN_START_TABLE[`generic|${branchGroup}|${genderLabel}`] ?? 0;
};

/** 流年五音序列（14-11-2）：先按（先天命数，流年年干），退回（先天命数，干组）。 */
export const liunianSequenceOf = (congNumber: number, yearGan: string) => {
  const specific = TIEBAN_LIUNIAN_SEQ_TABLE[`${congNumber}|${yearGan}`];
  if (specific) return specific;
  const group = ganSequenceGroupOf(yearGan);
  return group ? TIEBAN_LIUNIAN_SEQ_TABLE[`${congNumber}|${group}`] ?? [] : [];
};

/** 流年序列按起始数旋转对齐：偏移 = (13 − 起始数) mod 12。 */
export const alignLiunianSequence = (sequence: readonly string[], start: number) => {
  if (start === 0 || sequence.length < 12) return [] as string[];
  const offset = ((13 - start) % 12 + 12) % 12;
  return Array.from({ length: 12 }, (_, index) => sequence[(index + offset) % 12]);
};

/** 流年标记（14-12）：由流年地支 + 后天命数取值。 */
export const markerOf = (yearBranch: string, houTianNumber: number) =>
  TIEBAN_MARKER_TABLE[yearBranch]?.[String(houTianNumber)] ?? "";

/** 流年字母（14-13）：由（刻别归并为初刻/正刻，虚岁奇偶，流年五音，流年标记）取值。 */
export const liunianLetterOf = (keGanNumber: number, age: number, sound: string, marker: string) => {
  const legacyMoment = keGanNumber <= 4 ? "初刻" : "正刻";
  const parity = age % 2 !== 0 ? "奇数" : "偶数";
  return TIEBAN_LETTER_TABLE[`${legacyMoment}|${parity}|${sound}|${marker}`] ?? "";
};

/** 流年原条文（14-14）：(字母，岁数) → 基数 / 加数 / 条文校正数。 */
export const liunianLetterRowOf = (letter: string, age: number) => {
  const row = TIEBAN_LETTER_ROW_TABLE[`${letter}|${age}`];
  if (!row) return null;
  return { base: row[0], add: row[1], correction: row[2], originalFortune: row[0] + row[1] };
};

/** 流年校正后条文（14-14 的「校正数 × 岁数」投影）。 */
export const liunianCorrectedRowOf = (correction: number, age: number) => {
  const row = TIEBAN_CORRECTION_ROW_TABLE[`${correction}|${age}`];
  if (!row) return null;
  return { base: row[0], add: row[1], fortune: row[0] + row[1], letter: TIEBAN_CORRECTION_LETTER_TABLE[`${correction}|${age}`] ?? "" };
};

/** 六十甲子顺推：由出生年柱干支推第 age 个虚岁的干支。 */
export const ganZhiOfAge = (yearGan: string, yearBranch: string, age: number) => {
  const ganIndex = TIAN_GAN.indexOf(yearGan as (typeof TIAN_GAN)[number]);
  const branchIndex = DI_ZHI.indexOf(yearBranch as (typeof DI_ZHI)[number]);
  if (ganIndex < 0 || branchIndex < 0) return "";
  return `${TIAN_GAN[(ganIndex + age - 1) % 10]}${DI_ZHI[(branchIndex + age - 1) % 12]}`;
};

/** 六亲宫位（上游 `SIX_QIN_PILLARS`）：年柱父母宫 / 月柱兄弟宫 / 日柱夫妻宫 / 时柱子女宫。 */
export const SIX_QIN_PILLARS: Record<string, string> = {
  年柱: "父母宫",
  月柱: "兄弟宫",
  日柱: "夫妻宫",
  时柱: "子女宫",
};

/**
 * TODO（未获公开规则，未实现）
 *
 * 1. 邵子神数条文与索引键
 *    检索到的邵子神数实现（`Horace-Maxwell/horosa-skill` 等）为 AGPL-3.0，公共领域古籍又都是版权状态不明的民间抄本，
 *    因此本仓**没有任何**邵子神数条文与编号规则。`data.ts` 的 `importTieshenTiaowen` 已留出导入通道，
 *    但"邵子神数：生辰 → 6144 条条文编号"的推算规则未获可核验来源，未实现。
 *
 * 2. 六亲条文（父母宫 / 兄弟宫 … 条文字号）
 *    上游 `main.py` 用**关键词启发式**把断词归入父母 / 兄弟 / 妻财 / 官鬼 / 子孙，属现代启发式而非传统编号规则，
 *    本仓不采用。传统"六亲宫位 → 条文字号"的推算法未获可核验的公开规则，未实现。
 *
 * 3. 太玄数与洛书换算
 *    部分商业实现把生辰先换算为太玄数与洛书再定条文，本仓未获其公开且可核验的规则，未实现。
 */
export const TIESHEN_UNIMPLEMENTED = [
  "邵子神数条文与编号规则：未获宽松许可的条文源与可核验的编号规则，未实现（仅留导入接口）。",
  "六亲条文（父母宫/兄弟宫…条文字号）：上游仅有关键词启发式分类，非编号规则，本仓不采用。",
  "太玄数 / 洛书换算：未获公开且可核验的规则，未实现。",
] as const;
