/**
 * 13:20 频率系统（Dreamspell / 十三月历的卓尔金计数）。
 *
 * 口径移植自两个 MIT 许可的开源实现，并以它们的测试向量校验：
 *  - `@oshimishi/dreamspell-math`（MIT，(c) 2018 oshimish；仓库
 *    https://github.com/oshimish/dreamspell-math，发布名 `@oshimishi/dreamspell-math`
 *    0.3.2）：印章 / 调性 / 波符 / 颜色 / 神谕（高我五位）/ 十三月历
 *    （月、日、等离子、周）与闰日不推进的约定，以及银河门户 / 神秘柱矩阵。
 *    逐字段出处见各处注释的 `文件:行`。
 *  - `joyozhang333-lgtm/mayan-kin`（MIT）：参考日 2013-07-26 = Kin 164 与
 *    「闰日跳过」的 13:20 计数。
 *
 * 关键约定：该计数把 2 月 29 日视为「不推进 kin」（28 日与 29 日同 kin），
 * 十三月历每年 13×28 + 1 个「无时间日」（7 月 25 日）。
 * 印章与调性的名称（红龙、磁性…）为该体系的通行命名（José Argüelles 的
 * Dreamspell / 13 Moon Calendar 体系），此处按开源实现转写。
 */

import { julianDayNumber, type DateParts } from "./traditional";

const REFERENCE: DateParts = [2013, 7, 26];
const REFERENCE_KIN = 164;

export const SEALS = ["红龙", "白风", "蓝夜", "黄种子", "红蛇", "白世界桥", "蓝手", "黄星星", "红月", "白狗", "蓝猴", "黄人", "红天行者", "白巫师", "蓝鹰", "黄战士", "红地球", "白镜", "蓝风暴", "黄太阳"];
export const SEALS_EN = ["Red Dragon", "White Wind", "Blue Night", "Yellow Seed", "Red Serpent", "White Worldbridger", "Blue Hand", "Yellow Star", "Red Moon", "White Dog", "Blue Monkey", "Yellow Human", "Red Skywalker", "White Wizard", "Blue Eagle", "Yellow Warrior", "Red Earth", "White Mirror", "Blue Storm", "Yellow Sun"];
export const SEAL_KEYWORDS = ["诞生 · 滋养 · 存在", "精神 · 呼吸 · 沟通", "梦想 · 丰盛 · 直觉", "觉察 · 目标 · 开花", "生命力 · 本能 · 生存", "死亡 · 平等 · 机会", "知道 · 疗愈 · 完成", "优雅 · 艺术 · 美", "净化 · 流动 · 水", "爱 · 忠诚 · 心", "魔法 · 幻象 · 游戏", "自由意志 · 智慧 · 影响", "空间 · 探索 · 觉醒", "永恒 · 魅力 · 感受力", "视野 · 创造 · 心智", "智慧 · 勇气 · 质疑", "导航 · 进化 · 同步", "无限 · 秩序 · 反射", "蜕变 · 催化 · 能量", "开悟 · 生命 · 智慧火"];
export const TONES = ["磁性", "月亮", "电力", "自存", "超频", "韵律", "共振", "银河", "太阳", "行星", "光谱", "水晶", "宇宙"];
export const TONES_EN = ["Magnetic", "Lunar", "Electric", "Self-Existing", "Overtone", "Rhythmic", "Resonant", "Galactic", "Solar", "Planetary", "Spectral", "Crystal", "Cosmic"];
export const TONE_KEYWORDS = ["统一 · 吸引 · 目的", "极化 · 挑战 · 稳定", "激活 · 连接 · 服务", "定义 · 形式 · 测量", "赋权 · 指挥 · 辐射", "平衡 · 组织 · 等同", "通道 · 启发 · 调谐", "和谐 · 整合 · 模范", "意图 · 脉动 · 实现", "显化 · 完美 · 产出", "溶解 · 释放 · 解放", "合作 · 奉献 · 普遍化", "持久 · 超越 · 存在"];
export const COLORS = ["红", "白", "蓝", "黄"];
export const PLASMAS = ["Dali", "Seli", "Gamma", "Kali", "Alpha", "Limi", "Silio"];

/**
 * 银河门户 / 神秘柱矩阵（Zolkin 13×20 网格，13 列 × 20 行，行主序）。
 * 0 = 普通日，1 = 银河门户（Galactic Portal，52 个/轮），2 = 神秘柱（Mystic Column，
 * 即 Zolkin 中央第 7 列，20 个/轮）。
 *
 * 逐值照搬 `@oshimishi/dreamspell-math@0.3.2` 的 `src/Kin.ts:6-27`
 * （MIT，(c) 2018 oshimish；仓库 https://github.com/oshimish/dreamspell-math）。
 * 上游测试 `__tests__/Kin-spec.ts` 亦固定：矩阵长 260、含 52 个 1、20 个 2。
 */
export const PORTALS_MATRIX: number[] = [
  1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, // 1
  0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0,
  0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0,
  0, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 0,
  0, 0, 0, 0, 1, 0, 2, 0, 1, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, // 7
  0, 0, 0, 0, 1, 1, 2, 1, 1, 0, 0, 0, 0,
  0, 0, 0, 1, 0, 1, 2, 1, 0, 1, 0, 0, 0,
  0, 0, 1, 0, 0, 1, 2, 1, 0, 0, 1, 0, 0,
  0, 0, 1, 0, 0, 1, 2, 1, 0, 0, 1, 0, 0,
  0, 0, 0, 1, 0, 1, 2, 1, 0, 1, 0, 0, 0,
  0, 0, 0, 0, 1, 1, 2, 1, 1, 0, 0, 0, 0, // 13
  0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 1, 0, 2, 0, 1, 0, 0, 0, 0,
  0, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 0,
  0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0,
  0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0,
  1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, // 20
];

export type ZolkinPortal = {
  /** Zolkin 13×20 网格中的行（1 基；`src/Kin.ts:76-79`）。 */
  row: number;
  /** Zolkin 13×20 网格中的列（1 基；`src/Kin.ts:80-83`）。 */
  column: number;
  /** 矩阵取值：0 普通 / 1 银河门户 / 2 神秘柱。 */
  value: number;
  /** 银河门户（`src/Kin.ts:90`）。 */
  isGalacticPortal: boolean;
  /** 神秘柱（`src/Kin.ts:91`）。 */
  isMysticColumn: boolean;
};

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const compare = (a: DateParts, b: DateParts) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

const countLeapDays = (a: DateParts, b: DateParts) => {
  const [lo, hi] = compare(a, b) <= 0 ? [a, b] : [b, a];
  let count = 0;
  for (let year = lo[0]; year <= hi[0]; year += 1) {
    if (!isLeapYear(year)) continue;
    const leapDay: DateParts = [year, 2, 29];
    if (compare(lo, leapDay) < 0 && compare(leapDay, hi) <= 0) count += 1;
  }
  return count;
};

const parse = (iso: string): DateParts => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error("日期格式无效，应为 YYYY-MM-DD。");
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

/** 13:20 计数：闰日不推进，参考 2013-07-26 = Kin 164。 */
export const dreamspellKin = (iso: string): number => {
  const date = parse(iso);
  const delta = julianDayNumber(date) - julianDayNumber(REFERENCE);
  const skips = delta >= 0 ? countLeapDays(REFERENCE, date) : -countLeapDays(date, REFERENCE);
  const adjusted = delta - skips;
  return ((((REFERENCE_KIN - 1 + adjusted) % 260) + 260) % 260) + 1;
};

export type OraclePosition = { role: string; roleEn: string; seal: number; tone: number; sealName: string; sealNameEn: string; toneName: string; color: string };

const guideOffset = (tone: number) => {
  if (tone === 1 || tone === 6 || tone === 11) return 0;
  if (tone === 2 || tone === 7 || tone === 12) return 12;
  if (tone === 3 || tone === 8 || tone === 13) return 4;
  if (tone === 4 || tone === 9) return 16;
  return 8; // tone 5 / 10
};

const mod = (value: number, modulus: number) => ((value % modulus) + modulus) % modulus;
const wrap1 = (value: number, modulus: number) => mod(value - 1, modulus) + 1;

/**
 * Zolkin 网格位置与门户判定。
 * 行 / 列换算与上游 `src/Kin.ts:76-83` 等价（这里用 0 基再 +1 的同余写法）；
 * 矩阵索引 `col-1 + (row-1)*13` 与 `src/Kin.ts:88` 一致。
 */
export const zolkinPortal = (kin: number): ZolkinPortal => {
  const index = wrap1(Math.round(kin), 260);
  const row = ((index - 1) % 20) + 1;
  const column = Math.floor((index - 1) / 20) + 1;
  const value = PORTALS_MATRIX[column - 1 + (row - 1) * 13];
  return { row, column, value, isGalacticPortal: value === 1, isMysticColumn: value === 2 };
};

export type MoonDate = { moon: number; day: number; week: number; dayOfWeek: number; plasma: string; dayOfYear: number; yearStart: string; outOfTime: boolean };

/** 十三月历：13 × 28 天 + 无时间日（7 月 25 日）；闰年 2 月 29 日不占月序。 */
export const moonDate = (iso: string): MoonDate => {
  const [year, month, day] = parse(iso);
  const asDate = [year, month, day] as DateParts;
  const julyStart: DateParts = [year, 7, 26];
  const start: DateParts = compare(asDate, julyStart) < 0 ? [year - 1, 7, 26] : julyStart;
  let dayOfYear = julianDayNumber(asDate) - julianDayNumber(start);
  if (isLeapYear(year) && dayOfYear >= 218) dayOfYear -= 1;
  const moon = Math.floor(dayOfYear / 28) + 1;
  const dayOfMoon = (dayOfYear % 28) + 1;
  const dayOfWeek = dayOfMoon % 7 === 0 ? 7 : dayOfMoon % 7;
  return {
    moon,
    day: dayOfMoon,
    week: Math.floor((dayOfMoon - 1) / 7) + 1,
    dayOfWeek,
    plasma: PLASMAS[dayOfWeek - 1],
    dayOfYear,
    yearStart: start.join("-"),
    outOfTime: dayOfYear === 364,
  };
};

export type DreamspellChart = {
  kin: number;
  seal: number;
  tone: number;
  color: string;
  sealName: string;
  sealNameEn: string;
  sealKeywords: string;
  toneName: string;
  toneNameEn: string;
  toneKeywords: string;
  wavespell: number;
  wavespellStartKin: number;
  wavespellSeal: number;
  wavespellSealName: string;
  wavespellPosition: number;
  castle: number;
  /** 银河门户 / 神秘柱（Zolkin 网格位置）。 */
  portals: ZolkinPortal;
  oracle: OraclePosition[];
  moon: MoonDate;
};

export const buildDreamspell = (iso: string): DreamspellChart => {
  const kin = dreamspellKin(iso);
  const seal = wrap1(kin, 20);
  const tone = wrap1(kin, 13);
  const color = COLORS[wrap1(seal, 4) - 1];
  const wavespell = Math.floor((kin - 1) / 13) + 1;
  const wavespellStartKin = (wavespell - 1) * 13 + 1;
  const wavespellSeal = wrap1(wavespellStartKin, 20);

  // 神谕五方与上游 `src/Oracle.ts:19-45`（analog/driver/antipod/occult）逐式一致：
  //   analog  = 19 - seal（mod 20）
  //   driver  = seal + {0,-8,+8,+4,-4}，取决于 tone 的点数（`src/Kin.ts` Tone.dots）
  //   antipod = kin + 130（等价于 seal + 10，tone 不变，因 130 = 10×13）
  //   occult  = 1 - kin（mod 260）
  const support = wrap1(19 - seal, 20);
  const challenge = wrap1(seal + 10, 20);
  const occultSeal = wrap1(21 - seal, 20);
  const occultTone = 14 - tone;
  const guide = wrap1(seal + guideOffset(tone), 20);

  const position = (role: string, roleEn: string, sealNumber: number, toneNumber: number): OraclePosition => ({
    role,
    roleEn,
    seal: sealNumber,
    tone: toneNumber,
    sealName: SEALS[sealNumber - 1],
    sealNameEn: SEALS_EN[sealNumber - 1],
    toneName: TONES[toneNumber - 1],
    color: COLORS[wrap1(sealNumber, 4) - 1],
  });

  return {
    kin,
    seal,
    tone,
    color,
    sealName: SEALS[seal - 1],
    sealNameEn: SEALS_EN[seal - 1],
    sealKeywords: SEAL_KEYWORDS[seal - 1],
    toneName: TONES[tone - 1],
    toneNameEn: TONES_EN[tone - 1],
    toneKeywords: TONE_KEYWORDS[tone - 1],
    wavespell,
    wavespellStartKin,
    wavespellSeal,
    wavespellSealName: SEALS[wavespellSeal - 1],
    wavespellPosition: wrap1(kin, 13),
    castle: Math.floor((kin - 1) / 52) + 1,
    portals: zolkinPortal(kin),
    oracle: [
      position("主印记", "Kin", seal, tone),
      position("支持", "Analog", support, tone),
      position("引导", "Guide", guide, tone),
      position("挑战", "Antipode", challenge, tone),
      position("隐藏推动", "Occult", occultSeal, occultTone),
    ],
    moon: moonDate(iso),
  };
};
