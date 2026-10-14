/**
 * 五运六气推演内核（运气学说）。
 *
 * 全部规则都来自运气学说的明文条款（逐字原文与出处登记在
 * `src/lib/provenance/registry.ts` 的 `bazi-tcm` 条目里，面板内可直接查阅）。
 * 注意几处**出处层次**（资料核查确认）：
 *
 * - 十干化运：《素问·天元纪大论》「甲己之岁，土运统之…」与《素问·五运行大论》
 *   「土主甲己，金主乙庚，水主丙辛，木主丁壬，火主戊癸」；
 * - 太过/不及判据（阳干太过、阴干不及）：**《素问》正文没有这一直接表述**，
 *   明文最早见宋·刘温舒《素问入式运气论奥·论五音建运》「在阳年则曰太，在阴年曰少」，
 *   清《医宗金鉴·运气要诀·五运平气太过不及歌》注亦同；
 * - 十二支化六气（司天）：《素问·五运行大论》「子午之上，少阴主之…巳亥之上，厥阴主之」；
 *   在泉与司天相对（相隔三气，《素问·六元正纪大论》「岁半之前，天气主之，岁半之后，地气主之」）；
 * - 五运纪名：《素问·五常政大论》太过为 发生/赫曦/敦阜/坚成/流衍，不及为 委和/伏明/卑监/从革/涸流，
 *   平气为 敷和/升明/备化/审平/静顺；
 * - 主气六步顺序：《素问·六微旨大论》给出六步之“位”（显明之右，君火之位也…）与刻数，
 *   但**未给「初之气＝厥阴风木」这一带六气专名的表述**；该命名见宋《素问入式运气论奥·论主气》
 *   与清《医宗金鉴·运气要诀·主气歌》；
 * - 客气六步：以司天为三之气（《素问·六元正纪大论》「三之气，天政布」六见），按三阴三阳次序布；
 * - 客主加临：《素问·五运行大论》「气相得则和，不相得则病」、《素问·至真要大论》「主胜逆，客胜从」；
 * - 运气同化：《素问·六微旨大论》岁会（「木运临卯…水运临子，所谓岁会」）、天符（「土运之岁，
 *   上见太阴…」）、太一天符（「天符岁会何如？歧伯曰：太一天符之会也」），经文用字为
 *   「岁**位**」「太一天符」，本模块沿用经文的「太一天符」叫法并标注（岁会＝岁位）。
 *
 * 本模块只做"照条款推演"，不产出任何气候吉凶或疾病断语——那是产品边界之外的事。
 *
 * 已知异说（面板与资料库里都标注）：
 * - 交气日：运气有「大寒交初气」（宋·刘温舒明文）与「立春」（《素问·六节藏象论》「皆归始春」）
 *   以及「正月朔日」（《素问·六元正纪大论》）三派；本模块按**干支纪年**取年，步序不落节令；
 * - 客主加临的"相得"判据各家不一（尤其君火与相火是否算同气）：本模块按"同气或相生为相得、
 *   相克为不相得，且主胜逆／客胜从"这一通行口径实现；
 * - 同天符／同岁会（中运与在泉同气）定义分歧较大，本模块**不输出**。
 */

export const TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

export type TianGan = (typeof TIAN_GAN)[number];
export type DiZhi = (typeof DI_ZHI)[number];
export type WuXing = "木" | "火" | "土" | "金" | "水";
export type QiName = "厥阴风木" | "少阴君火" | "太阴湿土" | "少阳相火" | "阳明燥金" | "太阳寒水";
export type YunStrength = "太过" | "不及";

/** 十干化五运（《天元纪大论》《五运行大论》）。 */
export const YUN_BY_GAN: Record<TianGan, WuXing> = {
  甲: "土", 己: "土",
  乙: "金", 庚: "金",
  丙: "水", 辛: "水",
  丁: "木", 壬: "木",
  戊: "火", 癸: "火",
};

/** 阳干（太过）／阴干（不及）。 */
export const YANG_GAN: ReadonlySet<string> = new Set(["甲", "丙", "戊", "庚", "壬"]);

/** 六气（三阴三阳）之次序：厥阴一阴、少阴二阴、太阴三阴、少阳一阳、阳明二阳、太阳三阳。 */
export const LIU_QI_ORDER: readonly QiName[] = ["厥阴风木", "少阴君火", "太阴湿土", "少阳相火", "阳明燥金", "太阳寒水"];

/** 六气与五行/六淫的对应（六气本名已含五行，六淫用于展示）。 */
export const QI_YIN: Record<QiName, string> = {
  厥阴风木: "风",
  少阴君火: "热",
  太阴湿土: "湿",
  少阳相火: "火",
  阳明燥金: "燥",
  太阳寒水: "寒",
};

/** 十二支化六气：司天之气（《五运行大论》）。 */
export const SI_TIAN_BY_ZHI: Record<DiZhi, QiName> = {
  子: "少阴君火", 午: "少阴君火",
  丑: "太阴湿土", 未: "太阴湿土",
  寅: "少阳相火", 申: "少阳相火",
  卯: "阳明燥金", 酉: "阳明燥金",
  辰: "太阳寒水", 戌: "太阳寒水",
  巳: "厥阴风木", 亥: "厥阴风木",
};

/** 主气六步（《六微旨大论》），年年不变。 */
export const ZHU_QI_STEPS: readonly QiName[] = ["厥阴风木", "少阴君火", "少阳相火", "太阴湿土", "阳明燥金", "太阳寒水"];

export const STEP_NAMES = ["初之气", "二之气", "三之气", "四之气", "五之气", "终之气"] as const;

/** 五运纪名（《五常政大论》）。 */
export const YUN_JI_NAME: Record<YunStrength, Record<WuXing, string>> = {
  太过: { 木: "发生", 火: "赫曦", 土: "敦阜", 金: "坚成", 水: "流衍" },
  不及: { 木: "委和", 火: "伏明", 土: "卑监", 金: "从革", 水: "涸流" },
};

/** 平气之名（《五常政大论》）。 */
export const PING_QI_NAME: Record<WuXing, string> = { 木: "敷和", 火: "升明", 土: "备化", 金: "审平", 水: "静顺" };

/** 岁会：中运临岁支之正位（《六微旨大论》「木运临卯，火运临午，土运临四季，金运临酉，水运临子」）。 */
const SUI_HUI_ZHI: Record<WuXing, readonly DiZhi[]> = {
  木: ["卯"],
  火: ["午"],
  土: ["辰", "戌", "丑", "未"],
  金: ["酉"],
  水: ["子"],
};

/** 六气的五行（用于运气同化与对照，取自六气本名）。 */
export const QI_WU_XING: Record<QiName, WuXing> = {
  厥阴风木: "木",
  少阴君火: "火",
  太阴湿土: "土",
  少阳相火: "火",
  阳明燥金: "金",
  太阳寒水: "水",
};

export type QiStep = {
  step: number;
  name: (typeof STEP_NAMES)[number];
  zhuQi: QiName;
  keQi: QiName;
  /** 客主同气（同气则相得）。 */
  sameQi: boolean;
  /** 客主相生（相得）。 */
  generating: boolean;
  /** 客主相克（不相得）。 */
  overcoming: boolean;
  /** 「主胜逆，客胜从」（《至真要大论》）——按五行相克判谁胜。 */
  verdict: "相得" | "不相得（主胜逆）" | "不相得（客胜从）";
};

const WU_XING_SHENG: Record<WuXing, WuXing> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const WU_XING_KE: Record<WuXing, WuXing> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

const relationOf = (zhuQi: QiName, keQi: QiName): Pick<QiStep, "sameQi" | "generating" | "overcoming" | "verdict"> => {
  const zhu = QI_WU_XING[zhuQi];
  const ke = QI_WU_XING[keQi];
  const sameQi = zhu === ke;
  if (sameQi) return { sameQi, generating: false, overcoming: false, verdict: "相得" };
  const generating = WU_XING_SHENG[zhu] === ke || WU_XING_SHENG[ke] === zhu;
  if (generating) return { sameQi, generating, overcoming: false, verdict: "相得" };
  // 相克：客克主为「客胜从」，主克客为「主胜逆」。
  const keWins = WU_XING_KE[ke] === zhu;
  return { sameQi, generating: false, overcoming: true, verdict: keWins ? "不相得（客胜从）" : "不相得（主胜逆）" };
};

export type YunQiAnalysis = {
  year: number;
  ganzhi: string;
  gan: TianGan;
  zhi: DiZhi;
  /** 岁运（中运）。 */
  yun: {
    element: WuXing;
    strength: YunStrength;
    jiName: string;
    pingQiName: string;
    /** 与司天同气 → 天符；与岁支正位 → 岁会；两者兼 → 太乙天符（《六微旨大论》）。 */
    tianFu: boolean;
    suiHui: boolean;
    taiYiTianFu: boolean;
  };
  /** 司天／在泉（客气之三之气与终之气）。 */
  siTian: QiName;
  zaiQuan: QiName;
  /** 客气六步：以司天为三之气，按三阴三阳次序前推。 */
  keQiSteps: readonly QiName[];
  /** 六步客主加临。 */
  steps: readonly QiStep[];
};

/** 干支纪年：以 1984 甲子为基准（与八字年柱同一套干支序）。 */
export const ganzhiOfYear = (year: number): { ganzhi: string; gan: TianGan; zhi: DiZhi } => {
  const offset = ((year - 4) % 60 + 60) % 60;
  const gan = TIAN_GAN[offset % 10];
  const zhi = DI_ZHI[offset % 12];
  return { ganzhi: `${gan}${zhi}`, gan, zhi };
};

/**
 * 推演某干支年的五运六气。
 *
 * 注意：这里的 `year` 是**干支纪年**（即八字年柱所属之年，立春交年）。调用方应传入
 * 已经按立春定年的年份；运气学派的"交气日"另有以大寒起算的说法（异说，见资料库备注）。
 */
export const analyzeYunQi = (year: number): YunQiAnalysis => {
  const { ganzhi, gan, zhi } = ganzhiOfYear(year);
  const element = YUN_BY_GAN[gan];
  const strength: YunStrength = YANG_GAN.has(gan) ? "太过" : "不及";
  const siTian = SI_TIAN_BY_ZHI[zhi];
  const siTianIndex = LIU_QI_ORDER.indexOf(siTian);
  const zaiQuan = LIU_QI_ORDER[(siTianIndex + 3) % 6];

  // 客气六步：三之气为司天，其余按三阴三阳次序顺推（初之气 = 司天前二位）。
  const keQiSteps = Array.from({ length: 6 }, (_, index) => {
    // step 1（初之气）在司天前两位，step 3 即司天本身（《六元正纪大论》客气六步）。
    const position = (siTianIndex - 2 + index + 6) % 6;
    return LIU_QI_ORDER[position];
  });

  const steps: QiStep[] = keQiSteps.map((keQi, index) => ({
    step: index + 1,
    name: STEP_NAMES[index],
    zhuQi: ZHU_QI_STEPS[index],
    keQi,
    ...relationOf(ZHU_QI_STEPS[index], keQi),
  }));

  const tianFu = QI_WU_XING[siTian] === element;
  const suiHui = SUI_HUI_ZHI[element].includes(zhi);

  return {
    year,
    ganzhi,
    gan,
    zhi,
    yun: {
      element,
      strength,
      jiName: YUN_JI_NAME[strength][element],
      pingQiName: PING_QI_NAME[element],
      tianFu,
      suiHui,
      taiYiTianFu: tianFu && suiHui,
    },
    siTian,
    zaiQuan,
    keQiSteps,
    steps,
  };
};
