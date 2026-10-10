/**
 * 赫尔墨斯卡巴拉（Hermetic Qabalah）对照表：四界、生命树十辉、二十二字母。
 *
 * 来源与许可：
 * - 十辉与二十二字母的名称、数值、三分法（3 母 / 7 双 / 12 单）出自《创造之书》
 *   （Sepher Yetzirah，中世纪，公共领域）；英语世界的通行译本（W. W. Westcott, 1887）
 *   亦属公共领域。
 * - 「四界 / 十辉」的天使与神名对照、「字母 ↔ 塔罗 / 元素 / 行星 / 星座」对照为
 *   赫尔墨斯传统（Golden Dawn 一系）的通行对应，属该体系的对照事实，非本仓自创。
 * - 数值系统（gematria）的十三种算法见 `./gematria`（移植自 MIT 的 `mispar`）。
 */

export const TETRAGRAMMATON = ["י", "ה", "ו", "ה"] as const;

export type QabalahWorld = {
  id: string;
  name: string;
  hebrew: string;
  zh: string;
  element: string;
  letter: string;
  divineName: string;
  divineNameTranslit: string;
  archangel: string;
  order: string;
  orders: string;
  sephirot: string[];
  soul: string;
  note: string;
};

/** 四界（Olamot），自高而下。 */
export const WORLDS: QabalahWorld[] = [
  {
    id: "atziluth",
    name: "Atziluth",
    hebrew: "אֲצִילוּת",
    zh: "流出界 · 神界",
    element: "火",
    letter: "י (Yod)",
    divineName: "יה",
    divineNameTranslit: "Yah",
    archangel: "Metatron 梅塔特隆",
    order: "Chayot ha Qodesh 圣兽",
    orders: "Chayot ha Qodesh（圣兽）",
    sephirot: ["Kether"],
    soul: "Yechidah / Chiah（独一灵 / 生命灵）",
    note: "纯粹神性流出，尚无可分之物；四界之首。",
  },
  {
    id: "beriah",
    name: "Beriah",
    hebrew: "בְּרִיאָה",
    zh: "创造界",
    element: "水",
    letter: "ה (Heh)",
    divineName: "יהוה אלהים",
    divineNameTranslit: "YHVH Elohim",
    archangel: "Raziel 拉结尔",
    order: "Ophanim 车轮",
    orders: "Ophanim（车轮）",
    sephirot: ["Chokmah", "Binah"],
    soul: "Neshamah（灵）",
    note: "大道与原型在此分化，为创造之始。",
  },
  {
    id: "yetzirah",
    name: "Yetzirah",
    hebrew: "יְצִירָה",
    zh: "形成界",
    element: "风（气）",
    letter: "ו (Vav)",
    divineName: "יהוה צבאות",
    divineNameTranslit: "YHVH Tzabaoth",
    archangel: "Tzaphkiel 察普基尔",
    order: "Khashmalim 电光",
    orders: "Khashmalim（电光）/ Erelim（勇者）",
    sephirot: ["Chesed", "Geburah", "Tiphareth", "Netzach", "Hod", "Yesod"],
    soul: "Ruach（魂）",
    note: "情感、心智与形象在此成形，为天使与灵体所居之界。",
  },
  {
    id: "assiah",
    name: "Assiah",
    hebrew: "עֲשִׂיָּה",
    zh: "行动界 · 物质界",
    element: "地",
    letter: "ה (Heh, 末位)",
    divineName: "אדני מלך",
    divineNameTranslit: "Adonai Melekh",
    archangel: "Tzadkiel 萨德基尔",
    order: "Ashim 火焰",
    orders: "Ashim（火焰）",
    sephirot: ["Malkuth"],
    soul: "Nefesh（生魂）",
    note: "四界之末，精神落实为物质与行动。",
  },
];

export type Sephirah = {
  number: number;
  name: string;
  hebrew: string;
  zh: string;
  meaning: string;
  pillar: string;
  world: string;
  divineName: string;
  divineNameTranslit: string;
  archangel: string;
  order: string;
  attribution: string;
};

/** 生命树十辉（Sephirot）。 */
export const SEPHIROT: Sephirah[] = [
  { number: 1, name: "Kether", hebrew: "כתר", zh: "王冠", meaning: "冠", pillar: "中柱", world: "Atziluth", divineName: "אהיה", divineNameTranslit: "Eheieh", archangel: "Metatron", order: "Chayot ha Qodesh", attribution: "原初之气 / 王冠" },
  { number: 2, name: "Chokmah", hebrew: "חכמה", zh: "智慧", meaning: "智慧", pillar: "右柱（慈悲柱）", world: "Beriah", divineName: "יה", divineNameTranslit: "Yah", archangel: "Raziel", order: "Ophanim", attribution: "黄道带 / 天王" },
  { number: 3, name: "Binah", hebrew: "בינה", zh: "理解", meaning: "理解", pillar: "左柱（严厉柱）", world: "Beriah", divineName: "יהוה אלהים", divineNameTranslit: "YHVH Elohim", archangel: "Tzaphkiel", order: "Erelim / Aralim", attribution: "土星" },
  { number: 4, name: "Chesed", hebrew: "חסד", zh: "慈悲", meaning: "慈爱", pillar: "右柱", world: "Yetzirah", divineName: "אל", divineNameTranslit: "El", archangel: "Tzadkiel", order: "Khashmalim", attribution: "木星" },
  { number: 5, name: "Geburah", hebrew: "גבורה", zh: "严厉", meaning: "力量", pillar: "左柱", world: "Yetzirah", divineName: "אלהים גבור", divineNameTranslit: "Elohim Gibor", archangel: "Khamael", order: "Seraphim", attribution: "火星" },
  { number: 6, name: "Tiphareth", hebrew: "תפארת", zh: "美", meaning: "美", pillar: "中柱", world: "Yetzirah", divineName: "יהוה אלוה ודעת", divineNameTranslit: "YHVH Eloah ve-Daath", archangel: "Raphael", order: "Malachim", attribution: "太阳" },
  { number: 7, name: "Netzach", hebrew: "נצח", zh: "胜利", meaning: "恒久", pillar: "右柱", world: "Yetzirah", divineName: "יהוה צבאות", divineNameTranslit: "YHVH Tzabaoth", archangel: "Haniel", order: "Elohim", attribution: "金星" },
  { number: 8, name: "Hod", hebrew: "הוד", zh: "荣耀", meaning: "荣光", pillar: "左柱", world: "Yetzirah", divineName: "אלהים צבאות", divineNameTranslit: "Elohim Tzabaoth", archangel: "Michael", order: "Beni Elohim", attribution: "水星" },
  { number: 9, name: "Yesod", hebrew: "יסוד", zh: "基础", meaning: "根基", pillar: "中柱", world: "Yetzirah", divineName: "שדי אל חי", divineNameTranslit: "Shaddai El Chai", archangel: "Gabriel", order: "Kerubim", attribution: "月亮" },
  { number: 10, name: "Malkuth", hebrew: "מלכות", zh: "王国", meaning: "国度", pillar: "中柱（终点）", world: "Assiah", divineName: "אדני מלך", divineNameTranslit: "Adonai Melekh", archangel: "Sandalphon", order: "Ashim", attribution: "地球 / 四元素" },
];

export type LetterKind = "母" | "双" | "单";

export type HebrewLetter = {
  path: number;
  glyph: string;
  name: string;
  zh: string;
  value: number;
  kind: LetterKind;
  meaning: string;
  attribution: string;
  tarot: string;
  tarotNumber: number;
};

/** 二十二字母，含《创造之书》的三分法与赫尔墨斯传统的塔罗 / 元素 / 行星 / 星座对照。 */
export const LETTERS: HebrewLetter[] = [
  { path: 11, glyph: "א", name: "Aleph", zh: "阿列夫", value: 1, kind: "母", meaning: "牛 / 气息", attribution: "风（元素）", tarot: "愚者", tarotNumber: 0 },
  { path: 12, glyph: "ב", name: "Beth", zh: "贝特", value: 2, kind: "双", meaning: "房屋", attribution: "水星", tarot: "魔术师", tarotNumber: 1 },
  { path: 13, glyph: "ג", name: "Gimel", zh: "吉梅尔", value: 3, kind: "双", meaning: "骆驼", attribution: "月亮", tarot: "女祭司", tarotNumber: 2 },
  { path: 14, glyph: "ד", name: "Daleth", zh: "达列特", value: 4, kind: "双", meaning: "门", attribution: "金星", tarot: "皇后", tarotNumber: 3 },
  { path: 15, glyph: "ה", name: "Heh", zh: "赫", value: 5, kind: "单", meaning: "窗 / 呼吸", attribution: "白羊座", tarot: "皇帝", tarotNumber: 4 },
  { path: 16, glyph: "ו", name: "Vav", zh: "瓦夫", value: 6, kind: "单", meaning: "钉 / 钩", attribution: "金牛座", tarot: "教皇", tarotNumber: 5 },
  { path: 17, glyph: "ז", name: "Zayin", zh: "扎因", value: 7, kind: "单", meaning: "剑", attribution: "双子座", tarot: "恋人", tarotNumber: 6 },
  { path: 18, glyph: "ח", name: "Cheth", zh: "海特", value: 8, kind: "单", meaning: "篱笆", attribution: "巨蟹座", tarot: "战车", tarotNumber: 7 },
  { path: 19, glyph: "ט", name: "Teth", zh: "泰特", value: 9, kind: "单", meaning: "蛇 / 篮", attribution: "狮子座", tarot: "力量", tarotNumber: 8 },
  { path: 20, glyph: "י", name: "Yod", zh: "尤德", value: 10, kind: "单", meaning: "手", attribution: "处女座", tarot: "隐者", tarotNumber: 9 },
  { path: 21, glyph: "כ", name: "Kaph", zh: "卡夫", value: 20, kind: "双", meaning: "掌", attribution: "木星", tarot: "命运之轮", tarotNumber: 10 },
  { path: 22, glyph: "ל", name: "Lamed", zh: "拉梅德", value: 30, kind: "单", meaning: "刺棒 / 杖", attribution: "天秤座", tarot: "正义", tarotNumber: 11 },
  { path: 23, glyph: "מ", name: "Mem", zh: "梅姆", value: 40, kind: "母", meaning: "水", attribution: "水（元素）", tarot: "倒吊人", tarotNumber: 12 },
  { path: 24, glyph: "נ", name: "Nun", zh: "努恩", value: 50, kind: "单", meaning: "鱼", attribution: "天蝎座", tarot: "死神", tarotNumber: 13 },
  { path: 25, glyph: "ס", name: "Samekh", zh: "萨梅赫", value: 60, kind: "单", meaning: "支柱", attribution: "射手座", tarot: "节制", tarotNumber: 14 },
  { path: 26, glyph: "ע", name: "Ayin", zh: "阿因", value: 70, kind: "单", meaning: "眼", attribution: "摩羯座", tarot: "恶魔", tarotNumber: 15 },
  { path: 27, glyph: "פ", name: "Peh", zh: "佩", value: 80, kind: "双", meaning: "口", attribution: "火星", tarot: "塔", tarotNumber: 16 },
  { path: 28, glyph: "צ", name: "Tsadi", zh: "察迪", value: 90, kind: "单", meaning: "钩 / 义人", attribution: "水瓶座", tarot: "星星", tarotNumber: 17 },
  { path: 29, glyph: "ק", name: "Qoph", zh: "库夫", value: 100, kind: "单", meaning: "后脑 / 针眼", attribution: "双鱼座", tarot: "月亮", tarotNumber: 18 },
  { path: 30, glyph: "ר", name: "Resh", zh: "雷什", value: 200, kind: "双", meaning: "头", attribution: "太阳", tarot: "太阳", tarotNumber: 19 },
  { path: 31, glyph: "ש", name: "Shin", zh: "辛", value: 300, kind: "母", meaning: "牙", attribution: "火（元素）", tarot: "审判", tarotNumber: 20 },
  { path: 32, glyph: "ת", name: "Tav", zh: "塔夫", value: 400, kind: "双", meaning: "印记 / 十字", attribution: "土星", tarot: "世界", tarotNumber: 21 },
];

export const LETTER_BY_GLYPH: Record<string, HebrewLetter> = Object.fromEntries(LETTERS.map((letter) => [letter.glyph, letter]));

/** 末位字母（含终形）→ 基础形式与终形数值。 */
export const FINAL_FORMS: Record<string, { base: string; value: number }> = {
  ך: { base: "כ", value: 500 },
  ם: { base: "מ", value: 600 },
  ן: { base: "נ", value: 700 },
  ף: { base: "פ", value: 800 },
  ץ: { base: "צ", value: 900 },
};

/** 同值字母（标准数值 ≤ 400 时可直接查）。 */
export const letterByValue = (value: number) => LETTERS.find((letter) => letter.value === value);
