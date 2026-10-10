/**
 * 紫微斗数「飞星（飞化）· 自化 · 河洛化象」基础表。
 *
 * 依据（公共领域与通行口诀，非本仓创制）：
 * - 十干四化口诀：「甲廉破武阳，乙机梁紫阴，丙同机昌廉，丁阴同机巨，戊贪阴右机，
 *   己武贪梁曲，庚阳武阴同，辛巨阳曲昌，壬梁紫左武，癸破巨阴贪。」（飞星派必背表）
 * - 飞化：以「宫位天干」与「星曜」的对应产生禄权科忌，观察化星落入何宫，追踪跨宫
 *   的因果与流向（飞星/飞宫体系）；自化则指本宫天干使本宫星曜自身起化（离心为耗散，
 *   对宫宫干飞入本宫为向心化入）。
 * - 来因宫：生年天干所在的六内宫，为「先天力量来处」。
 * - 河洛派：河图 1–10 为天地生成数、洛书 1–9 为天地变化数；文献以「气形质数象」模拟
 *   其关系。本仓据此把十二宫的洛书数与九星象名列出，属对照呈现。
 * - 「天乙飞星」一名未见统一文献术语：本仓按字面组合呈现——以年干取「天乙贵人」之支
 *   定位贵人宫，再由该宫宫干起飞化，并在界面明确标注此为组合呈现而非既有成词技法。
 */

/** 十干四化（禄、权、科、忌），与 iztro 默认配置一致。 */
export const STEM_MUTAGENS: Record<string, [string, string, string, string]> = {
  甲: ["廉贞", "破军", "武曲", "太阳"],
  乙: ["天机", "天梁", "紫微", "太阴"],
  丙: ["天同", "天机", "文昌", "廉贞"],
  丁: ["太阴", "天同", "天机", "巨门"],
  戊: ["贪狼", "太阴", "右弼", "天机"],
  己: ["武曲", "贪狼", "天梁", "文曲"],
  庚: ["太阳", "武曲", "太阴", "天同"],
  辛: ["巨门", "太阳", "文曲", "文昌"],
  壬: ["天梁", "紫微", "左辅", "武曲"],
  癸: ["破军", "巨门", "太阴", "贪狼"],
};

export const MUTAGEN_NAMES = ["禄", "权", "科", "忌"] as const;

/** 天乙贵人（以年干取）：甲戊庚牛羊、乙己鼠猴乡、丙丁猪鸡位、壬癸兔蛇藏、六辛逢马虎。 */
export const TIAN_YI: Record<string, [string, string]> = {
  甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"],
  乙: ["子", "申"], 己: ["子", "申"],
  丙: ["亥", "酉"], 丁: ["亥", "酉"],
  壬: ["卯", "巳"], 癸: ["卯", "巳"],
  辛: ["午", "寅"],
};

/** 洛书数与九星象名（依后天八卦 / 玄空九星）。 */
export const LUO_SHU: Record<string, { number: number; trigram: string; nineStar: string; element: string }> = {
  子: { number: 1, trigram: "坎", nineStar: "一白", element: "水" },
  丑: { number: 8, trigram: "艮", nineStar: "八白", element: "土" },
  寅: { number: 8, trigram: "艮", nineStar: "八白", element: "土" },
  卯: { number: 3, trigram: "震", nineStar: "三碧", element: "木" },
  辰: { number: 4, trigram: "巽", nineStar: "四绿", element: "木" },
  巳: { number: 4, trigram: "巽", nineStar: "四绿", element: "木" },
  午: { number: 9, trigram: "离", nineStar: "九紫", element: "火" },
  未: { number: 2, trigram: "坤", nineStar: "二黑", element: "土" },
  申: { number: 2, trigram: "坤", nineStar: "二黑", element: "土" },
  酉: { number: 7, trigram: "兑", nineStar: "七赤", element: "金" },
  戌: { number: 6, trigram: "乾", nineStar: "六白", element: "金" },
  亥: { number: 6, trigram: "乾", nineStar: "六白", element: "金" },
};

/** 河图生成数（天一生水地六成之…）。 */
export const HE_TU: Record<string, { pair: [number, number]; element: string; direction: string }> = {
  坎: { pair: [1, 6], element: "水", direction: "北" },
  离: { pair: [2, 7], element: "火", direction: "南" },
  震: { pair: [3, 8], element: "木", direction: "东" },
  巽: { pair: [3, 8], element: "木", direction: "东南" },
  兑: { pair: [4, 9], element: "金", direction: "西" },
  乾: { pair: [4, 9], element: "金", direction: "西北" },
  坤: { pair: [5, 10], element: "土", direction: "西南" },
  艮: { pair: [5, 10], element: "土", direction: "东北" },
};

/** 六内宫（生年天干落此者为来因宫）。 */
export const INNER_PALACES = ["命宫", "财帛", "疾厄", "官禄", "田宅", "福德"];

/** 技法条目（供界面与载荷说明）。 */
export const TECHNIQUES: Array<{ name: string; rule: string; note: string }> = [
  { name: "飞化（飞星）", rule: "以某宫宫干起四化，化星落入之宫即为「飞入」。", note: "五行归宫，追踪能量流向与因果，而非看星曜静态组合。" },
  { name: "自化", rule: "宫干所化之星恰在本宫，分离心（向外出）与向心（对宫宫干化入本宫）。", note: "离心主耗散自消；向心主外来引动。" },
  { name: "来因宫", rule: "生年天干所在的六内宫，为先天力量来处。", note: "一生主要力量与因果的起点。" },
  { name: "天乙贵人宫", rule: "以年干取天乙贵人之支，定位所在宫。", note: "本仓据年干口诀取贵人支（甲戊庚丑未、乙己子申、丙丁亥酉、壬癸卯巳、辛午寅）。" },
  { name: "禄转忌", rule: "以「生年四化之禄」或「自化禄」的落宫起，用该宫宫干再飞化忌，所得之宫为转忌处。", note: "北派技法：禄因之后见忌果。本仓并列「生年禄」与「自化禄」两条链。" },
  { name: "忌转忌", rule: "以「生年四化之忌」或「自化忌」的落宫起，用该宫宫干再飞化忌。", note: "北派技法：忌上加忌，追其叠加。本仓并列「生年忌」与「自化忌」两条链。" },
  { name: "河洛化象", rule: "以宫支定洛书数与九星象（一白…九紫），并与该宫飞化并置。", note: "河图 1–10 为生成数、洛书 1–9 为变化数；本仓仅作对照呈现，不另立判词。" },
];
