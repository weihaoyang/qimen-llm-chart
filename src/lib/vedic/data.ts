/**
 * 吠陀占星（Jyotish）基础数据：12 宫（rashi）、27 宿（nakshatra）、九曜（graha）
 * 与 16 分盘（Shodashavarga）定义。
 *
 * 分盘定义、宿的名称与宿主序列移植自 MIT 许可的开源实现：
 *  - `vedic-kundali`（MIT）——16 分盘表与 `vargaSign` 规则
 *    https://github.com/ravipathak3001/vedic-panchang
 *  - `vedic-panchanga`（MIT）——RASHIS / NAKSHATRAS / NAKSHATRA_LORDS
 * 宫名、宿名与分盘名称属古典文献（Parashara 体系）的通行名称，为公共领域内容；
 * 中文名称为本仓对照通行译名所作，分盘的「主管领域」为古典所述 significations。
 */

export type Rashi = { iast: string; en: string; zh: string; abbr: string };

export const RASHIS: Rashi[] = [
  { iast: "Mesha", en: "Aries", zh: "白羊", abbr: "Ar" },
  { iast: "Vrishabha", en: "Taurus", zh: "金牛", abbr: "Ta" },
  { iast: "Mithuna", en: "Gemini", zh: "双子", abbr: "Ge" },
  { iast: "Karka", en: "Cancer", zh: "巨蟹", abbr: "Cn" },
  { iast: "Simha", en: "Leo", zh: "狮子", abbr: "Le" },
  { iast: "Kanya", en: "Virgo", zh: "处女", abbr: "Vi" },
  { iast: "Tula", en: "Libra", zh: "天秤", abbr: "Li" },
  { iast: "Vrishchika", en: "Scorpio", zh: "天蝎", abbr: "Sc" },
  { iast: "Dhanu", en: "Sagittarius", zh: "射手", abbr: "Sg" },
  { iast: "Makara", en: "Capricorn", zh: "摩羯", abbr: "Cp" },
  { iast: "Kumbha", en: "Aquarius", zh: "水瓶", abbr: "Aq" },
  { iast: "Meena", en: "Pisces", zh: "双鱼", abbr: "Pi" },
];

export const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];

/** 宿主序列，与 27 宿循环对应（每宿一位，9 位循环）。 */
export const NAKSHATRA_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

export type Graha = { id: string; zh: string; iast: string; abbr: string };

/** 九曜，按吠陀常用顺序。 */
export const GRAHAS: Graha[] = [
  { id: "Sun", zh: "太阳", iast: "Surya", abbr: "Su" },
  { id: "Moon", zh: "月亮", iast: "Chandra", abbr: "Mo" },
  { id: "Mars", zh: "火星", iast: "Mangala", abbr: "Ma" },
  { id: "Mercury", zh: "水星", iast: "Budha", abbr: "Me" },
  { id: "Jupiter", zh: "木星", iast: "Guru", abbr: "Ju" },
  { id: "Venus", zh: "金星", iast: "Shukra", abbr: "Ve" },
  { id: "Saturn", zh: "土星", iast: "Shani", abbr: "Sa" },
  { id: "Rahu", zh: "罗睺", iast: "Rahu", abbr: "Ra" },
  { id: "Ketu", zh: "计都", iast: "Ketu", abbr: "Ke" },
];

export const GRAHA_ZH: Record<string, string> = Object.fromEntries(GRAHAS.map((graha) => [graha.id, graha.zh]));

export type VargaDefinition = { code: string; divisions: number; iast: string; en: string; zh: string };

/** 十六分盘（Shodashavarga）。 */
export const VARGA_DEFINITIONS: VargaDefinition[] = [
  { code: "D1", divisions: 1, iast: "Rashi", en: "Birth chart", zh: "本命全盘" },
  { code: "D2", divisions: 2, iast: "Hora", en: "Wealth", zh: "财富" },
  { code: "D3", divisions: 3, iast: "Drekkana", en: "Siblings & courage", zh: "兄弟与勇气" },
  { code: "D4", divisions: 4, iast: "Chaturthamsa", en: "Fortune & property", zh: "福报与不动产" },
  { code: "D7", divisions: 7, iast: "Saptamsa", en: "Children", zh: "子女" },
  { code: "D9", divisions: 9, iast: "Navamsa", en: "Marriage & dharma", zh: "婚姻与正法" },
  { code: "D10", divisions: 10, iast: "Dasamsa", en: "Career", zh: "事业" },
  { code: "D12", divisions: 12, iast: "Dwadasamsa", en: "Parents", zh: "父母" },
  { code: "D16", divisions: 16, iast: "Shodasamsa", en: "Vehicles & comforts", zh: "车辆与受用" },
  { code: "D20", divisions: 20, iast: "Vimsamsa", en: "Spiritual life", zh: "灵修" },
  { code: "D24", divisions: 24, iast: "Chaturvimsamsa", en: "Education & learning", zh: "学习与教育" },
  { code: "D27", divisions: 27, iast: "Bhamsa", en: "Strengths & weaknesses", zh: "强弱与体能" },
  { code: "D30", divisions: 30, iast: "Trimsamsa", en: "Troubles & misfortunes", zh: "灾厄与过失" },
  { code: "D40", divisions: 40, iast: "Khavedamsa", en: "Maternal lineage", zh: "母系" },
  { code: "D45", divisions: 45, iast: "Akshavedamsa", en: "Paternal lineage", zh: "父系与一生" },
  { code: "D60", divisions: 60, iast: "Shashtiamsa", en: "Past-life karma", zh: "前世业" },
];

export const VARGA_CODES = VARGA_DEFINITIONS.map((definition) => definition.code);
export const vargaByCode = (code: string) => VARGA_DEFINITIONS.find((definition) => definition.code === code) ?? VARGA_DEFINITIONS[0];
