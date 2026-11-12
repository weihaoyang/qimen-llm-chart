/**
 * 奇门格局的正面判定。
 *
 * `3meta` 只返回**已成立**的吉格/凶格；盘面上没有的格局它不会说。这里登记一批
 * 经典格局，逐个在九宫里判「成立 / 未成立」，并给出一句侧边提示。判定以逐项核对的规则为准，已核修订同步应用到引擎汇总。
 * 它仍**不是**穷举所有传统格局：未登记的格局不能据此推断不存在。
 */
import type { Position } from "3meta";
import type { NormalizedQimenChart } from "./types";

const valuesOf = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item !== "无");
  }
  return typeof value === "string" && value !== "无" ? [value] : [];
};

type Palace = NormalizedQimenChart["raw"]["palaces"][number];

const SAN_MEN = ["开门", "休门", "生门"] as const;
const SAN_QI = ["乙", "丙", "丁"] as const;
const DING_JI_GUI = ["丁", "己", "癸"] as const;
const SI_SHEN = ["太阴", "六合", "九地", "九天"] as const;

const GATE_FIVE_ELEMENTS: Record<string, string> = {
  休门: "水",
  生门: "土",
  伤门: "木",
  杜门: "木",
  景门: "火",
  死门: "土",
  惊门: "金",
  开门: "金",
};
const GENERATE: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const TOMB_MAP: Record<string, string[]> = {
  甲: [],
  乙: ["未", "戌"],
  丙: ["戌"],
  戊: ["戌"],
  癸: ["未"],
  丁: ["丑"],
  己: ["丑"],
  庚: ["丑"],
  辛: ["辰"],
  壬: ["辰"],
};

// 甲柱依自身六甲的遁仪定位，日、月、年不可用时柱旬首代替。
const JIA_HIDDEN_STEM: Record<string, string> = { 子: "戊", 戌: "己", 申: "庚", 午: "辛", 辰: "壬", 寅: "癸" };
const pillarStemOnBoard = (pillar: { stem: string; branch: string }): string | undefined =>
  pillar.stem === "甲" ? JIA_HIDDEN_STEM[pillar.branch] : pillar.stem;
const dayStemOnBoard = (chart: NormalizedQimenChart): string | undefined =>
  pillarStemOnBoard(chart.raw.fourPillars.day);
const pillarEvidence = (palace: Palace, pillar: { stem: string; branch: string }, label: string) =>
  `${pairEvidence(palace)}${pillar.stem === "甲" ? `（${pillar.stem}${pillar.branch}${label}遁${pillarStemOnBoard(pillar)}）` : ""}`;
const dayStemEvidence = (chart: NormalizedQimenChart, palace: Palace) => {
  const day = chart.raw.fourPillars.day;
  return `${pairEvidence(palace)}${day.stem === "甲" ? `（${day.stem}${day.branch}日遁${dayStemOnBoard(chart)}）` : ""}`;
};

// 伏吟 / 反吟：`3meta` 只在类型里声明了 `FuYinFanYinDetail`，运行时从不填充，
// 所以这里按「星/门归本位」与「星/门临对冲宫」自行判定（与盘面结构等价）。
const STAR_NATIVE: Record<string, number> = { 天蓬: 1, 天芮: 2, 天冲: 3, 天辅: 4, 天禽: 5, 天心: 6, 天柱: 7, 天任: 8, 天英: 9 };
const GATE_NATIVE: Record<string, number> = { 休门: 1, 生门: 8, 伤门: 3, 杜门: 4, 景门: 9, 死门: 2, 惊门: 7, 开门: 6 };
const OPPOSITE: Record<number, number> = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4, 5: 5 };
// 当前转盘天禽随天芮寄坤；仅用于外八宫值符星位置比较，不改天禽中五原位。
const chiefStarNative = (star: string) => star === "天禽" ? 2 : STAR_NATIVE[star];
const placedStars = (chart: NormalizedQimenChart) =>
  chart.raw.palaces
    .filter((palace) => palace.position !== 5)
    .map((palace) => ({ palace, native: STAR_NATIVE[valuesOf(palace.star).find((star) => star !== "天禽") ?? ""] }))
    .filter((entry) => typeof entry.native === "number");
const placedGates = (chart: NormalizedQimenChart) =>
  chart.raw.palaces
    .map((palace) => ({ palace, native: GATE_NATIVE[palace.gate as string] }))
    .filter((entry) => typeof entry.native === "number");

// 旺衰权重：把 `palace.status`（门/星 的 旺相休囚废死）折算成分数，用于给
// 「成立」的格局再分「有力 / 中平 / 无力」。中宫无门，按 0 计。
const STATUS_SCORE: Record<string, number> = { 旺: 3, 相: 2, 休: 1, 囚: 0, 死: -1, 废: -1 };
const statusScore = (value: string | undefined) => (value ? STATUS_SCORE[value] ?? 0 : 0);
const palaceScore = (palace: Palace) => statusScore(palace.status?.gate) + statusScore(palace.status?.star);
const gradeFromScore = (score: number): QimenPatternStrength => (score >= 4 ? "有力" : score >= 1 ? "中平" : "无力");
const statusText = (value: string | undefined) => (value && value !== "无" ? value : "—");

const hasHeaven = (palace: Palace, ...stems: string[]) =>
  valuesOf(palace.heavenlyStem).some((stem) => stems.includes(stem));
const hasEarth = (palace: Palace, ...stems: string[]) =>
  valuesOf(palace.earthlyStem).some((stem) => stems.includes(stem));
export const matchesPillarGengGe = (palace: Palace, pillar: { stem: string; branch: string }) => {
  const stem = pillarStemOnBoard(pillar);
  return Boolean(stem && hasHeaven(palace, "庚") && hasEarth(palace, stem));
};
export const matchesPillarFeiGan = (palace: Palace, pillar: { stem: string; branch: string }) => {
  const stem = pillarStemOnBoard(pillar);
  return Boolean(stem && hasHeaven(palace, stem) && hasEarth(palace, "庚"));
};
export const beiGeReasons = (palace: Palace, chiefStem: string, chiefPosition: number, pillars: NormalizedQimenChart["raw"]["fourPillars"]): string[] => {
  const reasons: string[] = [];
  if (hasHeaven(palace, "丙")) {
    if (hasEarth(palace, chiefStem)) reasons.push("天丙加地盘值符遁仪（符悖）");
    for (const [key, label] of [["year", "年"], ["month", "月"], ["day", "日"], ["hour", "时"]] as const) {
      const pillar = pillars[key];
      const stem = pillarStemOnBoard(pillar);
      if (stem && hasEarth(palace, stem)) reasons.push(`天丙加地盘${label}干${pillar.stem === "甲" ? `（${pillar.stem}${pillar.branch}遁${stem}）` : ""}`);
    }
  }
  if (palace.position === chiefPosition && hasEarth(palace, "丙")) reasons.push("天盘值符加地丙（飞悖）");
  return reasons;
};
export const sanQiRestrictionReasons = (palace: Palace): string[] => {
  const reasons: string[] = [];
  for (const stem of ["丙", "丁"]) {
    if (!hasHeaven(palace, stem)) continue;
    if (palace.position === 1) reasons.push(`${stem}临坎`);
    for (const earth of ["壬", "癸"]) if (hasEarth(palace, earth)) reasons.push(`${stem}加${earth}`);
  }
  if (hasHeaven(palace, "乙")) {
    if (palace.position === 6 || palace.position === 7) reasons.push(`乙临${palace.position}宫`);
    for (const earth of ["庚", "辛"]) if (hasEarth(palace, earth)) reasons.push(`乙加${earth}`);
  }
  return reasons;
};
export const sanQiTombStems = (palace: Palace): string[] => [
  ...(hasHeaven(palace, "乙") && (palace.position === 6 || palace.position === 2) ? ["乙"] : []),
  ...(hasHeaven(palace, "丙") && palace.position === 6 ? ["丙"] : []),
  ...(hasHeaven(palace, "丁") && palace.position === 8 ? ["丁"] : []),
];
export const tianWangReasons = (palace: Palace, zhiFuPosition: number): string[] => [
  ...(hasHeaven(palace, "癸") && hasEarth(palace, "癸") ? ["癸加癸（演义举例）"] : []),
  ...(palace.position === zhiFuPosition && hasEarth(palace, "癸") ? ["值符加地癸（旨归）"] : []),
];
const gateIn = (palace: Palace, gates: readonly string[]) => gates.includes(palace.gate as string);
const deityIn = (palace: Palace, deities: readonly string[]) => deities.includes(palace.deity as string);
const palaceLabel = (position: Position) => `第 ${position} 宫`;
const stemsOf = (value: unknown) => valuesOf(value).join("/") || "无";

/** 《遁甲演义》丙生临九天，《元灵经》另列乙开得天心。 */
export const shenDunReasons = (palace: Palace): string[] => [
  ...(hasHeaven(palace, "丙") && gateIn(palace, ["生门"]) && deityIn(palace, ["九天"]) ? ["丙生临九天（遁甲演义）"] : []),
  ...(hasHeaven(palace, "乙") && gateIn(palace, ["开门"]) && palace.star === "天心" ? ["乙开得天心（元灵经）"] : []),
];

/** 坎宫宽式见《图书集成》704；临癸式见《奇门遁甲秘笈大全》。 */
export const longDunReasons = (palace: Palace): string[] => {
  if (!hasHeaven(palace, "乙")) return [];
  return [
    ...(palace.position === 1 && gateIn(palace, SAN_MEN) ? ["乙合三吉门临坎（艺术典704）"] : []),
    ...(palace.position === 1 && gateIn(palace, ["休门"]) ? ["乙休临坎（艺术典704一云）"] : []),
    ...(hasEarth(palace, "癸") && gateIn(palace, ["休门"]) ? ["乙休临地癸（奇门吉格）"] : []),
  ];
};
export const matchesLongDun = (palace: Palace) => longDunReasons(palace).length > 0;

/** 艺术典704：天心或天柱临离，另称金入火乡；不与庚加丙合并。 */
export const metalStarInFireReasons = (palace: Palace): string[] => palace.position === 9
  ? valuesOf(palace.star).filter(star => star === "天心" || star === "天柱").map(star => `${star}临离九宫`)
  : [];
/** 将704卷“天英景门到七六宫”明确按星、门分别临宫解读。 */
export const fireInMetalReasons = (palace: Palace): string[] => {
  if (palace.position !== 6 && palace.position !== 7) return [];
  return [
    ...(valuesOf(palace.star).includes("天英") ? ["天英临乾兑"] : []),
    ...(palace.gate === "景门" ? ["景门临乾兑"] : []),
  ];
};

/** 《奇门吉格》云遁主式与“一云”分开保留；《旨归》坤宫辛为主式的较窄版本。 */
export const yunDunReasons = (palace: Palace): string[] => {
  if (!hasHeaven(palace, "乙")) return [];
  return [
    ...(gateIn(palace, SAN_MEN) && hasEarth(palace, "辛") ? ["乙合三吉门临地辛"] : []),
    ...(gateIn(palace, ["开门"]) && palace.position === 2 ? ["乙开临坤（一云）"] : []),
  ];
};

/** 《奇门吉格》风遁主式与“开丙临巽”另式。 */
export const fengDunReasons = (palace: Palace): string[] => {
  if (palace.position !== 4) return [];
  return [
    ...(hasHeaven(palace, "乙") && gateIn(palace, SAN_MEN) ? ["乙合三吉门临巽"] : []),
    ...(hasHeaven(palace, "丙") && gateIn(palace, ["开门"]) ? ["丙开临巽（另式）"] : []),
  ];
};

/** 《奇门行军要略》同时列丙生临戊与临丁。 */
export const tianDunReasons = (palace: Palace): string[] => {
  if (!hasHeaven(palace, "丙")) return [];
  return [
    ...(hasEarth(palace, "丁") && gateIn(palace, ["生门"]) ? ["丙生临地丁"] : []),
    ...(hasEarth(palace, "戊") && gateIn(palace, ["生门"]) ? ["丙生临地戊（行军要略）"] : []),
    ...(hasEarth(palace, "丁") && gateIn(palace, ["开门", "休门"]) ? [`丙${palace.gate}临地丁（九遁变化法）`] : []),
  ];
};

/** 《图书集成》705卷丁休太阴，与707卷上丁中休下丙分别记证据。 */
export const renDunReasons = (palace: Palace): string[] => {
  if (!hasHeaven(palace, "丁") || !gateIn(palace, ["休门"])) return [];
  return [
    ...(deityIn(palace, ["太阴"]) ? ["天丁休门临太阴（艺术典705）"] : []),
    ...(hasEarth(palace, "丙") ? ["天丁休门临地丙（艺术典707）"] : []),
  ];
};

export const matchesHuDun = (palace: Palace) =>
  (palace.position === 8 && hasHeaven(palace, "乙") && hasEarth(palace, "辛") && gateIn(palace, ["休门"]))
  || (palace.position === 8 && hasHeaven(palace, "辛") && gateIn(palace, ["生门"]))
  || (hasHeaven(palace, "丙") && hasEarth(palace, "辛") && gateIn(palace, ["生门"]));

/** 同一《旨归》九遁歌与鬼遁正文另有两套条件；神盘仍采用本站现有九地。 */
export const guiDunReasons = (palace: Palace): string[] => {
  if (!deityIn(palace, ["九地"])) return [];
  return [
    ...(hasHeaven(palace, "丁") && gateIn(palace, ["生门"]) && palace.position === 8 ? ["丁生九地临艮（奇门吉格）"] : []),
    ...(hasHeaven(palace, "乙") && gateIn(palace, ["杜门"]) ? ["乙杜临九地（奇门吉格）"] : []),
    ...(hasHeaven(palace, "丁") && gateIn(palace, ["开门"]) ? ["丁开临九地（奇门吉格一云）"] : []),
    ...(hasHeaven(palace, "丁") && gateIn(palace, ["休门"]) ? ["丁休临九地（旨归九遁歌）"] : []),
    ...(palace.position === 8 && hasHeaven(palace, "辛") && hasEarth(palace, "丁") && gateIn(palace, ["休门", "生门", "杜门"]) ? ["辛加地丁合休生杜临艮九地（旨归正文）"] : []),
  ];
};
export const matchesGuiDun = (palace: Palace) => guiDunReasons(palace).length > 0;

// 五假中的干取天盘；人假取《奇门法窍》的六壬读法。
export const matchesDiJia = (palace: Palace) =>
  hasHeaven(palace, ...DING_JI_GUI) && gateIn(palace, ["杜门"]) && deityIn(palace, ["九地", "太阴", "六合"]);
export const matchesRenJia = (palace: Palace) =>
  hasHeaven(palace, "壬") && gateIn(palace, ["惊门"]) && deityIn(palace, ["九天"]);
export const matchesShenJia = (palace: Palace) =>
  hasHeaven(palace, ...DING_JI_GUI) && gateIn(palace, ["伤门"]) && deityIn(palace, ["九地"]);
export const matchesGuiJia = (palace: Palace) =>
  hasHeaven(palace, ...DING_JI_GUI) && gateIn(palace, ["死门"]) && deityIn(palace, ["九地"]);

export const matchesQiYouLuWei = (palace: Palace) => {
  const stem = ({ 3: "乙", 4: "丙", 9: "丁" } as Record<number, string>)[palace.position];
  return Boolean(stem && hasHeaven(palace, stem) && gateIn(palace, SAN_MEN));
};

export const matchesSanQiShengDian = (palace: Palace) => {
  const stem = ({ 3: "乙", 9: "丙", 7: "丁" } as Record<number, string>)[palace.position];
  return Boolean(stem && hasHeaven(palace, stem));
};

export const matchesSanZha = (palace: Palace, deity: string) =>
  gateIn(palace, SAN_MEN) && hasHeaven(palace, ...SAN_QI) && palace.deity === deity;

export const matchesSanQiDeShi = (palace: Palace) =>
  (hasHeaven(palace, "乙") && hasEarth(palace, "己", "辛")) ||
  (hasHeaven(palace, "丙") && hasEarth(palace, "戊", "庚")) ||
  (hasHeaven(palace, "丁") && hasEarth(palace, "壬", "癸"));

/** 《奇门旨归》：天盘三奇临地盘值符遁仪为欢怡；天盘值符临地盘三奇为相佐。 */
export const matchesHuanYi = (palace: Palace, chiefStem: string) =>
  hasHeaven(palace, ...SAN_QI) && hasEarth(palace, chiefStem);
export const matchesXiangZuo = (palace: Palace, chiefPosition: number) =>
  palace.position === chiefPosition && hasEarth(palace, ...SAN_QI);

export const matchesFuGong = (palace: Palace, chiefStem: string) =>
  hasHeaven(palace, "庚") && hasEarth(palace, chiefStem);

export const matchesFeiGong = (palace: Palace, chiefPosition: number) =>
  palace.position === chiefPosition && hasEarth(palace, "庚");

const pairEvidence = (palace: Palace) =>
  `${palaceLabel(palace.position)}：天盘 ${stemsOf(palace.heavenlyStem)} · 地盘 ${stemsOf(palace.earthlyStem)}`;
const gateEvidence = (palace: Palace) =>
  `${palaceLabel(palace.position)}：${palace.gate}${deityIn(palace, ["太阴", "六合", "九地", "九天", "值符", "螣蛇", "白虎", "玄武"]) ? ` · ${palace.deity}` : ""}`;
// 组合格局的依据须同时展示干、门、神，避免只显示部分命中条件。
const combinationEvidence = (palace: Palace) =>
  `${palaceLabel(palace.position)}：天${stemsOf(palace.heavenlyStem)} 地${stemsOf(palace.earthlyStem)} ${palace.gate} ${palace.deity}`;

export type QimenPatternKind = "吉格" | "凶格";
export type QimenPatternGroup = "九遁" | "三诈五假" | "常用吉格" | "常用凶格" | "伏吟反吟" | "全局";
/** 成立格局的旺衰档位：由落宫的门/星旺相休囚废死综合而来。 */
export type QimenPatternStrength = "有力" | "中平" | "无力";

type CatalogEntry = {
  id: string;
  name: string;
  group: QimenPatternGroup;
  kind: QimenPatternKind;
  /** 成立条件（人能读的一句话）。 */
  requirement: string;
  /** 侧边提示：看到它意味着什么、要小心什么。 */
  hint: string;
  /** 全局格局不针对某一宫，整个盘面只判一次。默认宫位格局。 */
  scope?: "palace" | "global";
  /** 命中返回证据行；未命中返回 null。 */
  match: (palace: Palace, chart: NormalizedQimenChart) => string | null;
};

const good = (
  id: string,
  name: string,
  group: QimenPatternGroup,
  requirement: string,
  hint: string,
  match: CatalogEntry["match"],
  scope?: CatalogEntry["scope"],
): CatalogEntry => ({ id, name, group, kind: "吉格", requirement, hint, match, scope });

const bad = (
  id: string,
  name: string,
  group: QimenPatternGroup,
  requirement: string,
  hint: string,
  match: CatalogEntry["match"],
  scope?: CatalogEntry["scope"],
): CatalogEntry => ({ id, name, group, kind: "凶格", requirement, hint, match, scope });

const stemPair = (heaven: string, earth: string): CatalogEntry["match"] => (palace) =>
  hasHeaven(palace, heaven) && hasEarth(palace, earth) ? pairEvidence(palace) : null;

export const QIMEN_PATTERN_CATALOG: CatalogEntry[] = [
  // ---- 九遁 ----
  good("jiu_dun_tian", "天遁", "九遁", "天盘丙合生门临地丁；另列丙生临地戊、丙开或休临地丁", "按命中干配列证据，戊、丁两式不可混同。", (p) => {
    const reasons = tianDunReasons(p);
    return reasons.length ? `${combinationEvidence(p)}：${reasons.join("、")}` : null;
  }),
  good("jiu_dun_di", "地遁", "九遁", "天盘乙 + 地盘己 + 开门", "主稳固、落地与根基；宜置产、开张、长线布局。", (p) =>
    hasHeaven(p, "乙") && hasEarth(p, "己") && gateIn(p, ["开门"]) ? combinationEvidence(p) : null,
  ),
  good("jiu_dun_ren", "人遁", "九遁", "天丁、休门临太阴（艺术典705）；或天丁、休门临地丙（艺术典707）", "两种文献条件分别列证据；同宫两式并见只登记一次。", (p) => {
    const reasons = renDunReasons(p);
    return reasons.length ? `${combinationEvidence(p)}：${reasons.join("、")}` : null;
  }),
  good("jiu_dun_feng", "风遁", "九遁", "天盘乙合三吉门临巽；另式丙开临巽", "依命中条件列出主式或另式。", (p) => {
    const reasons = fengDunReasons(p);
    return reasons.length ? `${combinationEvidence(p)}：${reasons.join("、")}` : null;
  }),
  good("jiu_dun_yun", "云遁", "九遁", "天盘乙合三吉门临地辛；一云乙开临坤", "按命中条件分别标注；《奇门旨归》另要求乙辛三吉门临坤。", (p) => {
    const reasons = yunDunReasons(p);
    return reasons.length ? `${combinationEvidence(p)}：${reasons.join("、")}` : null;
  }),
  good("jiu_dun_long", "龙遁", "九遁", "天乙合三吉门临坎，或天乙休门临地癸", "按命中的文献条件分别列出证据；同宫多式并见只登记一次。", (p) => {
    const reasons = longDunReasons(p);
    return reasons.length ? `${combinationEvidence(p)}：${reasons.join("、")}` : null;
  }),
  good("jiu_dun_hu", "虎遁", "九遁", "乙加辛休门在艮；或辛生门在艮；一云丙加辛生门", "主威势、攻取与决断；宜竞争、出手，但忌过刚。", (p) =>
    matchesHuDun(p) ? combinationEvidence(p) : null,
  ),
  good("jiu_dun_shen", "神遁", "九遁", "天丙、生门临九天，或天乙、开门得天心", "按文献分别列出命中条件。", (p) => {
    const reasons = shenDunReasons(p);
    return reasons.length ? `${combinationEvidence(p)}：${reasons.join("、")}` : null;
  }),
  good("jiu_dun_gui", "鬼遁", "九遁", "奇门吉格三式；旨归另列丁休九地，及辛加丁合休生杜临艮九地", "所列九地为本站神盘；按命中条件分列原文口径。", (p) => {
    const reasons = guiDunReasons(p);
    return reasons.length ? `${combinationEvidence(p)}：${reasons.join("、")}` : null;
  }),

  // ---- 三诈五假 ----
  good("zhen_zha", "真诈", "三诈五假", "天盘乙/丙/丁 + 开/休/生门 + 太阴", "主以巧取胜、借智成事；善用信息差与内应。", (p) =>
    matchesSanZha(p, "太阴") ? combinationEvidence(p) : null,
  ),
  good("xiu_zha", "休诈", "三诈五假", "天盘乙/丙/丁 + 开/休/生门 + 六合", "主合作与撮合；宜联姻、结盟、居间调停。", (p) =>
    matchesSanZha(p, "六合") ? combinationEvidence(p) : null,
  ),
  good("chong_zha", "重诈", "三诈五假", "天盘乙/丙/丁 + 开/休/生门 + 九地", "主层层设局、以静制动；宜长线规划与埋伏。", (p) =>
    matchesSanZha(p, "九地") ? combinationEvidence(p) : null,
  ),
  good("tian_jia", "天假", "三诈五假", "天盘乙/丙/丁 + 景门 + 九天", "主名分、文书与声势扶助；宜申请、报批、公开发布。", (p) =>
    hasHeaven(p, ...SAN_QI) && gateIn(p, ["景门"]) && deityIn(p, ["九天"]) ? combinationEvidence(p) : null,
  ),
  good("di_jia", "地假", "三诈五假", "天盘丁/己/癸 + 杜门 + 九地/太阴/六合", "主地利与掩护；宜占地、守成、避开锋芒。", (p) =>
    matchesDiJia(p) ? combinationEvidence(p) : null,
  ),
  good("ren_jia", "人假", "三诈五假", "天盘壬 + 惊门 + 九天", "主借他人之名行事；宜代理、转达，慎防冒用。", (p) =>
    matchesRenJia(p) ? combinationEvidence(p) : null,
  ),
  good("shen_jia", "神假", "三诈五假", "天盘丁/己/癸 + 伤门 + 九地", "主借势压人、以快取胜；出手前先留证据。", (p) =>
    matchesShenJia(p) ? combinationEvidence(p) : null,
  ),
  good("gui_jia", "鬼假", "三诈五假", "天盘丁/己/癸 + 死门 + 九地", "主收束、了结与清算；宜处理旧账、止损退出。", (p) =>
    matchesGuiJia(p) ? combinationEvidence(p) : null,
  ),

  // ---- 常用吉格 ----
  good("san_qi_zhi_ling", "三奇之灵", "常用吉格", "地盘乙/丙/丁 + 开/休/生门 + 太阴/六合/九地/九天", "三奇得吉门吉神，为办事顺利的基础吉格。", (p) =>
    hasEarth(p, ...SAN_QI) && gateIn(p, SAN_MEN) && deityIn(p, SI_SHEN) ? combinationEvidence(p) : null,
  ),
  good("qi_you_lu_wei", "奇游禄位", "常用吉格", "天盘乙+震 3 / 丙+巽 4 / 丁+离 9，且门为开/休/生", "三奇临禄位又得吉门，主顺遂；缺吉门则力减。", (p) =>
    matchesQiYouLuWei(p) ? `${palaceLabel(p.position)}：天盘${stemsOf(p.heavenlyStem)} + ${p.gate}` : null,
  ),
  good("huan_yi", "欢怡", "常用吉格", "天盘乙/丙/丁 + 地盘值符所遁之仪", "三奇临六甲值符原宫；与值符加三奇的相佐分列。", (p, chart) =>
    matchesHuanYi(p, chart.raw.zhiFu.heavenlyStem) ? pairEvidence(p) : null,
  ),
  good("xiang_zuo", "相佐", "常用吉格", "天盘值符 + 地盘乙/丙/丁", "值符加地盘三奇；与三奇临值符原宫的欢怡分列。", (p, chart) =>
    matchesXiangZuo(p, chart.raw.zhiFu.position) ? pairEvidence(p) : null,
  ),
  good("qi_yi_xiang_he", "奇仪相和", "常用吉格", "奇和：天盘乙庚、丙辛、丁壬；仪和：天盘戊加地癸，或六甲值符加地己；均须开/休/生门", "甲己合按六甲值符加地己的口径判定。", (p, chart) => {
    if (!gateIn(p, SAN_MEN)) return null;
    const matched = [
      ...(hasHeaven(p, "乙") && hasEarth(p, "庚") ? ["乙庚"] : []),
      ...(hasHeaven(p, "丙") && hasEarth(p, "辛") ? ["丙辛"] : []),
      ...(hasHeaven(p, "丁") && hasEarth(p, "壬") ? ["丁壬"] : []),
      ...(hasHeaven(p, "戊") && hasEarth(p, "癸") ? ["戊癸"] : []),
      ...(p.position === chart.raw.zhiFu.position && hasEarth(p, "己") ? ["值符加己（甲己）"] : []),
    ];
    return matched.length ? `${pairEvidence(p)}：${matched.join("、")}` : null;
  }),
  good("men_gong_he_yi", "门宫和义", "常用吉格", "门宫相生；现用门生宫为和、宫生门为义，《奇门旨归》两名相反", "门与宫相生；和义名称因所引版本而异。", (p) => {
    const gateElement = GATE_FIVE_ELEMENTS[p.gate as string];
    const palaceElement = p.fiveElements as string;
    if (!gateElement || !palaceElement) return null;
    if (GENERATE[gateElement] === palaceElement) return `${p.gate}生${p.position}宫（现和/旨归义）`;
    if (GENERATE[palaceElement] === gateElement) return `${p.position}宫生${p.gate}（现义/旨归和）`;
    return null;
  }),
  good("san_qi_sheng_dian", "三奇贵人升殿", "常用吉格", "天盘乙在震 3 宫 / 丙在离 9 宫 / 丁在兑 7 宫", "三奇各归本宫；取用另看门迫、奇墓与旺衰。", (p) =>
    matchesSanQiShengDian(p) ? `${palaceLabel(p.position)}：天盘${stemsOf(p.heavenlyStem)}归本宫` : null,
  ),
  good("san_qi_de_shi", "三奇得使", "常用吉格", "天盘乙加地盘己/辛、丙加戊/庚、丁加壬/癸", "按《遁甲演义》配六甲所遁之仪。", (p) =>
    matchesSanQiDeShi(p) ? pairEvidence(p) : null,
  ),
  good("yu_nu_shou_men", "玉女守门", "常用吉格", "地盘丁落值使门宫", "主贵人或内应；仍须看门星旺衰与实际条件。", (p, chart) =>
    p.position === chart.raw.zhiShi.position && hasEarth(p, "丁")
      ? `${palaceLabel(p.position)}：地盘丁临值使门 ${p.gate}`
      : null,
  ),
  good("qing_long_fan_shou", "青龙返首", "常用吉格", "天盘戊 + 地盘丙（固定干配）", "主谋事有成、贵人在位；配合门旺更佳。", stemPair("戊", "丙")),
  good("fei_niao_die_xue", "飞鸟跌穴", "常用吉格", "天盘丙 + 地盘戊（固定干配）", "主行动得势、机会落地；宜主动出击。", stemPair("丙", "戊")),

  // ---- 常用凶格 ----
  bad("qi_ge", "奇格", "常用凶格", "天盘庚 + 地盘乙/丙/丁", "主压制三奇、好事受阻；宜换宫或改时。", (p) =>
    hasHeaven(p, "庚") && hasEarth(p, ...SAN_QI) ? pairEvidence(p) : null,
  ),
  bad("qing_long_tao_zou", "青龙逃走", "常用凶格", "天盘乙 + 地盘辛", "主计划外逃、人财走失；不宜远行、签约。", stemPair("乙", "辛")),
  bad("bai_hu_chang_kuang", "白虎猖狂", "常用凶格", "天盘辛 + 地盘乙", "主冲突、口舌与损耗；宜收缩防守。", stemPair("辛", "乙")),
  bad("ying_ru_tai_bai", "荧入太白", "常用凶格", "天盘丙 + 地盘庚", "主火克金、事多争斗；忌强行推进。", stemPair("丙", "庚")),
  bad("tai_bai_ru_ying", "太白入荧", "常用凶格", "天盘庚 + 地盘丙", "主外力入侵、被迫应对；留意对手动作。", stemPair("庚", "丙")),
  bad("jin_ru_huo_xiang_star", "金入火乡（星）", "常用凶格", "天心或天柱临离九宫", "《古今图书集成》另列星宫条件；与庚加丙分列，不要求二者同时成立。", (p) => {
    const reasons = metalStarInFireReasons(p);
    return reasons.length ? `${palaceLabel(p.position)}：${reasons.join("、")}（艺术典704）` : null;
  }),
  bad("huo_ru_jin_xiang_star_gate", "火入金乡（星门）", "常用凶格", "天英或景门临乾六、兑七", "将《图书集成》“天英景门到七六宫”按星或门分别临宫解读；与丙加庚分列。", (p) => {
    const reasons = fireInMetalReasons(p);
    return reasons.length ? `${palaceLabel(p.position)}：${reasons.join("、")}（艺术典704，分别临宫解读）` : null;
  }),
  bad("zhu_que_tou_jiang", "朱雀投江", "常用凶格", "天盘丁 + 地盘癸", "主文书口舌受挫、信息落空；重报文不重口头。", stemPair("丁", "癸")),
  bad("teng_she_yao_jiao", "螣蛇夭矫", "常用凶格", "天盘癸 + 地盘丁", "主虚惊、反复与纠缠；避开情绪化决策。", stemPair("癸", "丁")),
  bad("da_ge", "大格", "常用凶格", "天盘庚 + 地盘癸", "主阻滞、进退两难；宜换路径或借他宫。", stemPair("庚", "癸")),
  bad("xiao_ge", "小格", "常用凶格", "天盘庚 + 地盘壬", "主小阻小漏；提前留余量即可化解。", stemPair("庚", "壬")),
  bad("xing_ge", "刑格", "常用凶格", "天盘庚 + 地盘己", "主刑伤、约束与规则反噬；手续要合规。", stemPair("庚", "己")),
  bad("fu_gong_ge", "伏宫格", "常用凶格", "天盘庚临地盘本旬值符原宫", "据《遁甲演义》庚加直符。", (p, chart) =>
    matchesFuGong(p, chart.raw.zhiFu.heavenlyStem) ? pairEvidence(p) : null),
  bad("fei_gong_ge", "飞宫格", "常用凶格", "天盘值符临地盘庚", "据《遁甲演义》直符加庚。", (p, chart) =>
    matchesFeiGong(p, chart.raw.zhiFu.position) ? pairEvidence(p) : null),
  bad("tian_wang_si_zhang", "天网四张（两种口径）", "常用凶格", "癸加癸例，或值符加地癸；两种判据并列，另有以天癸落宫论网之说", "按命中证据区分不同口径，不作单一古法。", (p, chart) => {
    const conditions = tianWangReasons(p, chart.raw.zhiFu.position);
    return conditions.length ? `${pairEvidence(p)}：${conditions.join("、")}` : null;
  }),
  bad("sui_ge", "岁格", "常用凶格", "天盘庚 + 地盘年干；甲年按年柱六甲遁仪", "主与年上大势相悖；年度层面易受制。", (p, chart) => {
    const pillar = chart.raw.fourPillars.year;
    return matchesPillarGengGe(p, pillar) ? pillarEvidence(p, pillar, "年") : null;
  },
  ),
  bad("yue_ge", "月格", "常用凶格", "天盘庚 + 地盘月干；甲月按月柱六甲遁仪", "主当月计划受阻；宜调整节奏。", (p, chart) => {
    const pillar = chart.raw.fourPillars.month;
    return matchesPillarGengGe(p, pillar) ? pillarEvidence(p, pillar, "月") : null;
  },
  ),
  bad("ri_ge", "日格（伏干格）", "常用凶格", "天盘庚 + 地盘日干；甲日用该日所遁六仪；日格与伏干格为同一项", "主当下就被压制；宜暂缓或借力。", (p, chart) => {
    return matchesPillarGengGe(p, chart.raw.fourPillars.day) ? dayStemEvidence(chart, p) : null;
  }),
  bad("shi_ge", "时格", "常用凶格", "天盘庚 + 地盘时干；甲时按时柱六甲遁仪", "主此时此刻被卡；重大动作宜改时辰。", (p, chart) => {
    const pillar = chart.raw.fourPillars.hour;
    return matchesPillarGengGe(p, pillar) ? pillarEvidence(p, pillar, "时") : null;
  },
  ),
  bad("fei_gan_ge", "飞干格", "常用凶格", "天盘日干 + 地盘庚；甲日用该日所遁六仪", "主自己撞上阻力、行事易碰壁；缓一步再动。", (p, chart) => {
    return matchesPillarFeiGan(p, chart.raw.fourPillars.day) ? dayStemEvidence(chart, p) : null;
  }),
  bad("san_qi_ru_mu", "三奇入墓", "常用凶格", "本盘口径：天盘乙入 6/2 宫；丙入 6 宫；丁入 8 宫；古籍另有丙丁均入六宫之说", "主才能被埋、有力使不出；宜换时换方。", (p) =>
    sanQiTombStems(p).length
      ? `${palaceLabel(p.position)}：天盘 ${sanQiTombStems(p).join("/")} 入墓`
      : null,
  ),
  bad("san_qi_shou_xing", "三奇受刑", "常用凶格", "天盘丙/丁遇 1 宫或地盘壬癸；天盘乙遇 6/7 宫或地盘庚辛", "按所选受制口径，逐项列出宫位与干配原因。", (p) => {
    const reasons = sanQiRestrictionReasons(p);
    return reasons.length ? `${p.position}宫：${reasons.join("、")}` : null;
  }),
  bad("bei_ge", "悖格", "常用凶格", "天丙加地盘值符遁仪或年月日时干；天盘值符加地丙，甲柱按其遁仪", "符悖、飞悖与丙加四柱分别列出；甲柱遁仪为本站推导口径。", (p, chart) => {
    const reasons = beiGeReasons(p, chart.raw.zhiFu.heavenlyStem, chart.raw.zhiFu.position, chart.raw.fourPillars);
    return reasons.length ? `${p.position}宫：${reasons.join("、")}` : null;
  }),
  bad("shi_gan_ru_mu", "时干落宫入墓", "常用凶格", "本盘口径：天盘时干落其墓支之宫；与时柱干支判定分别计算", "该宫的天盘时干落于墓支所在宫。", (p, chart) => {
    const timeStem = chart.raw.fourPillars.hour.stem as string;
    const tombBranches = TOMB_MAP[timeStem] ?? [];
    const branches = valuesOf(p.earthBranch);
    return hasHeaven(p, timeStem) && tombBranches.length > 0 && branches.some((branch) => tombBranches.includes(branch))
      ? `${palaceLabel(p.position)}：天盘${timeStem}临${branches.join("/")}（墓支）`
      : null;
  }),
  bad("hour_pillar_tomb_baojian", "时柱入墓（宝鉴六时）", "常用凶格", "《奇门宝鉴》选定版本：时柱为戊戌、壬辰、丙戌、癸未、丁丑或己丑；异本有别", "按时柱干支判定，不等同于天盘时干落宫入墓。", (_p, chart) => {
    const hour = chart.raw.fourPillars.hour;
    const pair = `${hour.stem}${hour.branch}`;
    return ["戊戌", "壬辰", "丙戌", "癸未", "丁丑", "己丑"].includes(pair) ? `时柱${pair}` : null;
  }, "global"),
  bad("liu_yi_ji_xing", "六仪击刑", "常用凶格", "任一天盘六仪落其刑宫（逐宫法）", "主事与己刑、力不从心；该宫对应事项易出问题。", (p) =>
    p.liuYiJiXing?.hasJiXing
      ? `${palaceLabel(p.position)}：${p.liuYiJiXing.type ?? "六仪击刑"}${p.liuYiJiXing.description ? `（${p.liuYiJiXing.description}）` : ""}`
      : null,
  ),
  bad("men_po", "门迫", "常用凶格", "门克宫（门迫）", "主该宫事项受迫、处处掣肘；涉及此宫时留退路。", (p) =>
    p.gatePressure === "迫" ? `${palaceLabel(p.position)}：${p.gate}迫宫` : null,
  ),

  // ---- 伏吟反吟 ----
  bad("fu_yin_star", "星伏吟", "伏吟反吟", "外八宫主星各归本位", "主事情停滞、原地打转；宜静守整理，不宜强推。", (_p, chart) => {
    const items = placedStars(chart);
    return items.length === 8 && items.every(({ palace, native }) => native === palace.position) ? "外八宫主星皆归本位" : null;
  }, "global"),
  bad("fu_yin_gate", "门伏吟", "伏吟反吟", "八门各归本位", "主进退不得、守成尚可；忌开新局，宜收尾。", (_p, chart) => {
    const items = placedGates(chart);
    return items.length === 8 && items.every(({ palace, native }) => native === palace.position) ? "八门皆归本位" : null;
  }, "global"),
  bad("fu_yin_zhi_fu", "值符伏吟", "伏吟反吟", "值符星回到本宫；天禽按随芮寄坤比较", "按本站天禽随芮寄坤口径计算。", (_p, chart) => {
    const chief = chart.raw.zhiFu;
    return chief && chiefStarNative(chief.star) === chief.position ? `值符 ${chief.star} 回到第 ${chief.position} 宫` : null;
  }, "global"),
  bad("fan_yin_star", "星反吟", "伏吟反吟", "外八宫主星各临对冲之宫", "主局势动荡、来回翻覆；宜留后手、随时调整。", (_p, chart) => {
    const items = placedStars(chart);
    return items.length === 8 && items.every(({ palace, native }) => native === OPPOSITE[palace.position]) ? "外八宫主星皆临对冲宫" : null;
  }, "global"),
  bad("fan_yin_gate", "门反吟", "伏吟反吟", "八门各临对冲之宫", "主行动反复、计划易变；宜先定规则再动手。", (_p, chart) => {
    const items = placedGates(chart);
    return items.length === 8 && items.every(({ palace, native }) => native === OPPOSITE[palace.position]) ? "八门皆临对冲宫" : null;
  }, "global"),
  bad("fan_yin_zhi_fu", "值符反吟", "伏吟反吟", "值符星临本宫的对冲宫；天禽按随芮寄坤比较", "按本站天禽随芮寄坤口径计算。", (_p, chart) => {
    const chief = chart.raw.zhiFu;
    return chief && chief.position !== 5 && chiefStarNative(chief.star) === OPPOSITE[chief.position]
      ? `值符 ${chief.star} 临第 ${chief.position} 宫`
      : null;
  }, "global"),

  // ---- 全局 ----
  good(
    "tian_xian_shi_ge",
    "天显时格",
    "全局",
    "甲己日 甲子/甲戌时；乙庚日 甲申时；丙辛日 甲午时；丁壬日 甲辰时；戊癸日 甲寅时",
    "大吉之格，宜行大事；仍须结合用神宫与门星旺衰。",
    (_p, chart) => {
      const dayStem = chart.raw.fourPillars.day.stem as string;
      const timeStem = chart.raw.fourPillars.hour.stem as string;
      const timeBranch = chart.raw.fourPillars.hour.branch as string;
      const timeGZ = `${timeStem}${timeBranch}`;
      const table: Array<{ days: string[]; gz: string }> = [
        { days: ["甲", "己"], gz: "甲子" },
        { days: ["甲", "己"], gz: "甲戌" },
        { days: ["乙", "庚"], gz: "甲申" },
        { days: ["丙", "辛"], gz: "甲午" },
        { days: ["丁", "壬"], gz: "甲辰" },
        { days: ["戊", "癸"], gz: "甲寅" },
      ];
      return table.some((row) => row.days.includes(dayStem) && row.gz === timeGZ) ? `日干${dayStem} · 时柱${timeGZ}` : null;
    },
    "global",
  ),
  bad(
    "wu_bu_yu_shi",
    "五不遇时",
    "全局",
    "时干克日干（时干为日干之七杀）",
    "主此时行事多阻、易出错；重大动作宜改时辰。",
    (_p, chart) =>
      chart.raw.specialPatterns.wuBuYuShi?.isWuBuYuShi
        ? chart.raw.specialPatterns.wuBuYuShi.description ?? "五不遇时：时干克日干"
        : null,
    "global",
  ),
];

export const QIMEN_STRENGTH_METHOD = "门星旺衰赋分：旺3、相2、休1、囚0、死/废-1；取成立宫位最高和分，4起有力、1起中平，其余无力。取用限制另列，不计入此分。";
export const QIMEN_PRESSURE_TERMS = "本站迫指门克宫，制指宫克门（艺术典705）；《秘笈大全》首句另称门克宫为宫迫、宫克门为门迫，后句制害用语亦有歧义。";
export const QIMEN_DEITY_METHOD = "八神用白虎、玄武；《统宗》另列勾陈、朱雀及其属神，异书口径不同。";

const usageRestrictions = (id: string, palace: Palace): string[] => {
  const stemsById: Record<string, readonly string[]> = {
    tian_jia: SAN_QI, di_jia: DING_JI_GUI, ren_jia: ["壬"],
    shen_jia: DING_JI_GUI, gui_jia: DING_JI_GUI,
  };
  const stems = id === "san_qi_sheng_dian"
    ? [({ 3: "乙", 9: "丙", 7: "丁" } as Record<number, string>)[palace.position]]
    : stemsById[id];
  if (!stems) return [];
  const notes: string[] = [];
  if (palace.gatePressure === "迫") notes.push(`${palaceLabel(palace.position)}：${palace.gate}门迫，未满足无迫取用条件`);
  const branches = valuesOf(palace.earthBranch);
  const tombStems = valuesOf(palace.heavenlyStem).filter(stem =>
    stems.includes(stem) && branches.some(branch => (TOMB_MAP[stem] ?? []).includes(branch)));
  if (tombStems.length) notes.push(`${palaceLabel(palace.position)}：成立所用天盘${tombStems.join("/")}入墓，未满足无墓取用条件`);
  return notes;
};

export type QimenPatternCheck = {
  id: string;
  name: string;
  group: QimenPatternGroup;
  kind: QimenPatternKind;
  requirement: string;
  hint: string;
  status: "成立" | "未成立";
  positions: Position[];
  evidence: string[];
  /** 已成立宫位的古籍取用限制，独立于结构成立与旺衰赋分。 */
  usageRestrictions: string[];
  /** 仅「成立」的宫位格局有旺衰档位；全局格局（伏吟反吟等）不评。 */
  strength?: QimenPatternStrength;
  /** 旺衰依据，如「第 3 宫：门旺 · 星相」。 */
  strengthNote?: string;
};

export type QimenPatternReport = {
  /** 全部登记格局的判定结果。 */
  checks: QimenPatternCheck[];
  formed: QimenPatternCheck[];
  failed: QimenPatternCheck[];
  registered: number;
  /** 成立格局按旺衰分档计数（全局格局不计入）。 */
  strengthCounts: Record<QimenPatternStrength, number>;
  strengthMethod: string;
  /** 与所选古籍明确列出的另一判法不一致时单列，不参与格局统计。 */
  sourceNotes: string[];
};

export const evaluateQimenPatterns = (chart: NormalizedQimenChart): QimenPatternReport => {
  const checks = QIMEN_PATTERN_CATALOG.map((entry): QimenPatternCheck => {
    const evidence: string[] = [];
    const positions: Position[] = [];
    const restrictions: string[] = [];
    let strength: QimenPatternStrength | undefined;
    let strengthNote: string | undefined;

    if (entry.scope === "global") {
      const hit = entry.match(chart.raw.palaces[0], chart);
      if (hit) evidence.push(hit);
    } else {
      let best: { score: number; palace: Palace } | null = null;
      for (const palace of chart.raw.palaces) {
        const hit = entry.match(palace, chart);
        if (hit) {
          evidence.push(hit);
          positions.push(palace.position);
          restrictions.push(...usageRestrictions(entry.id, palace));
          const score = palaceScore(palace);
          if (!best || score > best.score) best = { score, palace };
        }
      }
      if (best) {
        strength = gradeFromScore(best.score);
        strengthNote = `${palaceLabel(best.palace.position)}：门${statusText(best.palace.status?.gate)} · 星${statusText(best.palace.status?.star)}`;
      }
    }

    return {
      id: entry.id,
      name: entry.name,
      group: entry.group,
      kind: entry.kind,
      requirement: entry.requirement,
      hint: entry.hint,
      status: evidence.length > 0 ? "成立" : "未成立",
      positions,
      evidence,
      usageRestrictions: restrictions,
      strength,
      strengthNote,
    };
  });

  const formed = checks.filter((check) => check.status === "成立");
  const hourPillar = `${chart.raw.fourPillars.hour.stem}${chart.raw.fourPillars.hour.branch}`;
  const yuNuTime = ["庚午", "己卯", "戊子", "丁酉", "丙午", "乙卯"].includes(hourPillar);
  const yuNuPalace = checks.find(check => check.id === "yu_nu_shou_men")?.status === "成立";
  const ownStem = (palace: Palace) => valuesOf(palace.earthlyStem)[0];
  const middle = chart.raw.palaces.find(palace => palace.position === 5);
  const chiefOrigin = chart.raw.palaces.find(palace => ownStem(palace) === chart.raw.zhiFu.heavenlyStem);
  const branches = "子丑寅卯辰巳午未申酉戌亥";
  const startBranch = chart.raw.timeInfo?.xunShou?.[1];
  const startIndex = startBranch ? branches.indexOf(startBranch) : -1;
  const hourIndex = branches.indexOf(chart.raw.fourPillars.hour.branch);
  const steps = startIndex < 0 || hourIndex < 0 ? null : (hourIndex - startIndex + 12) % 12;
  const dun = chart.raw.ju?.type;
  const rawGatePosition = chiefOrigin && steps !== null && (dun === "阳遁" || dun === "阴遁")
    ? ((chiefOrigin.position - 1 + (dun === "阳遁" ? steps : -steps)) % 9 + 9) % 9 + 1
    : null;
  const centerNote = rawGatePosition === 5
    ? "值使原到中五宫后寄出。"
    : middle && ownStem(middle) === "丁" ? "地丁原在中五宫，盘面将其寄出。" : "";
  const sourceNotes = yuNuTime !== yuNuPalace
    ? [`玉女守门口径差异：时柱${hourPillar}${yuNuTime ? "属于" : "不属于"}《奇门宝鉴》所列六时；本站地丁与值使同宫${yuNuPalace ? "成立" : "未成立"}。${centerNote}两种判定暂不强行等同。`]
    : [];
  // 《遁甲演义》葛洪、王璋条以本旬值符落宫为判据。
  const chiefPunishmentPalace: Record<string, number> = {
    甲子: 3, 甲戌: 2, 甲申: 8, 甲午: 9, 甲辰: 4, 甲寅: 4,
  };
  const xunShou = chart.raw.timeInfo?.xunShou?.slice(0, 2);
  const expectedPunishment = xunShou ? chiefPunishmentPalace[xunShou] : undefined;
  if (expectedPunishment !== undefined) {
    const chiefPosition = chart.raw.zhiFu.position;
    const classicalPalaces = chiefPosition === expectedPunishment ? [chiefPosition] : [];
    const perPalace = chart.raw.palaces.filter(palace => palace.liuYiJiXing?.hasJiXing).map(palace => palace.position);
    if (perPalace.length !== classicalPalaces.length || perPalace.some(position => !classicalPalaces.includes(position))) {
      const describe = (positions: number[]) => positions.length ? positions.map(position => `${position}宫`).join("、") : "未命中";
      sourceNotes.push(`六仪击刑：《遁甲演义》值符${describe(classicalPalaces)}，逐宫${describe(perPalace)}。`);
    }
  }
  // 《遁甲演义》以本时甲旬头为地盘甲，固定戊式在其余五旬可能给出不同宫位。
  const xunStem = xunShou?.[0] === "甲" ? JIA_HIDDEN_STEM[xunShou[1]] : undefined;
  if (xunStem && xunStem !== "戊") {
    const birdPalaces = chart.raw.palaces.filter(palace => hasHeaven(palace, "丙"));
    const classicalBirdPalaces = birdPalaces.filter(palace => hasEarth(palace, xunStem));
    const fixedBirdPalaces = birdPalaces.filter(palace => hasEarth(palace, "戊"));
    if (classicalBirdPalaces.some(palace => !fixedBirdPalaces.includes(palace)) || fixedBirdPalaces.some(palace => !classicalBirdPalaces.includes(palace))) {
      const describe = (palaces: Palace[]) => palaces.length ? palaces.map(palace => `${palace.position}宫`).join("、") : "未命中";
      sourceNotes.push(`飞鸟跌穴：《遁甲演义》丙加${xunStem}（${xunShou}旬）${describe(classicalBirdPalaces)}，固定丙加戊${describe(fixedBirdPalaces)}。`);
    }
  }
  const tombVariants = chart.raw.palaces.flatMap((palace) => {
    const stems = valuesOf(palace.heavenlyStem);
    return [
      ...(palace.position === 6 && stems.includes("丁") ? ["丁临六：王璋列入，本站未列"] : []),
      ...(palace.position === 6 && stems.includes("乙") ? ["乙临六：本站列入，王璋本段未列"] : []),
      ...(palace.position === 8 && stems.includes("丁") ? ["丁临八：本站列入，王璋本段未列"] : []),
    ];
  });
  if (tombVariants.length) sourceNotes.push(`三奇入墓异说：${tombVariants.join("；")}（艺术典705，仅比较所列条件）。`);
  const strengthCounts: Record<QimenPatternStrength, number> = { 有力: 0, 中平: 0, 无力: 0 };
  for (const check of formed) {
    if (check.strength) strengthCounts[check.strength] += 1;
  }

  return {
    checks,
    formed,
    failed: checks.filter((check) => check.status === "未成立"),
    registered: checks.length,
    strengthCounts,
    strengthMethod: QIMEN_STRENGTH_METHOD,
    sourceNotes,
  };
};
