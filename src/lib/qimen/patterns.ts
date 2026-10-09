/**
 * 奇门格局的正面判定。
 *
 * `3meta` 只返回**已成立**的吉格/凶格；盘面上没有的格局它不会说。这里登记一批
 * 经典格局，逐个在九宫里判「成立 / 未成立」，并给出一句侧边提示。判定条件与
 * `3meta` 的 `detectPatterns` / `detectGlobalPatterns` 保持一致（照抄，不臆造）。
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

const hasHeaven = (palace: Palace, ...stems: string[]) =>
  valuesOf(palace.heavenlyStem).some((stem) => stems.includes(stem));
const hasEarth = (palace: Palace, ...stems: string[]) =>
  valuesOf(palace.earthlyStem).some((stem) => stems.includes(stem));
const gateIn = (palace: Palace, gates: readonly string[]) => gates.includes(palace.gate as string);
const deityIn = (palace: Palace, deities: readonly string[]) => deities.includes(palace.deity as string);
const isZhiFu = (palace: Palace) => palace.deity === "值符" || Boolean(palace.isZhiFu);
const palaceLabel = (position: Position) => `第 ${position} 宫`;
const stemsOf = (value: unknown) => valuesOf(value).join("/") || "无";

const pairEvidence = (palace: Palace) =>
  `${palaceLabel(palace.position)}：天盘 ${stemsOf(palace.heavenlyStem)} · 地盘 ${stemsOf(palace.earthlyStem)}`;
const gateEvidence = (palace: Palace) =>
  `${palaceLabel(palace.position)}：${palace.gate}${deityIn(palace, ["太阴", "六合", "九地", "九天", "值符", "螣蛇", "白虎", "玄武"]) ? ` · ${palace.deity}` : ""}`;

export type QimenPatternKind = "吉格" | "凶格";
export type QimenPatternGroup = "九遁" | "三诈五假" | "常用吉格" | "常用凶格" | "全局";

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
  good("jiu_dun_tian", "天遁", "九遁", "天盘丙 + 地盘丁 + 生门", "主上达、机遇与贵人提携；宜公开、正式之事。", (p) =>
    hasHeaven(p, "丙") && hasEarth(p, "丁") && gateIn(p, ["生门"]) ? pairEvidence(p) : null,
  ),
  good("jiu_dun_di", "地遁", "九遁", "天盘乙 + 地盘己 + 开门", "主稳固、落地与根基；宜置产、开张、长线布局。", (p) =>
    hasHeaven(p, "乙") && hasEarth(p, "己") && gateIn(p, ["开门"]) ? pairEvidence(p) : null,
  ),
  good("jiu_dun_ren", "人遁", "九遁", "天盘丁 + 休门 + 太阴", "主人和、内应与暗中助力；宜谈判、协调、私下沟通。", (p) =>
    hasHeaven(p, "丁") && gateIn(p, ["休门"]) && deityIn(p, ["太阴"]) ? gateEvidence(p) : null,
  ),
  good("jiu_dun_feng", "风遁", "九遁", "天盘乙 + 开/休/生门 + 巽 4 宫", "主传播、流动与远行；宜推广、搬迁、走动之事。", (p) =>
    hasHeaven(p, "乙") && gateIn(p, SAN_MEN) && p.position === 4 ? gateEvidence(p) : null,
  ),
  good("jiu_dun_yun", "云遁", "九遁", "天盘乙 + 开/休/生门 + 地盘辛", "主遮掩、过渡与缓和；宜暗中准备、避开正面冲突。", (p) =>
    hasHeaven(p, "乙") && gateIn(p, SAN_MEN) && hasEarth(p, "辛") ? pairEvidence(p) : null,
  ),
  good("jiu_dun_long", "龙遁", "九遁", "天盘乙 + 开/休/生门 + 坎 1 宫或地盘癸", "主潜藏蓄势、后发制人；宜谋定而后动。", (p) =>
    hasHeaven(p, "乙") && gateIn(p, SAN_MEN) && (p.position === 1 || hasEarth(p, "癸")) ? gateEvidence(p) : null,
  ),
  good("jiu_dun_hu", "虎遁", "九遁", "(天盘乙 + 休/生门 + 艮 8 宫或地盘辛) 或 (天盘庚 + 开门 + 兑 7 宫)", "主威势、攻取与决断；宜竞争、出手，但忌过刚。", (p) =>
    (hasHeaven(p, "乙") && gateIn(p, ["休门", "生门"]) && (p.position === 8 || hasEarth(p, "辛"))) ||
    (hasHeaven(p, "庚") && gateIn(p, ["开门"]) && p.position === 7)
      ? gateEvidence(p)
      : null,
  ),
  good("jiu_dun_shen", "神遁", "九遁", "天盘丙 + 生门 + 九天", "主声势、上位与号召；宜树立形象、争取支持。", (p) =>
    hasHeaven(p, "丙") && gateIn(p, ["生门"]) && deityIn(p, ["九天"]) ? gateEvidence(p) : null,
  ),
  good("jiu_dun_gui", "鬼遁", "九遁", "天盘丁 + 杜门 + 九地", "主隐蔽、暗查与回避；宜调查防守，不宜张扬。", (p) =>
    hasHeaven(p, "丁") && gateIn(p, ["杜门"]) && deityIn(p, ["九地"]) ? gateEvidence(p) : null,
  ),

  // ---- 三诈五假 ----
  good("zhen_zha", "真诈", "三诈五假", "开/休/生门 + 太阴", "主以巧取胜、借智成事；善用信息差与内应。", (p) =>
    gateIn(p, SAN_MEN) && deityIn(p, ["太阴"]) ? gateEvidence(p) : null,
  ),
  good("xiu_zha", "休诈", "三诈五假", "开/休/生门 + 地盘乙/丙/丁 + 六合", "主合作与撮合；宜联姻、结盟、居间调停。", (p) =>
    gateIn(p, SAN_MEN) && hasEarth(p, ...SAN_QI) && deityIn(p, ["六合"]) ? gateEvidence(p) : null,
  ),
  good("chong_zha", "重诈", "三诈五假", "开/休/生门 + 地盘乙/丙/丁 + 九地", "主层层设局、以静制动；宜长线规划与埋伏。", (p) =>
    gateIn(p, SAN_MEN) && hasEarth(p, ...SAN_QI) && deityIn(p, ["九地"]) ? gateEvidence(p) : null,
  ),
  good("tian_jia", "天假", "三诈五假", "天盘乙/丙/丁 + 景门 + 九天", "主名分、文书与声势扶助；宜申请、报批、公开发布。", (p) =>
    hasHeaven(p, ...SAN_QI) && gateIn(p, ["景门"]) && deityIn(p, ["九天"]) ? gateEvidence(p) : null,
  ),
  good("di_jia", "地假", "三诈五假", "地盘丁/己/癸 + 杜门 + 九地/太阴/六合", "主地利与掩护；宜占地、守成、避开锋芒。", (p) =>
    hasEarth(p, ...DING_JI_GUI) && gateIn(p, ["杜门"]) && deityIn(p, ["九地", "太阴", "六合"]) ? gateEvidence(p) : null,
  ),
  good("ren_jia", "人假", "三诈五假", "地盘壬 + 惊门 + 九天", "主借他人之名行事；宜代理、转达，慎防冒用。", (p) =>
    hasEarth(p, "壬") && gateIn(p, ["惊门"]) && deityIn(p, ["九天"]) ? gateEvidence(p) : null,
  ),
  good("shen_jia", "神假", "三诈五假", "地盘丁/己/癸 + 伤门 + 九地", "主借势压人、以快取胜；出手前先留证据。", (p) =>
    hasEarth(p, ...DING_JI_GUI) && gateIn(p, ["伤门"]) && deityIn(p, ["九地"]) ? gateEvidence(p) : null,
  ),
  good("gui_jia", "鬼假", "三诈五假", "地盘丁/己/癸 + 死门 + 九地", "主收束、了结与清算；宜处理旧账、止损退出。", (p) =>
    hasEarth(p, ...DING_JI_GUI) && gateIn(p, ["死门"]) && deityIn(p, ["九地"]) ? gateEvidence(p) : null,
  ),

  // ---- 常用吉格 ----
  good("san_qi_zhi_ling", "三奇之灵", "常用吉格", "地盘乙/丙/丁 + 开/休/生门 + 太阴/六合/九地/九天", "三奇得吉门吉神，为办事顺利的基础吉格。", (p) =>
    hasEarth(p, ...SAN_QI) && gateIn(p, SAN_MEN) && deityIn(p, SI_SHEN) ? gateEvidence(p) : null,
  ),
  good("qi_you_lu_wei", "奇游禄位", "常用吉格", "地盘乙+震 3 / 丙+巽 4 / 丁+离 9，且门为开/休/生", "三奇临禄位又得吉门，主顺遂；缺吉门则力减。", (p) => {
    const map: Record<number, string> = { 3: "乙", 4: "丙", 9: "丁" };
    const want = map[p.position];
    return want && hasEarth(p, want) && gateIn(p, SAN_MEN) ? `${palaceLabel(p.position)}：地盘${want} + ${p.gate}` : null;
  }),
  good("huan_yi", "欢怡", "常用吉格", "地盘乙/丙/丁 + 值符", "三奇临值符，主受重用、得上级认可；宜述职、争取授权。", (p) =>
    hasEarth(p, ...SAN_QI) && isZhiFu(p) ? pairEvidence(p) : null,
  ),
  good("qi_yi_xiang_he", "奇仪相和", "常用吉格", "(奇和) 天盘乙+地盘庚 / 丙+辛 / 丁+壬；(仪和) 天盘戊+地盘癸 / 甲+己；且门为开/休/生", "奇仪配合得力，主协同顺遂；是稳定成事之象。", (p) => {
    if (!gateIn(p, SAN_MEN)) return null;
    if ((hasHeaven(p, "乙") && hasEarth(p, "庚")) || (hasHeaven(p, "丙") && hasEarth(p, "辛")) || (hasHeaven(p, "丁") && hasEarth(p, "壬")))
      return `奇和：${pairEvidence(p)}`;
    if ((hasHeaven(p, "戊") && hasEarth(p, "癸")) || (hasHeaven(p, "甲") && hasEarth(p, "己")))
      return `仪和：${pairEvidence(p)}`;
    return null;
  }),
  good("men_gong_he_yi", "门宫和义", "常用吉格", "门生宫（和）或宫生门（义）", "门与宫相生，主环境配合、阻力小；是选方用事的加分项。", (p) => {
    const gateElement = GATE_FIVE_ELEMENTS[p.gate as string];
    const palaceElement = p.fiveElements as string;
    if (!gateElement || !palaceElement) return null;
    if (GENERATE[gateElement] === palaceElement) return `和：${p.gate}生${palaceLabel(p.position)}`;
    if (GENERATE[palaceElement] === gateElement) return `义：${palaceLabel(p.position)}生${p.gate}`;
    return null;
  }),
  good("san_qi_sheng_dian", "三奇贵人升殿", "常用吉格", "地盘乙在震 3 宫 / 丙在离 9 宫 / 丁在兑 7 宫", "三奇各归本宫，气势纯粹；适合正式、公开之事。", (p) => {
    const map: Record<number, string> = { 3: "乙", 9: "丙", 7: "丁" };
    const want = map[p.position];
    return want && hasEarth(p, want) ? `${palaceLabel(p.position)}：地盘${want}归本宫` : null;
  }),
  good("san_qi_de_shi", "三奇得使", "常用吉格", "天盘乙/丙/丁 落值使门宫", "三奇与值使同宫，事有贵助；结合值使门的旺衰判断力度。", (p, chart) =>
    p.position === chart.raw.zhiShi.position && hasHeaven(p, ...SAN_QI)
      ? `${palaceLabel(p.position)}：天盘 ${stemsOf(p.heavenlyStem)} 临值使门 ${p.gate}`
      : null,
  ),
  good("yu_nu_shou_men", "玉女守门", "常用吉格", "地盘丁落值使门宫", "主贵人或内应；仍须看门星旺衰与实际条件。", (p, chart) =>
    p.position === chart.raw.zhiShi.position && hasEarth(p, "丁")
      ? `${palaceLabel(p.position)}：地盘丁临值使门 ${p.gate}`
      : null,
  ),
  good("qing_long_fan_shou", "青龙返首", "常用吉格", "天盘戊 + 地盘丙", "主谋事有成、贵人在位；配合门旺更佳。", stemPair("戊", "丙")),
  good("fei_niao_die_xue", "飞鸟跌穴", "常用吉格", "天盘丙 + 地盘戊", "主行动得势、机会落地；宜主动出击。", stemPair("丙", "戊")),

  // ---- 常用凶格 ----
  bad("qi_ge", "奇格", "常用凶格", "天盘庚 + 地盘乙/丙/丁", "主压制三奇、好事受阻；宜换宫或改时。", (p) =>
    hasHeaven(p, "庚") && hasEarth(p, ...SAN_QI) ? pairEvidence(p) : null,
  ),
  bad("qing_long_tao_zou", "青龙逃走", "常用凶格", "天盘乙 + 地盘辛", "主计划外逃、人财走失；不宜远行、签约。", stemPair("乙", "辛")),
  bad("bai_hu_chang_kuang", "白虎猖狂", "常用凶格", "天盘辛 + 地盘乙", "主冲突、口舌与损耗；宜收缩防守。", stemPair("辛", "乙")),
  bad("ying_ru_tai_bai", "荧入太白", "常用凶格", "天盘丙 + 地盘庚", "主火克金、事多争斗；忌强行推进。", stemPair("丙", "庚")),
  bad("tai_bai_ru_ying", "太白入荧", "常用凶格", "天盘庚 + 地盘丙", "主外力入侵、被迫应对；留意对手动作。", stemPair("庚", "丙")),
  bad("zhu_que_tou_jiang", "朱雀投江", "常用凶格", "天盘丁 + 地盘癸", "主文书口舌受挫、信息落空；重报文不重口头。", stemPair("丁", "癸")),
  bad("teng_she_yao_jiao", "螣蛇夭矫", "常用凶格", "天盘癸 + 地盘丁", "主虚惊、反复与纠缠；避开情绪化决策。", stemPair("癸", "丁")),
  bad("da_ge", "大格", "常用凶格", "天盘庚 + 地盘癸", "主阻滞、进退两难；宜换路径或借他宫。", stemPair("庚", "癸")),
  bad("xiao_ge", "小格", "常用凶格", "天盘庚 + 地盘壬", "主小阻小漏；提前留余量即可化解。", stemPair("庚", "壬")),
  bad("xing_ge", "刑格", "常用凶格", "天盘庚 + 地盘己", "主刑伤、约束与规则反噬；手续要合规。", stemPair("庚", "己")),
  bad("fu_gong_ge", "伏宫格", "常用凶格", "天盘庚 + 地盘戊", "主原地受困、进展停滞；先把卡点说清。", stemPair("庚", "戊")),
  bad("fei_gong_ge", "飞宫格", "常用凶格", "天盘戊 + 地盘庚", "主动荡外移、被动应变；不宜扩张布局。", stemPair("戊", "庚")),
  bad("tian_wang_si_zhang", "天网四张", "常用凶格", "天盘癸 + 地盘癸", "主受困受限、网罗缠身；宜守不宜攻。", stemPair("癸", "癸")),
  bad("sui_ge", "岁格", "常用凶格", "天盘庚 + 地盘年干", "主与年上大势相悖；年度层面易受制。", (p, chart) =>
    hasHeaven(p, "庚") && hasEarth(p, chart.raw.fourPillars.year.stem) ? pairEvidence(p) : null,
  ),
  bad("yue_ge", "月格", "常用凶格", "天盘庚 + 地盘月干", "主当月计划受阻；宜调整节奏。", (p, chart) =>
    hasHeaven(p, "庚") && hasEarth(p, chart.raw.fourPillars.month.stem) ? pairEvidence(p) : null,
  ),
  bad("ri_ge", "日格", "常用凶格", "天盘庚 + 地盘日干", "主当下就被压制；宜暂缓或借力。", (p, chart) =>
    hasHeaven(p, "庚") && hasEarth(p, chart.raw.fourPillars.day.stem) ? pairEvidence(p) : null,
  ),
  bad("fu_gan_ge", "伏干格", "常用凶格", "天盘庚 + 地盘日干（同 日格）", "主自我受制、内耗；凡事先安内。", (p, chart) =>
    hasHeaven(p, "庚") && hasEarth(p, chart.raw.fourPillars.day.stem) ? pairEvidence(p) : null,
  ),
  bad("shi_ge", "时格", "常用凶格", "天盘庚 + 地盘时干", "主此时此刻被卡；重大动作宜改时辰。", (p, chart) =>
    hasHeaven(p, "庚") && hasEarth(p, chart.raw.fourPillars.hour.stem) ? pairEvidence(p) : null,
  ),
  bad("fei_gan_ge", "飞干格", "常用凶格", "天盘日干 + 地盘庚", "主自己撞上阻力、行事易碰壁；缓一步再动。", (p, chart) =>
    hasHeaven(p, chart.raw.fourPillars.day.stem) && hasEarth(p, "庚") ? pairEvidence(p) : null,
  ),
  bad("san_qi_ru_mu", "三奇入墓", "常用凶格", "天盘乙入 6/2 宫；丙入 6 宫；丁入 8 宫", "主才能被埋、有力使不出；宜换时换方。", (p) =>
    (hasHeaven(p, "乙") && (p.position === 6 || p.position === 2)) ||
    (hasHeaven(p, "丙") && p.position === 6) ||
    (hasHeaven(p, "丁") && p.position === 8)
      ? `${palaceLabel(p.position)}：天盘 ${stemsOf(p.heavenlyStem)} 入墓`
      : null,
  ),
  bad("san_qi_shou_xing", "三奇受刑", "常用凶格", "天盘丙/丁遇 1 宫或地盘壬癸；天盘乙遇 6/7 宫或地盘庚辛", "主三奇受损、好意打折；需先化解刑克。", (p) =>
    (hasHeaven(p, "丙") && (p.position === 1 || hasEarth(p, "壬", "癸"))) ||
    (hasHeaven(p, "丁") && (p.position === 1 || hasEarth(p, "壬", "癸"))) ||
    (hasHeaven(p, "乙") && (p.position === 6 || p.position === 7 || hasEarth(p, "庚", "辛")))
      ? `${palaceLabel(p.position)}：天盘 ${stemsOf(p.heavenlyStem)} 受刑`
      : null,
  ),
  bad("bei_ge", "悖格", "常用凶格", "天盘丙或地盘丙 临值符", "主事出反常、易生变数；决策留余地。", (p) =>
    isZhiFu(p) && (hasHeaven(p, "丙") || hasEarth(p, "丙")) ? pairEvidence(p) : null,
  ),
  bad("shi_gan_ru_mu", "时干入墓", "常用凶格", "天盘时干落其墓支之宫", "主此时行事被埋、难以发挥；宜改时辰。", (p, chart) => {
    const timeStem = chart.raw.fourPillars.hour.stem as string;
    const tombBranches = TOMB_MAP[timeStem] ?? [];
    const branches = valuesOf(p.earthBranch);
    return hasHeaven(p, timeStem) && tombBranches.length > 0 && branches.some((branch) => tombBranches.includes(branch))
      ? `${palaceLabel(p.position)}：天盘${timeStem}临${branches.join("/")}（墓支）`
      : null;
  }),
  bad("liu_yi_ji_xing", "六仪击刑", "常用凶格", "六仪落其刑宫", "主事与己刑、力不从心；该宫对应事项易出问题。", (p) =>
    p.liuYiJiXing?.hasJiXing
      ? `${palaceLabel(p.position)}：${p.liuYiJiXing.type ?? "六仪击刑"}${p.liuYiJiXing.description ? `（${p.liuYiJiXing.description}）` : ""}`
      : null,
  ),
  bad("men_po", "门迫", "常用凶格", "门克宫（门迫）", "主该宫事项受迫、处处掣肘；涉及此宫时留退路。", (p) =>
    p.gatePressure === "迫" ? `${palaceLabel(p.position)}：${p.gate}迫宫` : null,
  ),

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
};

export type QimenPatternReport = {
  /** 全部登记格局的判定结果。 */
  checks: QimenPatternCheck[];
  formed: QimenPatternCheck[];
  failed: QimenPatternCheck[];
  registered: number;
};

export const evaluateQimenPatterns = (chart: NormalizedQimenChart): QimenPatternReport => {
  const checks = QIMEN_PATTERN_CATALOG.map((entry): QimenPatternCheck => {
    const evidence: string[] = [];
    const positions: Position[] = [];

    if (entry.scope === "global") {
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
      group: entry.group,
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
