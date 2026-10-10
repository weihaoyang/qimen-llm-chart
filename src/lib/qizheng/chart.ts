/**
 * 七政四余排盘。
 *
 * 框架与表格（十二宫名、二十八宿序、庙旺陷表、命宫公式、七政/四余五行吉凶）移植自
 * MIT 许可项目 `dglijin-oss/chinese-metaphysics-skills` 的 `qizheng-siyu-skill`；
 * 七政黄经改用本仓既有的真实星历（celestine，公转/月球位置远比该脚本的线性近似精确）；
 * 四余按经典定义计算：罗睺/计都取黄白交点（默认「果老旧法」罗睺=降交点），
 * 月孛取月远地点（Meeus 平根；与《图书编》卷二十一「六十二日行七度、六十二年而七周天」相符）。
 * 紫气无可靠历元，仍保留上游脚本约定值并明确降级（见 `fourRemainders` 注释）。
 *
 * 二十八宿按清代黄道宿度表锚定（见 `MANSION_TABLE_QING`），不再等分 360/28。
 *
 * MIT License — Copyright (c) 2026 天工长老
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions: the above copyright notice and this
 * permission notice shall be included in all copies or substantial portions of the
 * Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */
import { buildAstroChart, offsetMinutes } from "@/lib/astro/chart";
import type { NormalizedProfileInput } from "@/lib/profile";
import { ayanamsa } from "@/lib/vedic/ayanamsa";

export const TWELVE_PALACES = ["命宫", "财帛", "兄弟", "田宅", "男女", "奴仆", "夫妻", "疾厄", "迁移", "官禄", "福德", "相貌"] as const;
export const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
/**
 * 二十八宿序（东方角亢氐房心尾箕、北方斗牛女虚危室壁、西方奎娄胃昴毕觜参、南方井鬼柳星张翼轸）。
 * 注意：这是**传世排写次序**，与黄经升序不同（黄经次序为…毕、参、觜、井…，见 `MANSION_TABLE_QING`）；
 * 本数组仅供展示与序列化，落宿判定一律走 `longitudeToMansion`。
 */
export const TWENTY_EIGHT_MANSIONS = ["角", "亢", "氐", "房", "心", "尾", "箕", "斗", "牛", "女", "虚", "危", "室", "壁", "奎", "娄", "胃", "昴", "毕", "觜", "参", "井", "鬼", "柳", "星", "张", "翼", "轸"] as const;

/** 七政：太阳、太阴与水金火木土五星（对应西方体系的日/月/水/金/火/木/土）。 */
export const SEVEN_LUMINARIES: Array<{ name: string; planet: string }> = [
  { name: "太阳", planet: "太阳" },
  { name: "太阴", planet: "月亮" },
  { name: "水星", planet: "水星" },
  { name: "金星", planet: "金星" },
  { name: "火星", planet: "火星" },
  { name: "木星", planet: "木星" },
  { name: "土星", planet: "土星" },
];

export const FOUR_REMAINDERS = ["罗睺", "计都", "月孛", "紫气"] as const;

/** 星曜庙旺陷（来自 MIT 脚本表格）。 */
const DIGNITY: Record<string, { temple?: string; prosperous?: string; fallen?: string }> = {
  太阳: { temple: "戌", prosperous: "午", fallen: "辰" },
  太阴: { temple: "未", prosperous: "卯", fallen: "酉" },
  木星: { temple: "未", prosperous: "亥", fallen: "酉" },
  火星: { temple: "卯", prosperous: "戌", fallen: "子" },
  土星: { temple: "子", prosperous: "酉", fallen: "卯" },
  金星: { temple: "酉", prosperous: "巳", fallen: "卯" },
  水星: { temple: "巳", prosperous: "申", fallen: "午" },
};

const ELEMENT: Record<string, string> = { 太阳: "火", 太阴: "水", 木星: "木", 火星: "火", 土星: "土", 金星: "金", 水星: "水", 罗睺: "火", 计都: "土", 月孛: "水", 紫气: "木" };
const FORTUNE: Record<string, string> = { 太阳: "大吉", 太阴: "吉", 木星: "吉", 火星: "凶", 土星: "凶", 金星: "吉", 水星: "中", 罗睺: "凶", 计都: "凶", 月孛: "凶", 紫气: "吉" };

export type QizhengStar = {
  name: string;
  kind: "七政" | "四余";
  longitude: number;
  palace: number;
  branch: string;
  palaceName: string;
  mansion: string;
  dignity: string;
  element: string;
  fortune: string;
  note?: string;
};

export type QizhengChart = {
  format: "qmdj-qizheng-chart-v1";
  input: { datetime: string; timeZone: string };
  mingPalace: { index: number; branch: string };
  palaces: Array<{ name: string; index: number; branch: string }>;
  stars: QizhengStar[];
  complete: boolean;
  disclaimer: string;
};

const wrap = (value: number) => ((value % 360) + 360) % 360;

/**
 * 黄经 → 宫位索引（= EARTHLY_BRANCHES 的下标，子=0…亥=11）。
 *
 * 依古典「十二次」配十二宫（果老星宗「太阳过宫」表）：
 * 白羊=戌、金牛=酉、双子=申、巨蟹=未、狮子=午、处女=巳、
 * 天秤=辰、天蝎=卯、射手=寅、摩羯=丑、水瓶=子、双鱼=亥。
 *
 * 历史说明：上游 MIT 脚本用 `floor((lon+60)/30)` 把白羊映射到「寅」，与其自身
 * （按古典键位编制的）庙旺陷表互相矛盾，属该脚本的已知错误；本仓已改为古典口径。
 */
export const longitudeToPalace = (longitude: number) => ((10 - Math.floor(wrap(longitude) / 30)) % 12 + 12) % 12;

/**
 * 二十八宿黄道宿度（距星黄经）。
 *
 * 来源：清《二十八宿黄道经纬度钤》，收入《中西算学丛书初编》（清·求敏斋主人辑）。
 * 原文逐宿给出「黄道经度／黄道纬度」，如「斗初宫五度五十分，南三度五十分」「觜五宫
 * 十九度二十二分，南十三度二十六分」，并注：「右二十八宿钤，乃历元甲子年之黄道经纬度分。
 * 其纬度距黄道之南北，千古不移，而经度则每岁东行五十一秒，所谓岁差也。」
 *
 * 历元与起算点由《清史稿·卷二十八·天文三》「康熙甲子年黄道十二次初度值宿」交叉确定：
 * 该表列「星纪箕三度一十分、大火角一十度三十四分、析木房一度三十九分」等十二值，
 * 与本表逐宿相减恰得整 30° 的十二次界，故本表历元＝康熙二十三年甲子（1684），
 * 「初宫 0°」＝星纪初＝冬至点＝回归黄经 270°。
 * 于是各距星的回归黄经 = 270° + (宫 × 30 + 度 + 分 / 60)，历元 1684。
 *
 * 校验（见 chart.test.ts）：
 *  1. 28 宿距度（相邻距星之差）合计恰为 360°（原表自洽）；本表宿度为
 *     斗23°47′ 牛7°46′ 女11°38′ 虚9°59′ 危20°07′ 室15°41′ 壁13°06′ 奎11°39′ 娄13°00′
 *     胃12°15′ 昴9°15′ 毕13°58′ 参1°21′ 觜11°33′ 井30°25′ 鬼4°36′ 柳17°00′ 星8°23′
 *     张18°04′ 翼17°00′ 轸13°03′ 角10°37′ 亢10°38′ 氐17°50′ 房4°50′ 心7°33′ 尾15°56′ 箕9°00′。
 *  2. 由本表推算「十二次初度」再与《清史稿》同卷「康熙甲子年黄道十二次初度值宿」逐条对照，
 *     十二条中十条完全吻合（差 0.000°）、两条差 0.07°／0.17°：
 *       星纪＝箕三度一十分→270.000°，元枵＝牵牛初度二十三分→300.000°，娵訾＝危一度→330.000°，
 *       大梁＝娄初度二十七分→30.000°，实沈＝昴五度一十二分→60.000°，鹑首＝觜觿一十度三十八分
 *       →90.000°，鹑火＝东井二十九度零五分→120.000°，鹑尾＝七星七度零四分→150.000°，
 *       寿星＝翼一十度三十七分→180.000°，大火＝角一十度三十四分→210.000°，
 *       降娄＝营室一十度五十七分→0.067°（应 0°），析木＝房一度三十九分→240.167°（应 240°）。
 *     此即历元＝1684、初宫起冬至（270°）之直接证据。
 *  3. 角宿距星＝角宿一（Spica）在 1684 的回归黄经应为 199.4333°，实际恒星位置折算得
 *     199.4304°，差 0.003°（即原表度分取整量级）。
 *
 * 觜／参次序：本表（崇祯历书／时宪旧测）作「参前觜后」——参宿距星在觜宿之西，
 * 故参仅 1°21′、觜 11°33′。上述《清史稿》康熙甲子表「鹑首＝觜觿一十度三十八分」
 * 正是按此口径（90° 落于觜宿内），两表互相印证。
 * 而元明《大统历》与乾隆十九年（1754）以后的官方值宿改为「觜前参后」（通行整数宿度表
 * 「毕15 觜1 参11」即后一口径）。本仓取有精确度分的一手表，故宿名在参／觜一带沿用
 * 1684 旧测口径；需要后一口径时，把两宿起点互换即可（差约 1.35°）。
 * 参见《清史稿·时宪志一》：康熙四年议政王等言「汤若望将觜、参二宿改易前后」；
 * 乾隆十九年十二月「请以乾隆十九年为始，《时宪书》之值宿，改觜前参后」。
 */
const MANSION_TABLE_QING: Array<[string, number, number, number]> = [
  // [宿名, 宫(0=星纪/冬至起), 度, 分]，按原表自斗起、黄经东行排列
  ["斗", 0, 5, 50], ["牛", 0, 29, 37], ["女", 1, 7, 23], ["虚", 1, 19, 1], ["危", 1, 29, 0],
  ["室", 2, 19, 7], ["壁", 3, 4, 48], ["奎", 3, 17, 54], ["娄", 3, 29, 33], ["胃", 4, 12, 33],
  ["昴", 4, 24, 48], ["毕", 5, 4, 3], ["参", 5, 18, 1], ["觜", 5, 19, 22], ["井", 6, 0, 55],
  ["鬼", 7, 1, 20], ["柳", 7, 5, 56], ["星", 7, 22, 56], ["张", 8, 1, 19], ["翼", 8, 19, 23],
  ["轸", 9, 6, 23], ["角", 9, 19, 26], ["亢", 10, 0, 3], ["氐", 10, 10, 41], ["房", 10, 28, 31],
  ["心", 11, 3, 21], ["尾", 11, 10, 54], ["箕", 11, 26, 50],
];

/** 历元：康熙二十三年甲子（1684-01-01.0 UT）。 */
const MANSION_EPOCH_JD = 2336128.5;
/** 「初宫 0°」＝星纪初＝冬至点＝回归黄经 270°。 */
const MANSION_EPOCH_ORIGIN = 270;

/** 二十八宿起点（即各宿距星）在 1684 历元的回归黄经，按黄经升序；古典宿界即距星。 */
const MANSION_STARTS_1684: Array<{ name: string; longitude: number }> = MANSION_TABLE_QING
  .map(([name, gong, du, fen]) => ({ name, longitude: wrap(MANSION_EPOCH_ORIGIN + gong * 30 + du + fen / 60) }))
  .sort((a, b) => a.longitude - b.longitude);

/**
 * 回归黄经 → 二十八宿。
 *
 * 二十八宿为**恒星锚定**：宿界即距星，随岁差东行，故不能直接用当日黄经查固定表。
 * 做法（「回归黄经 − 岁差 = 恒星黄经」）：用本仓 Lahiri 岁差多项式
 * （`src/lib/vedic/ayanamsa.ts`，与吠陀盘同一套）把当日回归黄经折回 1684 历元，
 * 再在固定的宿界表中定位。
 *
 * 与《钤》原文自带的岁差率 51″/年相比，本仓多项式在 1684–2100 之间累计相差 < 0.1°
 * （原文为清代概数，本仓多项式为 IAU 2006 总岁差，故取后者）。
 *
 * @param tropicalLongitude 当日回归黄经（度，celestine 口径）
 * @param utcMillis 出生（或所求）时刻的 UTC 毫秒；决定岁差折回量
 */
export const longitudeToMansion = (tropicalLongitude: number, utcMillis: number) => {
  const jd = utcMillis / 86_400_000 + 2_440_587.5;
  const epochLongitude = wrap(tropicalLongitude - (ayanamsa(jd) - ayanamsa(MANSION_EPOCH_JD)));
  let index = MANSION_STARTS_1684.length - 1;
  for (let i = 0; i < MANSION_STARTS_1684.length; i += 1) {
    if (epochLongitude < MANSION_STARTS_1684[i].longitude) {
      index = i - 1;
      break;
    }
    index = i;
  }
  return MANSION_STARTS_1684[(index + MANSION_STARTS_1684.length) % MANSION_STARTS_1684.length].name;
};

const dignityOf = (name: string, branch: string) => {
  const table = DIGNITY[name];
  if (!table) return "—";
  if (table.temple === branch) return "庙";
  if (table.prosperous === branch) return "旺";
  if (table.fallen === branch) return "陷";
  return "平";
};

/**
 * 命宫（果老式）：「以生时加于太阳所躔之宫，顺数至卯，即命宫也。」
 * 即将生时置于太阳宫，按地支顺序前推，卯所落之宫为命宫。
 * 参数均为地支下标（子=0…亥=11）：太阳宫 `sunPalace`、生时 `hourBranch`。
 *
 * 历史说明：上游脚本此处误用了紫微斗数的「寅起正月顺数至生月、再逆数至生时」
 * （且月取公历月），不是七政四余的命宫口径；本仓已改为果老式。
 */
export const mingPalaceIndex = (sunPalace: number, hourBranch: number) => ((sunPalace - hourBranch + 3) % 12 + 12) % 12;

/** 生时（小时）→ 地支下标。23:00–00:59 为子时。 */
export const hourToBranchIndex = (hour: number) => Math.floor(((hour + 1) % 24) / 2);

/** 以出生时刻推算四余黄经：罗计＝黄白平交点（果老旧法 罗睺=降交点），月孛＝平月远地点。 */
const fourRemainders = (utcMillis: number, moonLongitude: number) => {
  const jd = utcMillis / 86_400_000 + 2_440_587.5;
  const t = (jd - 2_451_545) / 36_525;
  // Meeus 47.7 月球平根：平黄白升交点 Ω、平近地点（月球近地点平黄经）
  const ascendingNode = 125.0445479 - 1934.1362891 * t + 0.0020754 * t * t + (t * t * t) / 467_441;
  const perigee = 83.3532465 + 4069.0137287 * t - 0.01032 * t * t - (t * t * t) / 80_053;
  return [
    { name: "罗睺", longitude: wrap(ascendingNode + 180), note: "果老旧法：罗睺=降交点（汤若望新法以罗睺为升交点，本仓未取）" },
    { name: "计都", longitude: wrap(ascendingNode), note: "果老旧法：计都=升交点" },
    // 《图书编》卷二十一「孛生于月……月之行迟速有常度，迟之处即孛也」「六十二日行七度，六十二年而七周天」；
    // 《清史稿·时宪志一》「月孛乃月行极高之点」。均指月球远地点，与 Meeus 平近地点 +180° 同义。
    // 校验：4069.0137287°／世纪 ≈ 40.7°／年 ≈ 7°／62.8 日，与「六十二日行七度」相符（周期 3232.6 日 ≈ 8.85 年）。
    { name: "月孛", longitude: wrap(perigee + 180), note: "月远地点（Meeus 47.7 平根；即果老「月行最迟之处」）" },
    // 紫气：古典仅载「二十八年十闰而气行一周天」「其行均平无迟疾，气、孛以顺行」，
    // 但《果老星宗》另一传本作「二十九日一度、二十九年周天」，且诸本皆不载历元位置，
    // 故无法唯一确定经度。清《时宪志》亦判「至紫气一余，无数可定」并删之。
    // 本仓不自造历元，保留上游 MIT 脚本约定值并明确降级为非古典虚星（UI／载荷／免责声明一致标注）。
    { name: "紫气", longitude: wrap(moonLongitude - 90), note: "上游脚本约定虚星（月黄经−90°），非古典紫气：古籍只载约廿八年一周天、顺行而无历元，故未实装" },
  ];
};

export const buildQizhengChart = (profile: NormalizedProfileInput): QizhengChart => {
  const astro = buildAstroChart(profile);
  const [date, time] = profile.normalized.datetime.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes(profile.normalized.datetime, profile.normalized.timeZone) * 60_000;

  const longitudeOf = (planet: string) => astro.points.find((point) => point.name === planet && point.longitude !== null)?.longitude ?? null;
  const stars: QizhengStar[] = [];
  // 果老式命宫：由「太阳所躔之宫」起生时顺数至卯。太阳黄经由真星历给出，必存在；
  // 万一缺失（理论上不会），退回白羊 0°（戌宫）以免整体偏移。
  const sunLongitude = longitudeOf("太阳");
  const sunPalace = sunLongitude === null ? 10 : longitudeToPalace(sunLongitude);
  const mingIndex = mingPalaceIndex(sunPalace, hourToBranchIndex(hour));
  const palaceNameOf = (palace: number) => TWELVE_PALACES[((palace - mingIndex) % 12 + 12) % 12] as string;

  for (const { name, planet } of SEVEN_LUMINARIES) {
    const longitude = longitudeOf(planet);
    if (longitude === null) continue;
    const palace = longitudeToPalace(longitude);
    const branch = EARTHLY_BRANCHES[palace];
    stars.push({
      name,
      kind: "七政",
      longitude: Number(longitude.toFixed(2)),
      palace,
      branch,
      palaceName: palaceNameOf(palace),
      mansion: longitudeToMansion(longitude, utcMillis),
      dignity: dignityOf(name, branch),
      element: ELEMENT[name] ?? "无",
      fortune: FORTUNE[name] ?? "无",
    });
  }

  const moonLongitude = longitudeOf("月亮") ?? 0;
  for (const remnant of fourRemainders(utcMillis, moonLongitude)) {
    const palace = longitudeToPalace(remnant.longitude);
    const branch = EARTHLY_BRANCHES[palace];
    stars.push({
      name: remnant.name,
      kind: "四余",
      longitude: Number(remnant.longitude.toFixed(2)),
      palace,
      branch,
      palaceName: palaceNameOf(palace),
      mansion: longitudeToMansion(remnant.longitude, utcMillis),
      dignity: "—",
      element: ELEMENT[remnant.name] ?? "无",
      fortune: FORTUNE[remnant.name] ?? "无",
      note: remnant.note,
    });
  }

  const palaces = TWELVE_PALACES.map((name, offset) => {
    const index = (mingIndex + offset) % 12;
    return { name, index, branch: EARTHLY_BRANCHES[index] as string };
  });

  return {
    format: "qmdj-qizheng-chart-v1",
    input: { datetime: profile.normalized.datetime, timeZone: profile.normalized.timeZone },
    mingPalace: { index: mingIndex, branch: EARTHLY_BRANCHES[mingIndex] as string },
    palaces,
    stars,
    complete: stars.length > 0,
    disclaimer:
      "研究性七政四余：七政黄经用本仓真星历（celestine）。十二宫按古典十二次配宫（白羊=戌、金牛=酉、双子=申…，已修正上游脚本白羊=寅的错位）。命宫用果老式「以生时加太阳所躔之宫，顺数至卯」（非紫微斗数的生月/生时口径）。罗睺/计都取黄白平交点（果老旧法，罗睺=降交点），月孛取月远地点（Meeus 47.7 平根，即果老「月行最迟之处」，与《图书编》「六十二年而七周天」相符）。二十八宿用清代黄道宿度（《二十八宿黄道经纬度钤》，历元康熙二十三年甲子=1684，初宫起冬至，宿界即距星），按本仓 Lahiri 岁差折回该历元后定位，非等分；宿名在参/觜一带沿用该旧测的「参前觜后」口径（与乾隆十九年后「觜前参后」相差约 1.35°）。紫气为上游脚本约定的虚星（月黄经−90°），**并非古典长周期虚星**：古籍仅载约廿八年一周天、顺行而无历元，清《时宪志》且判其「无数可定」，故未实装，仅供对照。不作现实预测或吉凶裁决。",
  };
};
