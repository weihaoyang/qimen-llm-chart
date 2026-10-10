/**
 * 大六壬基础数据表（古典内容，公共领域）。
 *
 * 天将顺序、干寄宫、十二贵人、驿马、三合局、建除、五行生克等均为《六壬大全》
 * 一系的通行口径；月将表按「太阳过宫（中气）」给出，本仓另以太阳黄经直接判定。
 * 三传部分见 `./sanchuan-table`（移植自 Apache-2.0 的 liuren-ts-lib）。
 */

export const TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/** 十二天将，按贵人起的顺行顺序。 */
export const SHEN_JIANG = ["贵人", "螣蛇", "朱雀", "六合", "勾陈", "青龙", "天空", "白虎", "太常", "玄武", "太阴", "天后"];

/** 干寄宫（十干寄十二支）。 */
export const JI_GONG: Record<string, string> = { 甲: "寅", 乙: "辰", 丙: "巳", 丁: "未", 戊: "巳", 己: "未", 庚: "申", 辛: "戌", 壬: "亥", 癸: "丑" };

/**
 * 昼贵（阳贵）/ 夜贵（阴贵）。口诀「甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，
 * 壬癸兔蛇藏，六辛逢马虎」，前者为昼贵。
 * 注：个别流派将壬癸的昼/夜贵人互换（liuren-ts-lib 即为互乙），本仓取通行口诀。
 */
export const ZHOU_GUI: Record<string, string> = { 甲: "丑", 乙: "子", 丙: "亥", 丁: "亥", 戊: "丑", 己: "子", 庚: "丑", 辛: "午", 壬: "卯", 癸: "卯" };
export const YE_GUI: Record<string, string> = { 甲: "未", 乙: "申", 丙: "酉", 丁: "酉", 戊: "未", 己: "申", 庚: "未", 辛: "寅", 壬: "巳", 癸: "巳" };

/** 贵人所临之地支决定顺行 / 逆行。 */
export const GUI_SHUN_ZHI = ["亥", "子", "丑", "寅", "卯", "辰"];

/** 月将（十二神名，按太阳过宫顺序）。 */
export const YUE_JIANG_NAMES = ["神后", "大吉", "功曹", "太冲", "天罡", "太乙", "胜光", "小吉", "传送", "从魁", "河魁", "登明"];

/** 驿马（以三合局取）。 */
export const YI_MA: Record<string, string> = { 寅: "申", 午: "申", 戌: "申", 申: "寅", 子: "寅", 辰: "寅", 巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳" };

/** 三合局（按三支排序后的键）。 */
export const SAN_HE: Record<string, string> = { 申子辰: "润下", 寅午戌: "炎上", 巳酉丑: "从革", 亥卯未: "曲直" };

/** 十二建除（自月建起顺行）。 */
export const JIAN_CHU = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"];

export const WU_XING: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

/** 六亲：以日干五行为「我」，比较他神五行。 */
export const liuQin = (dayGan: string, other: string) => {
  const me = WU_XING[dayGan];
  const him = WU_XING[other];
  if (!me || !him) return "";
  if (me === him) return "兄弟";
  if (SHENG[me] === him) return "子孙";
  if (KE[me] === him) return "妻财";
  if (KE[him] === me) return "官鬼";
  if (SHENG[him] === me) return "父母";
  return "";
};

/** 日柱旬首与旬空（依据六十甲子序）。 */
export const xunAndKong = (jiazi: readonly string[], dayGanZhi: string) => {
  const index = jiazi.indexOf(dayGanZhi);
  if (index < 0) return { xunShou: "", kong: [] as string[] };
  const start = Math.floor(index / 10) * 10;
  return { xunShou: jiazi[start], kong: [jiazi[(start + 10) % 60].slice(1), jiazi[(start + 11) % 60].slice(1)] };
};

/** 旬遁：自旬首之支起，按十干依次配十二支（余二支空亡无干）。 */
export const xunDun = (xunShou: string) => {
  const map: Record<string, string> = {};
  const startIndex = DI_ZHI.indexOf(xunShou.slice(1));
  if (startIndex < 0) return map;
  for (let i = 0; i < 10; i += 1) map[DI_ZHI[(startIndex + i) % 12]] = TIAN_GAN[i];
  return map;
};

/** 太阳黄经 → 月将（太阳过宫，中气换将）。 */
export const yueJiangFromSunLongitude = (sunLongitude: number) => {
  const index = ((10 - Math.floor(((sunLongitude % 360) + 360) % 360 / 30)) % 12 + 12) % 12;
  return index;
};
