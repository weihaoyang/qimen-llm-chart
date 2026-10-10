/**
 * 传统玛雅历（长纪年 / 卓尔金 / 哈布 / 夜之主 / 历法轮）。
 *
 * 采用 GMT 相关系数 584283（Goodman–Martínez–Thompson），即 0.0.0.0.0 = 4 Ajaw
 * 8 Kumkʼu。相关系数在学界仍有 584283 / 584285 / 584286 等讨论，本表固定 584283
 * 并在界面注明。
 *
 * 卓尔金口径与开源实现 `nahuales`（ISC License, Sergio Zuleta / Walter Vides）
 * 及 `MiguelYax/mayan-calendar`（MIT）一致：以 1983-09-16 = 1 Bʼatzʼ 校验通过。
 * 日名/月名沿用通行书写（尤卡坦语与基切语两套），属公共领域的历史名称。
 */

const GMT = 584283;

export type DateParts = [year: number, month: number, day: number];

const parse = (iso: string): DateParts => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error("日期格式无效，应为 YYYY-MM-DD。");
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

/** 格里高利历的儒略日数（整数，正午）。 */
export const julianDayNumber = ([year, month, day]: DateParts) => {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
};

export const daysSinceEpoch = (iso: string) => julianDayNumber(parse(iso)) - GMT;

export const YUCATEC_DAY_SIGNS = ["Imix", "Ikʼ", "Akʼbʼal", "Kʼan", "Chikchan", "Kimi", "Manikʼ", "Lamat", "Muluk", "Ok", "Chuwen", "Eb", "Bʼen", "Iʼx", "Men", "Kibʼ", "Kabʼan", "Etzʼnabʼ", "Kawak", "Ajaw"];
export const KICHE_DAY_SIGNS = ["Imox", "Iqʼ", "Aqʼabʼal", "Kʼat", "Kan", "Kame", "Kej", "Qʼanil", "Toj", "Tzʼiʼ", "Bʼatzʼ", "E", "Aj", "Iʼx", "Tzʼikin", "Ajmak", "Noʼj", "Tijax", "Kawoq", "Ajpu"];
/** 日名的通行意涵（传统象形含义归类，非计算事实）。 */
export const DAY_SIGN_GLOSS = ["水百合 / 鳄", "风 / 呼吸", "黑暗 / 夜", "玉米 / 成熟", "羽蛇", "死亡 / 先祖", "鹿 / 手", "兔 / 金星", "水 / 雨", "狗", "猴 / 工匠", "草 / 齿", "芦苇 / 道路", "美洲豹", "鹰", "秃鹫 / 蜡", "地震 / 思想", "燧石 / 刀", "暴雨 / 雷", "太阳 / 主"];

export const HAAB_MONTHS = ["Pop", "Wo", "Sip", "Sotzʼ", "Sek", "Xul", "Yaxkʼin", "Mol", "Chʼen", "Yax", "Sak", "Keh", "Mak", "Kʼankʼin", "Muwan", "Pax", "Kʼayabʼ", "Kumkʼu", "Wayebʼ"];

export type Tzolkin = { number: number; signIndex: number; yucatec: string; kiche: string; gloss: string; label: string };

export const tzolkin = (days: number): Tzolkin => {
  const number = (((days + 3) % 13) + 13) % 13 + 1;
  const signIndex = (((days + 19) % 20) + 20) % 20;
  return {
    number,
    signIndex,
    yucatec: YUCATEC_DAY_SIGNS[signIndex],
    kiche: KICHE_DAY_SIGNS[signIndex],
    gloss: DAY_SIGN_GLOSS[signIndex],
    label: `${number} ${YUCATEC_DAY_SIGNS[signIndex]}`,
  };
};

export type Haab = { day: number; monthIndex: number; month: string; wayeb: boolean; label: string };

export const haab = (days: number): Haab => {
  const index = (((days + 348) % 365) + 365) % 365;
  const monthIndex = Math.floor(index / 20);
  const day = index % 20;
  const month = HAAB_MONTHS[monthIndex];
  return { day, monthIndex, month, wayeb: monthIndex === 18, label: `${day} ${month}` };
};

export type LongCount = { baktun: number; katun: number; tun: number; winal: number; kin: number; label: string };

export const longCount = (days: number): LongCount => {
  const baktun = Math.floor(days / 144000);
  let rest = days - baktun * 144000;
  const katun = Math.floor(rest / 7200);
  rest -= katun * 7200;
  const tun = Math.floor(rest / 360);
  rest -= tun * 360;
  const winal = Math.floor(rest / 20);
  const kin = rest - winal * 20;
  return { baktun, katun, tun, winal, kin, label: `${baktun}.${katun}.${tun}.${winal}.${kin}` };
};

/** 夜之主 G1–G9（0.0.0.0.0 为 G9）。 */
export const nightLord = (days: number) => (((days + 8) % 9) + 9) % 9 + 1;

export type TraditionalCalendar = {
  julianDay: number;
  daysSinceEpoch: number;
  longCount: LongCount;
  tzolkin: Tzolkin;
  haab: Haab;
  nightLord: number;
  calendarRoundDay: number;
  calendarRoundRound: number;
};

export const buildTraditionalCalendar = (iso: string): TraditionalCalendar => {
  const julianDay = julianDayNumber(parse(iso));
  const days = julianDay - GMT;
  const round = Math.floor(days / 18980);
  return {
    julianDay,
    daysSinceEpoch: days,
    longCount: longCount(days),
    tzolkin: tzolkin(days),
    haab: haab(days),
    nightLord: nightLord(days),
    calendarRoundDay: ((days % 18980) + 18980) % 18980,
    calendarRoundRound: round + 1,
  };
};
