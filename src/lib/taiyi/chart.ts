import { DEITIES, OPPOSITE_PALACE, PALACES, PALACE_SEQUENCE, YANG_PALACES, type TaiyiDeity } from "./data";

/** 十六神顺行次序（地盘环）。 */
export const RING = DEITIES.map((deity) => deity.position);
const RING_INDEX: Record<string, number> = Object.fromEntries(RING.map((position, index) => [position, index]));

/** 地盘方位 → 太乙宫序（八正宫）。十六神环只含四维（乾坤艮巽）与十二支，故南=午、北=子。 */
export const POSITION_TO_PALACE: Record<string, number> = { 乾: 1, 午: 2, 艮: 3, 卯: 4, 酉: 6, 坤: 7, 子: 8, 巽: 9, 离: 2, 震: 4, 兑: 6, 坎: 8 };
export const PALACE_TO_POSITION: Record<number, string> = { 1: "乾", 2: "午", 3: "艮", 4: "卯", 6: "酉", 7: "坤", 8: "子", 9: "巽" };

/** 阳遁/阴遁的重留方位（阳遁重留乾坤，阴遁重留艮巽）。 */
const RESERVE: Record<"阳遁" | "阴遁", string[]> = { 阳遁: ["乾", "坤"], 阴遁: ["艮", "巽"] };

const mod = (value: number, modulus: number) => ((value % modulus) + modulus) % modulus;
const isMain = (position: string) => position in POSITION_TO_PALACE;

export type TaiyiSettings = { year: number; cycle: number; dun: "auto" | "阳遁" | "阴遁"; ruJu: number | null };

export type TaiyiChart = {
  format: "qmdj-taiyi-v1";
  input: { year: number; cycle: number; dun: "阳遁" | "阴遁"; ruJu: number; derived: boolean };
  accumulation: { jiyear: number; eraRemainder: number; ruJu: number };
  taiyi: { palace: number; trigram: string; position: string; element: string; block: number };
  tianMu: { position: string; deity: TaiyiDeity; palace: number | null };
  jiShen: { position: string; deity: TaiyiDeity };
  shiJi: { position: string; deity: TaiyiDeity; palace: number | null };
  counts: {
    host: number;
    guest: number;
    hostGeneralPalace: number;
    guestGeneralPalace: number;
    hostLength: string;
    guestLength: string;
    harmony: string;
  };
  patterns: string[];
  cycle: TaiyiDeity[];
  disclaimer: string;
};

/** 积年：以上元甲子为始，据《太乙金镜式经》「至唐开元十二年（724）有 1937281 积年」。 */
export const accumulatedYears = (year: number) => 1937281 + (year - 724);

/** 入局数：积年累除元六纪周期，再累除七十二。 */
export const ruJuNumber = (jiyear: number, cycle: number) => mod(jiyear, cycle) % 72;

/** 太乙宫：三年一宫，二十四年一周，不入中宫。 */
export const taiyiPalace = (ruJu: number) => {
  const block = Math.max(1, Math.ceil(ruJu / 3));
  return { palace: PALACE_SEQUENCE[(block - 1) % 8], block };
};

/** 天目（文昌）：入局数以十八累除；阳遁自武德起、阴遁自吕申起，顺行十六神，重留乾刊（艮巽）。 */
export const tianMuPosition = (ruJu: number, dun: "阳遁" | "阴遁") => {
  const step = mod(ruJu - 1, 18) + 1;
  const start = RING_INDEX[dun === "阳遁" ? "申" : "寅"];
  const reserve = RESERVE[dun];
  let index = start;
  let count = 1;
  while (count < step) {
    index = (index + 1) % 16;
    count += 1;
    if (count < step && reserve.includes(RING[index])) count += 1;
  }
  return RING[index];
};

/** 计神：阳遁起吕申（寅）、阴遁起申，顺行十二地支，跳四维，十二年一周。 */
export const jiShenPosition = (ruJu: number, dun: "阳遁" | "阴遁") => {
  const twelve = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const start = twelve.indexOf(dun === "阳遁" ? "寅" : "申");
  return twelve[mod(start + (ruJu - 1), 12)];
};

/** 始击（客目）：以计神加于和德（艮）上，顺行十六神，取天目所乘之位。 */
export const shiJiPosition = (tianMu: string, jiShen: string) => {
  const offset = mod(RING_INDEX[tianMu] - RING_INDEX[jiShen], 16);
  return RING[mod(RING_INDEX["艮"] + offset, 16)];
};

/** 主客算：自目所在（八正宫起其宫数，间神起一），顺行数正宫之数，至太乙前一宫止。 */
export const countSum = (from: string, taiyiPosition: string) => {
  let total = isMain(from) ? POSITION_TO_PALACE[from] : 1;
  let index = RING_INDEX[from];
  if (from === taiyiPosition) return total;
  while (true) {
    index = (index + 1) % 16;
    if (RING[index] === taiyiPosition) break;
    if (isMain(RING[index])) total += POSITION_TO_PALACE[RING[index]];
  }
  return total;
};

/** 大将宫：算之个位；若为十、二十、三十整数则除九取余。 */
export const generalPalace = (count: number) => {
  const unit = count % 10;
  if (unit !== 0) return unit;
  const rest = count % 9;
  return rest === 0 ? 9 : rest;
};

export const lengthLabel = (count: number) => (count < 10 ? "短数（力不足）" : count > 30 ? "过长（拖沓迟缓）" : "长数（谋事长远）");

export const harmonyLabel = (palace: number, count: number) => {
  const yangPalace = YANG_PALACES.includes(palace);
  const odd = count % 2 === 1;
  return yangPalace === odd ? "不和之数（太乙阳宫得奇数 / 阴宫得偶数）" : "和";
};

const detectPatterns = (taiyiPalaceNumber: number, tianMuPalace: number | null, shiJiPalace: number | null, hostGeneral: number, guestGeneral: number) => {
  const patterns: string[] = [];
  const same = (value: number | null, target: number) => value !== null && value === target;
  const opposite = (value: number | null, target: number) => value !== null && OPPOSITE_PALACE[target] === value;
  if (hostGeneral === 5 || guestGeneral === 5) patterns.push("杜塞：主客大小将落入中宫");
  if (opposite(tianMuPalace, taiyiPalaceNumber)) patterns.push("对：文昌与太乙对冲");
  if (opposite(shiJiPalace, taiyiPalaceNumber) || opposite(guestGeneral, taiyiPalaceNumber)) patterns.push("格：始击或客大小将与太乙对冲");
  if (same(shiJiPalace, taiyiPalaceNumber)) patterns.push("掩：始击降临太乙宫位");
  if (same(tianMuPalace, taiyiPalaceNumber) || same(hostGeneral, taiyiPalaceNumber) || same(guestGeneral, taiyiPalaceNumber)) patterns.push("囚：文昌或四将与太乙同宫");
  if (hostGeneral === guestGeneral) patterns.push("关：主客大小将同宫");
  return patterns;
};

export const buildTaiyiChart = (settings: TaiyiSettings): TaiyiChart => {
  const { year, cycle, ruJu: override } = settings;
  const jiyear = accumulatedYears(year);
  const eraRemainder = mod(jiyear, cycle);
  const ruJu = override ?? ruJuNumber(jiyear, cycle);
  const { palace, block } = taiyiPalace(ruJu);
  const dun: "阳遁" | "阴遁" = settings.dun === "auto" ? (YANG_PALACES.includes(palace) ? "阳遁" : "阴遁") : settings.dun;

  const tianMuPos = tianMuPosition(ruJu, dun);
  const jiShenPos = jiShenPosition(ruJu, dun);
  const shiJiPos = shiJiPosition(tianMuPos, jiShenPos);
  const taiyiPosition = PALACE_TO_POSITION[palace];
  const host = countSum(tianMuPos, taiyiPosition);
  const guest = countSum(shiJiPos, taiyiPosition);
  const hostGeneral = generalPalace(host);
  const guestGeneral = generalPalace(guest);
  const tianMuPalace = isMain(tianMuPos) ? POSITION_TO_PALACE[tianMuPos] : null;
  const shiJiPalace = isMain(shiJiPos) ? POSITION_TO_PALACE[shiJiPos] : null;
  const deityOf = (position: string) => DEITIES.find((deity) => deity.position === position) ?? DEITIES[0];

  return {
    format: "qmdj-taiyi-v1",
    input: { year, cycle, dun, ruJu, derived: override === null },
    accumulation: { jiyear, eraRemainder, ruJu },
    taiyi: { palace, trigram: PALACES.find((item) => item.palace === palace)?.trigram ?? "", position: taiyiPosition, element: PALACES.find((item) => item.palace === palace)?.element ?? "", block },
    tianMu: { position: tianMuPos, deity: deityOf(tianMuPos), palace: tianMuPalace },
    jiShen: { position: jiShenPos, deity: deityOf(jiShenPos) },
    shiJi: { position: shiJiPos, deity: deityOf(shiJiPos), palace: shiJiPalace },
    counts: {
      host,
      guest,
      hostGeneralPalace: hostGeneral,
      guestGeneralPalace: guestGeneral,
      hostLength: lengthLabel(host),
      guestLength: lengthLabel(guest),
      harmony: harmonyLabel(palace, host),
    },
    patterns: detectPatterns(palace, tianMuPalace, shiJiPalace, hostGeneral, guestGeneral),
    cycle: DEITIES,
    disclaimer:
      "太乙神数研究盘：按公共领域古籍《太乙金镜式经》《太乙全书》一系规则实现（太乙三年一宫、二十四年一周不入中宫；天目以入局数十八累除、阳遁自武德起阴遁自吕申起并重留乾坤/艮巽；计神顺行十二支；始击以计神加和德顺行十六神；主客算自二目顺数正宫至太乙前一宫；格局取杜塞/对/格/掩/囚/关）。未采用开源实现（检索到者实为九星换皮，非太乙神数）。「元六纪周期」古籍作三百六十五，而据金镜式经复现的现代平台与三百六十吻合，故默认 360 并可在界面切换；起元与阳阴遁亦有异说，故入局数与遁皆可覆盖。仅供研究，不构成预测或现实裁决。",
  };
};
