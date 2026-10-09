/**
 * 奇门格局的正面判定。
 *
 * `3meta` 只返回**已成立**的吉格/凶格；盘面上没有的格局它不会说。这里登记一批
 * 经典格局（都是可判定的：天盘/地盘奇仪组合、门迫、六仪击刑、五不遇时），逐个
 * 在九宫里判「成立 / 未成立」，并给出一句侧边提示。它**不是**穷举所有传统格局，
 * 未登记的格局不能据此推断不存在。
 */
import type { Position } from "3meta";
import type { NormalizedQimenChart } from "./types";

const stemsOf = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item !== "无");
  return typeof value === "string" && value !== "无" ? [value] : [];
};

type Palace = NormalizedQimenChart["raw"]["palaces"][number];

const hasStemPair = (palace: Palace, heaven: string, earth: string) =>
  stemsOf(palace.heavenlyStem).includes(heaven) && stemsOf(palace.earthlyStem).includes(earth);

const palaceLabel = (position: Position) => `第 ${position} 宫`;

const pairEvidence = (palace: Palace) =>
  `${palaceLabel(palace.position)}：天盘 ${stemsOf(palace.heavenlyStem).join("/") || "无"} · 地盘 ${stemsOf(palace.earthlyStem).join("/") || "无"}`;

export type QimenPatternKind = "吉格" | "凶格";

type CatalogEntry = {
  id: string;
  name: string;
  kind: QimenPatternKind;
  /** 成立条件（人能读的一句话）。 */
  requirement: string;
  /** 侧边提示：看到它意味着什么、要小心什么。 */
  hint: string;
  /** 命中返回证据行；未命中返回 null。 */
  match: (palace: Palace, chart: NormalizedQimenChart) => string | null;
};

const stemPair = (heaven: string, earth: string) => (palace: Palace) =>
  hasStemPair(palace, heaven, earth) ? pairEvidence(palace) : null;

const zhiShiPalace = (chart: NormalizedQimenChart) => chart.raw.zhiShi.position;

export const QIMEN_PATTERN_CATALOG: CatalogEntry[] = [
  // ---- 吉格 ----
  { id: "qing_long_fan_shou", name: "青龙返首", kind: "吉格", requirement: "天盘戊 + 地盘丙", hint: "主谋事有成、贵人在位；配合门旺更佳。", match: stemPair("戊", "丙") },
  { id: "fei_niao_die_xue", name: "飞鸟跌穴", kind: "吉格", requirement: "天盘丙 + 地盘戊", hint: "主行动得势、机会落地；宜主动出击。", match: stemPair("丙", "戊") },
  {
    id: "san_qi_de_shi",
    name: "三奇得使",
    kind: "吉格",
    requirement: "乙/丙/丁（地盘三奇）落值使门宫",
    hint: "三奇与值使同宫，事有贵助；结合值使门的旺衰判断力度。",
    match: (palace, chart) =>
      palace.position === zhiShiPalace(chart) &&
      stemsOf(palace.earthlyStem).some((stem) => ["乙", "丙", "丁"].includes(stem))
        ? `${palaceLabel(palace.position)}：地盘 ${stemsOf(palace.earthlyStem).join("/")} 临值使门 ${palace.gate}`
        : null,
  },
  {
    id: "yu_nu_shou_men",
    name: "玉女守门",
    kind: "吉格",
    requirement: "地盘丁落值使门宫",
    hint: "主贵人或内应；仍须看门星旺衰与实际条件。",
    match: (palace, chart) =>
      palace.position === zhiShiPalace(chart) && stemsOf(palace.earthlyStem).includes("丁")
        ? `${palaceLabel(palace.position)}：地盘丁临值使门 ${palace.gate}`
        : null,
  },
  {
    id: "san_qi_sheng_dian",
    name: "三奇贵人升殿",
    kind: "吉格",
    requirement: "地盘乙在震 3 宫 / 丙在离 9 宫 / 丁在兑 7 宫",
    hint: "三奇各归本宫，气势纯粹；适合正式、公开之事。",
    match: (palace) => {
      const map: Record<number, string> = { 3: "乙", 9: "丙", 7: "丁" };
      const want = map[palace.position];
      return want && stemsOf(palace.earthlyStem).includes(want) ? `${palaceLabel(palace.position)}：地盘${want}归本宫` : null;
    },
  },
  {
    id: "qi_you_lu_wei",
    name: "奇游禄位",
    kind: "吉格",
    requirement: "地盘乙+震 3 / 丙+巽 4 / 丁+离 9，且门为开/休/生",
    hint: "三奇临禄位又得吉门，主顺遂；缺吉门则力减。",
    match: (palace) => {
      const map: Record<number, string> = { 3: "乙", 4: "丙", 9: "丁" };
      const want = map[palace.position];
      if (!want || !stemsOf(palace.earthlyStem).includes(want)) return null;
      if (!["开门", "休门", "生门"].includes(palace.gate)) return null;
      return `${palaceLabel(palace.position)}：地盘${want} + ${palace.gate}`;
    },
  },

  // ---- 凶格 ----
  { id: "qing_long_tao_zou", name: "青龙逃走", kind: "凶格", requirement: "天盘乙 + 地盘辛", hint: "主计划外逃、人财走失；不宜远行、签约。", match: stemPair("乙", "辛") },
  { id: "bai_hu_chang_kuang", name: "白虎猖狂", kind: "凶格", requirement: "天盘辛 + 地盘乙", hint: "主冲突、口舌与损耗；宜收缩防守。", match: stemPair("辛", "乙") },
  { id: "ying_ru_tai_bai", name: "荧入太白", kind: "凶格", requirement: "天盘丙 + 地盘庚", hint: "主火克金、事多争斗；忌强行推进。", match: stemPair("丙", "庚") },
  { id: "tai_bai_ru_ying", name: "太白入荧", kind: "凶格", requirement: "天盘庚 + 地盘丙", hint: "主外力入侵、被迫应对；留意对手动作。", match: stemPair("庚", "丙") },
  { id: "zhu_que_tou_jiang", name: "朱雀投江", kind: "凶格", requirement: "天盘丁 + 地盘癸", hint: "主文书口舌受挫、信息落空；重报文不重口头。", match: stemPair("丁", "癸") },
  { id: "teng_she_yao_jiao", name: "螣蛇夭矫", kind: "凶格", requirement: "天盘癸 + 地盘丁", hint: "主虚惊、反复与纠缠；避开情绪化决策。", match: stemPair("癸", "丁") },
  { id: "da_ge", name: "大格", kind: "凶格", requirement: "天盘庚 + 地盘癸", hint: "主阻滞、进退两难；宜换路径或借他宫。", match: stemPair("庚", "癸") },
  { id: "xiao_ge", name: "小格", kind: "凶格", requirement: "天盘庚 + 地盘壬", hint: "主小阻小漏；提前留余量即可化解。", match: stemPair("庚", "壬") },
  { id: "xing_ge", name: "刑格", kind: "凶格", requirement: "天盘庚 + 地盘己", hint: "主刑伤、约束与规则反噬；手续要合规。", match: stemPair("庚", "己") },
  { id: "fu_gong_ge", name: "伏宫格", kind: "凶格", requirement: "天盘庚 + 地盘戊", hint: "主原地受困、进展停滞；先把卡点说清。", match: stemPair("庚", "戊") },
  { id: "fei_gong_ge", name: "飞宫格", kind: "凶格", requirement: "天盘戊 + 地盘庚", hint: "主动荡外移、被动应变；不宜扩张布局。", match: stemPair("戊", "庚") },
  { id: "tian_wang_si_zhang", name: "天网四张", kind: "凶格", requirement: "天盘癸 + 地盘癸", hint: "主受困受限、网罗缠身；宜守不宜攻。", match: stemPair("癸", "癸") },
  {
    id: "liu_yi_ji_xing",
    name: "六仪击刑",
    kind: "凶格",
    requirement: "六仪落其刑宫",
    hint: "主事与己刑、力不从心；该宫对应事项易出问题。",
    match: (palace) =>
      palace.liuYiJiXing?.hasJiXing ? `${palaceLabel(palace.position)}：${palace.liuYiJiXing.type ?? "六仪击刑"}${palace.liuYiJiXing.description ? `（${palace.liuYiJiXing.description}）` : ""}` : null,
  },
  {
    id: "men_po",
    name: "门迫",
    kind: "凶格",
    requirement: "门克宫（门迫）",
    hint: "主该宫事项受迫、处处掣肘；涉及此宫时留退路。",
    match: (palace) => (palace.gatePressure === "迫" ? `${palaceLabel(palace.position)}：${palace.gate}迫宫` : null),
  },
  {
    id: "wu_bu_yu_shi",
    name: "五不遇时",
    kind: "凶格",
    requirement: "时干克日干（时干为日干之七杀）",
    hint: "主此时行事多阻、易出错；重大动作宜改时辰。",
    match: (_palace, chart) =>
      chart.raw.specialPatterns.wuBuYuShi?.isWuBuYuShi
        ? chart.raw.specialPatterns.wuBuYuShi.description ?? "五不遇时：时干克日干"
        : null,
  },
];

export type QimenPatternCheck = {
  id: string;
  name: string;
  kind: QimenPatternKind;
  requirement: string;
  hint: string;
  status: "成立" | "未成立";
  positions: Position[];
  evidence: string[];
};

export type QimenPatternReport = {
  /** 盘面上成立的格局（吉凶分列由调用方按 kind 过滤）。 */
  checks: QimenPatternCheck[];
  formed: QimenPatternCheck[];
  failed: QimenPatternCheck[];
  registered: number;
};

export const evaluateQimenPatterns = (chart: NormalizedQimenChart): QimenPatternReport => {
  const checks = QIMEN_PATTERN_CATALOG.map((entry): QimenPatternCheck => {
    const evidence: string[] = [];
    const positions: Position[] = [];

    // 五不遇时是全局格局，不针对单一宫位，单独处理。
    if (entry.id === "wu_bu_yu_shi") {
      const hit = entry.match(chart.raw.palaces[0], chart);
      if (hit) evidence.push(hit);
    } else {
      for (const palace of chart.raw.palaces) {
        const hit = entry.match(palace, chart);
        if (hit) {
          evidence.push(hit);
          positions.push(palace.position);
        }
      }
    }

    return {
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      requirement: entry.requirement,
      hint: entry.hint,
      status: evidence.length > 0 ? "成立" : "未成立",
      positions,
      evidence,
    };
  });

  return {
    checks,
    formed: checks.filter((check) => check.status === "成立"),
    failed: checks.filter((check) => check.status === "未成立"),
    registered: checks.length,
  };
};
