import { DEITIES, OPPOSITE_PALACE, PALACES, PALACE_SEQUENCE, type TaiyiDeity } from "./data";

/** 十六神顺行次序（地盘环）。 */
export const RING = DEITIES.map((deity) => deity.position);
const RING_INDEX: Record<string, number> = Object.fromEntries(RING.map((position, index) => [position, index]));

/** 地盘方位 → 太乙宫序（八正宫）。十六神环只含四维（乾坤艮巽）与十二支，故南=午、北=子。 */
export const POSITION_TO_PALACE: Record<string, number> = { 乾: 1, 午: 2, 艮: 3, 卯: 4, 酉: 6, 坤: 7, 子: 8, 巽: 9, 离: 2, 震: 4, 兑: 6, 坎: 8 };
export const PALACE_TO_POSITION: Record<number, string> = { 1: "乾", 2: "午", 3: "艮", 4: "卯", 6: "酉", 7: "坤", 8: "子", 9: "巽" };

/** 八正宫按十六神环顺行（地盘顺时针）：乾一、坎八、艮三、震四、巽九、离二、坤七、兑六。
 *  格局「前一宫／后一宫」据此定序——《太乙秘書》阳局 42「太乙七宫…客大将二宫内迫，客参将六宫外迫」
 *  与阳局 28「太乙二宫…客大将九宫内迫，客参将七宫外迫」互证：坤之前一宫为酉、后一宫为午。 */
export const PALACE_RING: number[] = RING.filter((position) => position in POSITION_TO_PALACE).map((position) => POSITION_TO_PALACE[position]);

/** 太乙前一辰／后一辰：十六神环上紧邻之位，恒为间神（丑寅辰巳未申戌亥）。 */
export const chenNeighbors = (position: string) => ({
  front: RING[mod(RING_INDEX[position] + 1, 16)],
  back: RING[mod(RING_INDEX[position] - 1, 16)],
});

/** 太乙前一宫／后一宫：八正宫环上紧邻之宫。 */
export const palaceNeighbors = (palace: number) => {
  const index = PALACE_RING.indexOf(palace);
  if (index < 0) return { front: palace, back: palace };
  return { front: PALACE_RING[mod(index + 1, 8)], back: PALACE_RING[mod(index - 1, 8)] };
};

/** 「挟」之左右两邻宫：正宫取八正宫环上前后各一宫（跳过间神）；间神取十六神环上前后相邻之正宫。 */
export const flankPalaces = (position: string) => {
  const index = RING_INDEX[position];
  const step = position in POSITION_TO_PALACE ? 2 : 1;
  return [RING[mod(index + step, 16)], RING[mod(index - step, 16)]].map((item) => POSITION_TO_PALACE[item]);
};

/** 阳遁/阴遁的重留方位（阳遁重留乾坤，阴遁重留艮巽）。 */
const RESERVE: Record<"阳遁" | "阴遁", string[]> = { 阳遁: ["乾", "坤"], 阴遁: ["艮", "巽"] };

const mod = (value: number, modulus: number) => {
  const remainder = value % modulus;
  return remainder < 0 ? remainder + modulus : remainder + 0;
};
const isMain = (position: string) => position in POSITION_TO_PALACE;

export type TaiyiDun = "阳遁" | "阴遁";

/**
 * 遁需人工选定：「auto」＝未选定（本仓按阳遁排出并提示）。
 *
 * 不能由局数推遁：《太乙金镜式经》卷三与《太乙秘書》皆**阳局七十二局、阴局七十二局并列**
 * （秘書阳局第一局太乙一宫、阴局第一局太乙九宫）。二者互不相推，故本仓不设自动定遁。
 */
export type TaiyiDunInput = TaiyiDun | "auto";

export type TaiyiSettings = { year: number; cycle: number; dun: TaiyiDunInput; ruJu: number | null };

export type TaiyiChart = {
  format: "qmdj-taiyi-v1";
  input: { year: number; cycle: number; dun: TaiyiDun; ruJu: number; derived: boolean; dunDefaulted: boolean };
  accumulation: { jiyear: number; eraRemainder: number; ruJu: number };
  annualGate: { name: string; yearInGate: number; yearInCycle: number };
  annualGatePalaces: Array<{ palace: number; gate: string }>;
  annualThreeGates: { status: "具" | "不具" | "未定"; taiyiGate: string; eyeGate: string | null; eyePosition: string };
  wujingReadiness: { status: "符合" | "不符合"; blockers: string[] };
  dutyGateRelation: { result: "执提" | "提格" | "未命中"; palace: number; gate: string; oppositePalace: number; oppositeGate: string };
  fixedOpenGatePalaces: Array<{ palace: number; gate: string }>;
  generalGatePalaces: { host: Array<{ palace: number; gate: string }> | null; guest: Array<{ palace: number; gate: string }> | null };
  fixedOpenCompleteness: { taiyi: GateCompleteness; host: GateCompleteness; guest: GateCompleteness };
  taibaiDutyCompleteness: { host: TaibaiGateCompleteness; guest: TaibaiGateCompleteness };
  fixedPlanEye: { yearBranch: string; combiningBranch: string; position: string; deity: TaiyiDeity };
  fixedPlan: { count: number; generalPalace: number; deputyPalace: number; gatePalaces: Array<{ palace: number; gate: string }> | null } | null;
  fixedPlanSamePalaceCandidate: { count: number; generalPalace: number; deputyPalace: number; method: string } | null;
  fixedPlanSourceComparison: { source: string; count: number; generalPalace: number; deputyPalace: number } | null;
  hostDeputySourceComparison: { source: string; diagramPalace: number; prosePalace: number; method: string } | null;
  taiyi: { palace: number; trigram: string; position: string; element: string; block: number };
  tianMu: { position: string; deity: TaiyiDeity; palace: number | null; standing: "正宫" | "间神" };
  jiShen: { position: string; deity: TaiyiDeity };
  shiJi: { position: string; deity: TaiyiDeity; palace: number | null; standing: "正宫" | "间神" };
  counts: {
    host: number;
    guest: number;
    hostGeneralPalace: number;
    guestGeneralPalace: number;
    hostSuPalace: number;
    guestSuPalace: number;
    hostParity: "奇数" | "偶数";
    guestParity: "奇数" | "偶数";
    hostHarmonyLevel: string;
    guestHarmonyLevel: string;
    hostHarmonyLevelVariant: string;
    guestHarmonyLevelVariant: string;
  };
  patterns: string[];
  cycle: TaiyiDeity[];
  disclaimer: string;
};

export type GateCompleteness = { status: "具" | "不具" | "未定" | "未排布"; taiyiGate: string | null; eyeGate: string | null; eyePosition: string };
export type TaibaiGateCompleteness = { status: "具" | "不具" | "未定" | "未排布"; startPalace: number; gates: Array<{ name: string; palace: number | null; gate: string | null }> };

/** 积年：以上元甲子为始，据《太乙金镜式经》「至唐开元十二年（724）有 1937281 积年」。 */
export const accumulatedYears = (year: number) => year + (1937281 - 724);

/** 《金镜》卷一岁计新术：240 年八门，每门 30 年；积年 1 对应开门第一年。 */
const EIGHT_GATES = ["开门", "休门", "生门", "伤门", "杜门", "景门", "死门", "惊门"];

export const annualDutyGate = (jiyear: number) => {
  if (!Number.isSafeInteger(jiyear)) throw new RangeError("积年必须为安全整数。");
  const offset = mod(mod(jiyear, 240) - 1, 240);
  return { name: EIGHT_GATES[Math.floor(offset / 30)], yearInGate: offset % 30 + 1, yearInCycle: offset + 1 };
};

/** 从太乙宫起所指定门，按八正宫环依开休生伤杜景死惊次序顺布。 */
export const taiyiEightGatePalaces = (palace: number, startGate: string) => {
  const palaceStart = PALACE_RING.indexOf(palace);
  const gateStart = EIGHT_GATES.indexOf(startGate);
  if (palaceStart < 0 || gateStart < 0) throw new RangeError("太乙宫和起门必须为八正宫及八门之一。");
  return Array.from({ length: 8 }, (_, offset) => ({
    palace: PALACE_RING[(palaceStart + offset) % 8],
    gate: EIGHT_GATES[(gateStart + offset) % 8],
  }));
};

/** 岁计直门加太乙的三门具判定；目落间神时不擅定其所属门。 */
export const annualThreeGateStatus = (gates: Array<{ palace: number; gate: string }>, taiyiPalace: number, eyePosition: string): TaiyiChart["annualThreeGates"] => {
  const taiyiGate = gates.find((item) => item.palace === taiyiPalace)?.gate;
  if (!taiyiGate) throw new RangeError("太乙宫不在门盘中。");
  const eyePalace = POSITION_TO_PALACE[eyePosition];
  const eyeGate = eyePalace === undefined ? null : gates.find((item) => item.palace === eyePalace)?.gate ?? null;
  const auspicious = ["开门", "休门", "生门"];
  const status = auspicious.includes(taiyiGate) || (eyeGate !== null && auspicious.includes(eyeGate))
    ? "不具" : eyeGate === null ? "未定" : "具";
  return { status, taiyiGate, eyeGate, eyePosition };
};

/** 《统宗宝鉴》固定开门法：太乙盘只验文昌；主客将盘还分别验太乙与文昌/始击。 */
export const fixedOpenGateCompleteness = (gates: Array<{ palace: number; gate: string }> | null, taiyiPalace: number, eyePosition: string, checkTaiyi: boolean): GateCompleteness => {
  if (!gates) return { status: "未排布", taiyiGate: null, eyeGate: null, eyePosition };
  const taiyiGate = gates.find(item => item.palace === taiyiPalace)?.gate ?? null;
  const eyePalace = POSITION_TO_PALACE[eyePosition];
  const eyeGate = eyePalace === undefined ? null : gates.find(item => item.palace === eyePalace)?.gate ?? null;
  const auspicious = ["开门", "休门", "生门"];
  const status = (checkTaiyi && taiyiGate !== null && auspicious.includes(taiyiGate)) || (eyeGate !== null && auspicious.includes(eyeGate))
    ? "不具" : eyeGate === null || (checkTaiyi && taiyiGate === null) ? "未定" : "具";
  return { status, taiyiGate, eyeGate, eyePosition };
};

/** 《太白·出师庙算》：直使加对方大将，分别检查本方目、本方大将和太乙。 */
export const taibaiDutyGateCompleteness = (startPalace: number, startGate: string, actors: Array<{ name: string; palace: number | null }>): TaibaiGateCompleteness => {
  const available = PALACE_RING.includes(startPalace);
  const gates = available ? taiyiEightGatePalaces(startPalace, startGate) : null;
  const details = actors.map(({ name, palace }) => ({ name, palace, gate: gates?.find(item => item.palace === palace)?.gate ?? null }));
  const status = !available ? "未排布" : details.some(item => item.gate !== null && ["开门", "休门", "生门"].includes(item.gate)) ? "不具"
    : details.some(item => item.gate === null) ? "未定" : "具";
  return { status, startPalace, gates: details };
};

/** 入局数：积年累除元六纪周期，再累除七十二。 */
export const ruJuNumber = (jiyear: number, cycle: number) => mod(mod(jiyear, cycle) - 1, 72) + 1;

/**
 * 太乙宫：三年一宫，二十四年一周，不入中宫。
 * 阳遁顺行（一乾、二离、三艮、四震、六兑、七坤、八坎、九巽）；
 * 阴遁逆行（起九宫，逆行至一宫）——见《太乙秘書》「阴局第一局太乙在九宫」。
 */
export const taiyiPalace = (ruJu: number, dun: TaiyiDun = "阳遁") => {
  const block = Math.max(1, Math.ceil(ruJu / 3));
  const sequence = dun === "阴遁" ? [...PALACE_SEQUENCE].reverse() : PALACE_SEQUENCE;
  return { palace: sequence[(block - 1) % 8], block };
};

/** 天目（文昌·下目·主）：入局数以十八累除；阳遁自武德起、阴遁自吕申起，顺行十六神，重留乾坤（艮巽）。 */
export const tianMuPosition = (ruJu: number, dun: TaiyiDun) => {
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

/** 计神：阳遁起吕申（寅）、阴遁起申，**逆行十二支**，跳四维，十二年一周。
 *  口诀「一寅、二丑、三子」（《太乙秘書》）、「寅鼠逆周流」（《淘金歌》）皆主逆行。 */
export const jiShenPosition = (ruJu: number, dun: TaiyiDun) => {
  const twelve = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const start = twelve.indexOf(dun === "阳遁" ? "寅" : "申");
  return twelve[mod(start - (ruJu - 1), 12)];
};

/** 始击（客目·上目·客）：以计神加于和德（艮）上，顺行十六神，取天目所乘之位。
 *  《太乙金镜式经》卷二〈推五将所主法〉：「上目者…号始击将属客」「下目者…号文昌将属主」。 */
export const shiJiPosition = (tianMu: string, jiShen: string) => {
  const offset = mod(RING_INDEX[tianMu] - RING_INDEX[jiShen], 16);
  return RING[mod(RING_INDEX["艮"] + offset, 16)];
};

/** 《太乙秘书》定计目：以太岁六合之支加太岁，视文昌下所临地盘。 */
export const fixedPlanEyePosition = (year: number, tianMu: string) => {
  if (!Number.isSafeInteger(year) || !Object.hasOwn(RING_INDEX, tianMu)) throw new RangeError("年份须为安全整数，文昌须在十六神环中。");
  const branches = "子丑寅卯辰巳午未申酉戌亥";
  const combine: Record<string, string> = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };
  const yearBranch = branches[mod(mod(year, 12) - 4, 12)];
  const combiningBranch = combine[yearBranch];
  const shift = mod(RING_INDEX[combiningBranch] - RING_INDEX[yearBranch], 16);
  return { yearBranch, combiningBranch, position: RING[mod(RING_INDEX[tianMu] - shift, 16)] };
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

/** 参将宫：「三因大将，满十去之」＝ 大将宫 × 3 取个位。
 *  验证：《太乙秘書》阳局 1（主大将 7 → 主参 1；客大将 3 → 客参 9）、
 *  阳局 22（主大将 6 → 主参 8；客大将 3 → 客参 9）均吻合。 */
export const generalSuPalace = (general: number) => (general * 3) % 10;

/**
 * 「上和／次和／下和」是**算数本身**的等第，《太乙金镜式经》卷二〈推阴阳和不和〉：
 * 「若算得十四、十八、三十三为上和，二十三、二十九、三十二为次和，十二、十六、二十七、三十四、三十八为下和。」
 * 本仓以此为主表。
 */
export const HARMONY_SUMS_JUAN2: Array<{ level: string; sums: number[] }> = [
  { level: "上和", sums: [14, 18, 33] },
  { level: "次和", sums: [23, 29, 32] },
  { level: "下和", sums: [12, 16, 27, 34, 38] },
];

/** 和数异文：《太乙秘書》〈主客算〉电子转录所列清单。
 *  上和十四、十八；次和二十三、二十九、三十二、三十六；
 *  下和十二、十六、二十一、二十七、三十四、三十八。
 *  该电子文本尚未与对应影印页核对，不能据此判定原刻用字。
 */
export const HARMONY_SUMS_VARIANT: Array<{ level: string; sums: number[] }> = [
  { level: "上和", sums: [14, 18] },
  { level: "次和", sums: [23, 29, 32, 36] },
  { level: "下和", sums: [12, 16, 21, 27, 34, 38] },
];

/** 卷二事实表：「算十一、十三、十七、十九、三十一、三十三、三十七、三十九为阳数」、
 *  「算得二十二、二十四、二十六、二十八为阴」。仅列事实，不据此下和／不和断。 */
export const YANG_NUMBERS = [11, 13, 17, 19, 31, 33, 37, 39];
export const YIN_NUMBERS = [22, 24, 26, 28];

/** 卷二原文摘句（供界面与序列化并列展示，不作判词）。 */
export const HARMONY_SOURCE =
  "《太乙金镜式经》卷二〈推阴阳和不和〉：「张良经曰：阴阳和不和者，谓太乙及上下二目就算数以相配。下目立正宫为阳，立间神为阴……若算得十四、十八、三十三为上和，二十三、二十九、三十二为次和，十二、十六、二十七、三十四、三十八为下和。」";

/** 单算之和数等第（卷二主表；未入表者作「未列」）。 */
export const harmonyLevel = (count: number) => HARMONY_SUMS_JUAN2.find((entry) => entry.sums.includes(count))?.level ?? "未列";

/** 单算之和数等第（《太乙秘書》电子转录；未入表者作未列）。 */
export const harmonyLevelVariant = (count: number) => HARMONY_SUMS_VARIANT.find((entry) => entry.sums.includes(count))?.level ?? "未列";

/** 算值奇偶（事实）。 */
export const parityLabel = (count: number): "奇数" | "偶数" => (count % 2 === 1 ? "奇数" : "偶数");

export type TaiyiPatternInput = {
  taiyiPalace: number;
  taiyiPosition: string;
  tianMuPosition: string;
  shiJiPosition: string;
  fixedPlanEyePosition?: string;
  hostGeneralPalace: number;
  guestGeneralPalace: number;
  hostSuPalace: number;
  guestSuPalace: number;
};

/** 《武经总要》以文昌不四迫、始击无掩击为门具将发，不使用八门。 */
export const wujingReadiness = (taiyiPalace: number, taiyiPosition: string, tianMuPosition: string, shiJiPosition: string, hostGeneralPalace: number): TaiyiChart["wujingReadiness"] => {
  const chens = chenNeighbors(taiyiPosition);
  const palaces = palaceNeighbors(taiyiPalace);
  const neighbors = [chens.front, chens.back, PALACE_TO_POSITION[palaces.front], PALACE_TO_POSITION[palaces.back]];
  const blockers = [
    ...(neighbors.includes(tianMuPosition) ? ["文昌四迫"] : []),
    ...(shiJiPosition === taiyiPosition ? ["始击掩太乙"] : []),
    ...(POSITION_TO_PALACE[shiJiPosition] === hostGeneralPalace ? ["始击掩主大将"] : []),
    ...(neighbors.includes(shiJiPosition) ? ["始击击太乙"] : []),
  ];
  return { status: blockers.length ? "不符合" : "符合", blockers };
};

/** 格局判据（照《太乙金镜式经》卷三诸「推…法」原文）：掩、击、迫、囚、关、格、对、
 *  四郭固、四郭杜、提挟、杜塞。宫／辰边界：太乙恒居八正宫，故「前一辰／后一辰」为十六神
 *  环上紧邻之间神，「前一宫／后一宫」为八正宫环上紧邻之宫。击用始击（上目·客）、
 *  迫用文昌（下目·主）与四将——卷二〈推五将所主法〉「上目…号始击将属客，下目…号文昌将属主」，
 *  与卷三「上目无迫」相合。 */
export const detectPatterns = (input: TaiyiPatternInput): string[] => {
  const { taiyiPalace, taiyiPosition, tianMuPosition, shiJiPosition } = input;
  const palaceOf = (position: string) => (position in POSITION_TO_PALACE ? POSITION_TO_PALACE[position] : null);
  const positionOfPalace = (palace: number) => PALACE_TO_POSITION[palace] ?? null;
  const opposite = (value: number | null, target: number) => value !== null && OPPOSITE_PALACE[target] === value;

  const tianMuPalace = palaceOf(tianMuPosition);
  const shiJiPalace = palaceOf(shiJiPosition);
  const generals = [
    { label: "主大将", palace: input.hostGeneralPalace },
    { label: "主参将", palace: input.hostSuPalace },
    { label: "客大将", palace: input.guestGeneralPalace },
    { label: "客参将", palace: input.guestSuPalace },
  ];
  const chens = chenNeighbors(taiyiPosition);
  const palaces = palaceNeighbors(taiyiPalace);
  const frontPalacePosition = PALACE_TO_POSITION[palaces.front];
  const backPalacePosition = PALACE_TO_POSITION[palaces.back];

  // 掩：始击将临太乙宫；《推掩法》另云「掩主大将」，故始击临主大将宫亦作掩。
  const yanTaiyi = shiJiPosition === taiyiPosition;
  const yanHostGeneral = shiJiPalace !== null && shiJiPalace === input.hostGeneralPalace;
  // 击：始击在太乙前一辰/后一辰（辰击）、前一宫/后一宫（宫击）
  let ji = "";
  if (shiJiPosition === chens.front) ji = "击（外辰击）：始击在太乙前一辰";
  else if (shiJiPosition === chens.back) ji = "击（内辰击）：始击在太乙后一辰";
  else if (shiJiPalace !== null && shiJiPalace === palaces.front) ji = "击（外宫击）：始击在太乙前一宫";
  else if (shiJiPalace !== null && shiJiPalace === palaces.back) ji = "击（内宫击）：始击在太乙后一宫";
  // 迫：天目（文昌·下目）与主客大小四将在太乙左右（前一辰/后一辰/前一宫/后一宫）
  const outer: string[] = [];
  const inner: string[] = [];
  const pushPo = (label: string, position: string | null) => {
    if (!position) return;
    if (position === chens.front) outer.push(`${label}在太乙前一辰`);
    else if (position === chens.back) inner.push(`${label}在太乙后一辰`);
    else if (position === frontPalacePosition) outer.push(`${label}在太乙前一宫`);
    else if (position === backPalacePosition) inner.push(`${label}在太乙后一宫`);
  };
  pushPo("天目（文昌）", tianMuPosition);
  for (const general of generals) pushPo(general.label, positionOfPalace(general.palace));
  if (input.fixedPlanEyePosition) pushPo("定计目（《太乙秘书》）", input.fixedPlanEyePosition);
  // 囚：采用局注的宽判，文昌或任一将与太乙同宫。
  const qiuActors = [
    ...(tianMuPalace === taiyiPalace ? ["天目（文昌）"] : []),
    ...generals.filter(general => general.palace === taiyiPalace).map(general => general.label),
  ];
  // 关：大小将同宫，或目与将同宫（《图书集成》阳局43文昌关主大）。
  const generalPalaces = generals.map((general) => general.palace);
  const generalsGuanGroups = Array.from(new Set(generalPalaces)).flatMap(palace => {
    const atPalace = generals.filter(general => general.palace === palace).map(general => general.label);
    return atPalace.length >= 2 ? [`${atPalace.join("、")}同在${palace}宫`] : [];
  });
  const guanActors = Array.from(new Set(generalPalaces)).flatMap(palace => {
    const atPalace = generals.filter(general => general.palace === palace).map(general => general.label);
    if (tianMuPalace === palace) atPalace.push("天目（文昌）");
    if (shiJiPalace === palace) atPalace.push("始击（客目）");
    return atPalace.length >= 2 ? [`${atPalace.join("、")}同在${palace}宫`] : [];
  });
  const guan = guanActors.length > 0;
  // 格：客目及客大小将与太乙对宫
  const geActors = [
    { label: "始击（客目）", palace: shiJiPalace },
    { label: "客大将", palace: input.guestGeneralPalace },
    { label: "客参将", palace: input.guestSuPalace },
  ].filter(actor => opposite(actor.palace, taiyiPalace)).map(actor => actor.label);
  const ge = geActors.length > 0;
  // 《金镜》取文昌；《太白》另将主大小将对太乙列为对，分明记录来源。
  const duiWenchang = opposite(tianMuPalace, taiyiPalace);
  const duiTaibai = generals.slice(0, 2).filter(actor => opposite(actor.palace, taiyiPalace)).map(actor => actor.label);
  // 提挟：太乙与主/客大将共挟某目或将（正宫取邻宫、间神取邻辰，即挟闭）
  const targets = [
    { label: "天目（文昌）", palace: tianMuPalace, position: tianMuPosition },
    { label: "始击（客目）", palace: shiJiPalace, position: shiJiPosition },
    ...generals.map((general) => ({ label: general.label, palace: general.palace, position: positionOfPalace(general.palace) })),
  ];
  const ties: string[] = [];
  for (const target of targets) {
    if (!target.position) continue;
    if (target.palace !== null && target.palace === taiyiPalace) continue;
    const pair = flankPalaces(target.position);
    for (const flanker of [generals[0], generals[2]]) {
      if (flanker.palace === taiyiPalace) continue;
      if (target.label === flanker.label || target.palace === flanker.palace) continue;
      if (pair.includes(taiyiPalace) && pair.includes(flanker.palace)) {
        ties.push(`太乙与${flanker.label}共挟${target.label}于${target.palace === null ? "间神" : "正宫"}`);
      }
    }
  }
  // 《太白兵备统宗宝鉴》亦列太乙与主目挟客、与客目挟主。
  // 这里只处理参与挟持的目落八正宫；间神作挟持方的算法另待核定。
  for (const side of [
    { eye: "天目（文昌）", palace: tianMuPalace, targets: [targets[1], targets[4], targets[5]] },
    { eye: "始击（客目）", palace: shiJiPalace, targets: [targets[0], targets[2], targets[3]] },
  ]) {
    if (side.palace === null || side.palace === taiyiPalace) continue;
    for (const target of side.targets) {
      if (!target.position) continue;
      const pair = flankPalaces(target.position);
      if (pair.includes(taiyiPalace) && pair.includes(side.palace)) {
        ties.push(`太乙与${side.eye}共挟${target.label}于${target.palace === null ? "间神" : "正宫"}（《太白》口径）`);
      }
    }
  }
  // 《太乙秘書》另列主、客大小将共挟：与李淳风「太乙与一将共挟」分开记录。
  // 只枚举对方目、对方大小将和太乙；中宫无八宫邻位，不参与。
  const pairedFlanks: string[] = [];
  for (const side of [
    { name: "主", first: input.hostGeneralPalace, second: input.hostSuPalace, targets: [targets[1], targets[4], targets[5]] },
    { name: "客", first: input.guestGeneralPalace, second: input.guestSuPalace, targets: [targets[0], targets[2], targets[3]] },
  ]) {
    if (!PALACE_RING.includes(side.first) || !PALACE_RING.includes(side.second) || side.first === side.second) continue;
    for (const target of [...side.targets, { label: "太乙", palace: taiyiPalace, position: taiyiPosition }]) {
      if (!target.position) continue;
      const pair = flankPalaces(target.position);
      if (pair.includes(side.first) && pair.includes(side.second)) {
        pairedFlanks.push(`${side.name}大小将挟${target.label}于${target.palace === null ? "间神" : "正宫"}`);
      }
    }
  }
  // 所选合象：任一目与太乙同宫，且至少两个将同宫；记录实际参与者。
  const siGuoGuEyes = [
    ...(tianMuPalace === taiyiPalace ? ["天目（文昌）"] : []),
    ...(shiJiPalace === taiyiPalace ? ["始击（客目）"] : []),
  ];
  const siGuoGu = siGuoGuEyes.length > 0 && generalsGuanGroups.length > 0;
  // 《古今图书集成》艺术典687卷阳二局例：主大小将挟太乙，客大将同太乙宫。
  // 原文的通则措辞宽泛；仅对所列盘位均吻合的例子复现，不将其外推为通则。
  const siGuoGuJichengExample = taiyiPalace === 1 && taiyiPosition === "乾" && tianMuPosition === "酉" && shiJiPosition === "戌"
    && input.hostGeneralPalace === 6 && input.hostSuPalace === 8
    && input.guestGeneralPalace === 1 && input.guestSuPalace === 3;
  // 选定合象：两组并见。主客大将同宫本身即满足本仓「关」，不是额外独立命中。
  const siGuoDu = tianMuPalace !== null && input.guestSuPalace === tianMuPalace
    && input.hostGeneralPalace === input.guestGeneralPalace;

  return [
    yanTaiyi || yanHostGeneral ? `掩：${[yanTaiyi ? "始击将临太乙宫" : "", yanHostGeneral ? "始击掩主大将" : ""].filter(Boolean).join("、")}` : "",
    ji,
    outer.length ? `迫（外迫）：${outer.join("、")}` : "",
    inner.length ? `迫（内迫）：${inner.join("、")}` : "",
    qiuActors.length ? `囚：${qiuActors.join("、")}与太乙同在${taiyiPalace}宫` : "",
    guan ? `关：${guanActors.join("；")}` : "",
    ge ? `格：${geActors.join("、")}与太乙对宫` : "",
    duiWenchang || duiTaibai.length ? `对：${[duiWenchang ? "文昌与太乙对冲（《金镜》口径）" : "", duiTaibai.length ? `${duiTaibai.join("、")}与太乙对冲（《太白》口径）` : ""].filter(Boolean).join("；")}` : "",
    siGuoGu ? `四郭固：${siGuoGuEyes.join("、")}与太乙同在${taiyiPalace}宫；${generalsGuanGroups.join("；")}` : siGuoGuJichengExample ? "四郭固：《古今图书集成》阳二局书例；主大小将挟太乙、客大将同太乙宫，按相同盘位复现，不外推通则" : "",
    siGuoDu ? "四郭杜：客参将同文昌、主大将同客大将（该将并本身亦为关）" : "",
    ties.length ? `提挟：${ties.join("、")}` : "",
    pairedFlanks.length ? `大小将挟：《太乙秘書》局注口径，${pairedFlanks.join("、")}` : "",
    generalPalaces.includes(5) ? `杜塞：${generals.filter(general => general.palace === 5).map(general => general.label).join("、")}落入中宫` : "",
  ].filter(Boolean);
};

export const buildTaiyiChart = (settings: TaiyiSettings): TaiyiChart => {
  const { year, cycle, ruJu: override } = settings;
  const jiyear = accumulatedYears(year);
  if (!Number.isSafeInteger(year) || !Number.isSafeInteger(jiyear) || !Number.isSafeInteger(cycle) || cycle <= 0) {
    throw new RangeError("年份、积年与周期必须为安全整数，周期须为正数。");
  }
  if (override !== null && (!Number.isInteger(override) || override < 1 || override > 72)) {
    throw new RangeError("入局数必须为 1 至 72 的整数。");
  }
  const eraRemainder = mod(jiyear, cycle);
  const ruJu = override ?? ruJuNumber(jiyear, cycle);
  const dunDefaulted = settings.dun === "auto";
  const dun: TaiyiDun = settings.dun === "auto" ? "阳遁" : settings.dun;
  const { palace, block } = taiyiPalace(ruJu, dun);

  const tianMuPos = tianMuPosition(ruJu, dun);
  const jiShenPos = jiShenPosition(ruJu, dun);
  const shiJiPos = shiJiPosition(tianMuPos, jiShenPos);
  const taiyiPosition = PALACE_TO_POSITION[palace];
  const host = countSum(tianMuPos, taiyiPosition);
  const guest = countSum(shiJiPos, taiyiPosition);
  const hostGeneral = generalPalace(host);
  const guestGeneral = generalPalace(guest);
  const hostSu = generalSuPalace(hostGeneral);
  const guestSu = generalSuPalace(guestGeneral);
  const tianMuPalace = isMain(tianMuPos) ? POSITION_TO_PALACE[tianMuPos] : null;
  const shiJiPalace = isMain(shiJiPos) ? POSITION_TO_PALACE[shiJiPos] : null;
  const deityOf = (position: string) => DEITIES.find((deity) => deity.position === position) ?? DEITIES[0];
  const annualGate = annualDutyGate(jiyear);
  const annualGatePalaces = taiyiEightGatePalaces(palace, annualGate.name);
  const annualThreeGates = annualThreeGateStatus(annualGatePalaces, palace, tianMuPos);
  const fixedOpenGatePalaces = taiyiEightGatePalaces(palace, "开门");
  const generalGatePalaces = {
    host: hostGeneral === 5 ? null : taiyiEightGatePalaces(hostGeneral, "开门"),
    guest: guestGeneral === 5 ? null : taiyiEightGatePalaces(guestGeneral, "开门"),
  };
  const oppositePalace = OPPOSITE_PALACE[palace];
  const oppositeGate = annualGatePalaces.find((item) => item.palace === oppositePalace)!.gate;
  const dutyGateRelation = { result: (["开门", "生门"].includes(annualGate.name) ? "执提" : ["开门", "生门"].includes(oppositeGate) ? "提格" : "未命中") as "执提" | "提格" | "未命中", palace, gate: annualGate.name, oppositePalace, oppositeGate };
  const fixedEye = fixedPlanEyePosition(year, tianMuPos);
  // 《太乙金钥匙》定目数至太乙前：同宫时终点边界尚待核，保留未计算。
  const fixedCount = fixedEye.position === taiyiPosition ? null : countSum(fixedEye.position, taiyiPosition);
  const fixedGeneral = fixedCount === null ? null : generalPalace(fixedCount);

  return {
    format: "qmdj-taiyi-v1",
    input: { year, cycle, dun, ruJu, derived: override === null, dunDefaulted },
    accumulation: { jiyear, eraRemainder, ruJu },
    annualGate,
    annualGatePalaces,
    annualThreeGates,
    wujingReadiness: wujingReadiness(palace, taiyiPosition, tianMuPos, shiJiPos, hostGeneral),
    dutyGateRelation,
    fixedOpenGatePalaces,
    generalGatePalaces,
    fixedOpenCompleteness: {
      taiyi: fixedOpenGateCompleteness(fixedOpenGatePalaces, palace, tianMuPos, false),
      host: fixedOpenGateCompleteness(generalGatePalaces.host, palace, tianMuPos, true),
      guest: fixedOpenGateCompleteness(generalGatePalaces.guest, palace, shiJiPos, true),
    },
    taibaiDutyCompleteness: {
      host: taibaiDutyGateCompleteness(guestGeneral, annualGate.name, [{ name: "太乙", palace }, { name: "文昌", palace: tianMuPalace }, { name: "主大将", palace: hostGeneral }]),
      guest: taibaiDutyGateCompleteness(hostGeneral, annualGate.name, [{ name: "太乙", palace }, { name: "始击", palace: shiJiPalace }, { name: "客大将", palace: guestGeneral }]),
    },
    fixedPlanEye: { ...fixedEye, deity: deityOf(fixedEye.position) },
    fixedPlan: fixedCount === null || fixedGeneral === null ? null : {
      count: fixedCount,
      generalPalace: fixedGeneral,
      deputyPalace: generalSuPalace(fixedGeneral),
      gatePalaces: fixedGeneral === 5 ? null : taiyiEightGatePalaces(fixedGeneral, "开门"),
    },
    fixedPlanSamePalaceCandidate: fixedCount === null ? {
      count: palace,
      generalPalace: palace,
      deputyPalace: generalSuPalace(palace),
      method: "将《图书集成》二目同宫取本宫的主客算规则推及定目；跨书推导，非古书定算同宫实例",
    } : null,
    fixedPlanSourceComparison: year === 1588 && dun === "阴遁" && ruJu === 49 && fixedEye.position === "戌" && taiyiPosition === "巽"
      ? { source: "《太乙秘书》万历戊子阴遁例", count: 25, generalPalace: 5, deputyPalace: 5 }
      : null,
    hostDeputySourceComparison: dun === "阴遁" && ruJu === 60 && palace === 6 && tianMuPos === "巳" && host === 10 && hostGeneral === 1
      ? { source: "《古今图书集成》艺术典692卷阴六十局", diagramPalace: 3, prosePalace: 2, method: "原书为时计局例；本站按相同局号对照字段，不推算时计" }
      : null,
    taiyi: { palace, trigram: PALACES.find((item) => item.palace === palace)?.trigram ?? "", position: taiyiPosition, element: PALACES.find((item) => item.palace === palace)?.element ?? "", block },
    tianMu: { position: tianMuPos, deity: deityOf(tianMuPos), palace: tianMuPalace, standing: tianMuPalace === null ? "间神" : "正宫" },
    jiShen: { position: jiShenPos, deity: deityOf(jiShenPos) },
    shiJi: { position: shiJiPos, deity: deityOf(shiJiPos), palace: shiJiPalace, standing: shiJiPalace === null ? "间神" : "正宫" },
    counts: {
      host,
      guest,
      hostGeneralPalace: hostGeneral,
      guestGeneralPalace: guestGeneral,
      hostSuPalace: hostSu,
      guestSuPalace: guestSu,
      hostParity: parityLabel(host),
      guestParity: parityLabel(guest),
      hostHarmonyLevel: harmonyLevel(host),
      guestHarmonyLevel: harmonyLevel(guest),
      hostHarmonyLevelVariant: harmonyLevelVariant(host),
      guestHarmonyLevelVariant: harmonyLevelVariant(guest),
    },
    patterns: detectPatterns({ taiyiPalace: palace, taiyiPosition, tianMuPosition: tianMuPos, shiJiPosition: shiJiPos, fixedPlanEyePosition: fixedEye.position, hostGeneralPalace: hostGeneral, guestGeneralPalace: guestGeneral, hostSuPalace: hostSu, guestSuPalace: guestSu }),
    cycle: DEITIES,
    disclaimer:
      "太乙神数研究盘：按公共领域古籍《太乙金镜式经》（唐·王希明，四库全书本）与《太乙秘書》一系规则实现（太乙三年一宫、二十四年一周不入中宫；阳遁顺行、阴遁逆行；天目以入局数十八累除、阳遁自武德起阴遁自吕申起并重留乾坤／艮巽；计神逆行十二支；始击以计神加和德顺行十六神；主客算自二目顺数正宫至太乙前一宫；大将取算之个位、参将取『三因大将满十去之』）。"
      + "**遁不由局数推出**：卷三与秘書皆阳局七十二局、阴局七十二局并列（秘書阳局第一局太乙一宫、阴局第一局太乙九宫），故本仓须人工选定遁；未选定时按阳遁排出并在界面提示（input.dunDefaulted）。"
      + "格局参考卷三及《太乙秘書》局注，囚、关采用局注的同宫宽判。「推掩法／推击法／推迫法／推囚法／推关法／推格法／推对法／推四郭固法／郭杜法／推提挟法」收掩、击、迫（内外）、囚、关、格、对、四郭固、四郭杜、提挟，另附中宫之「杜塞」；击用始击、迫用文昌与四将，并据《太乙秘书》另列定计目（卷二〈推五将所主法〉：上目号始击属客、下目号文昌属主，与卷三「上目无迫」相合）。"
      + "「前一宫／后一宫」按八正宫环（乾一坎八艮三震四巽九离二坤七兑六）定序，「前一辰／后一辰」按十六神环紧邻之间神定序。"
      + "四郭固、四郭杜取所列合象读法；四郭杜中主客大将同宫本身已满足本站的关，并非另证其他格局。提挟依李淳风说以「太乙与主/客大将共为某目/将之左右邻宫」为判据（二目临间神者即挟闭）；另据《太白》列太乙与正宫主目挟客、客目挟主。另列《太乙秘書》主或客大小将共挟对方目、对方大小将或太乙，按八正宫邻位（间神取相邻正宫）计算；其他组合未穷举。岁计直门加太乙与开门加太乙分别列示；主客大将以开门加将宫，落中宫时标八门杜而不擅自寄宫。执提仅列岁计直门加太乙的一种图示口径，不代表全部传本；840年执提记载此法未命中。"
      + "和数只列事实、不下判词：算值、奇偶、所立正宫／间神，并按卷二〈推阴阳和不和〉列「上和十四、十八、三十三；次和二十三、二十九、三十二；下和十二、十六、二十七、三十四、三十八」。卷二与《太乙秘書》《太乙統宗寶鑑》《淘金歌》一系的和数清单不同（后者次和另含三十六、下和另含二十一、上和无三十三），且两书局注互相矛盾（如秘書阳局 1「客算十三和」与卷三立成同局「十三〈不和〉」），同篇不合判据又含太乙宫、二目所立、算奇偶等多维（卷二另有『八三四九为阳宫、二七六一为阴宫』，与乾坎艮震为阳之常义相异），故本仓不输出和／不和与长／短判词。"
      + "已用《太乙秘書》阳局 1–24、阴局 1–12（共 36 局）逐局回归，字段以秘書原文为准、与卷三立成互校，秘書讹误或缺漏之字段在用例中具名跳过并注明（详见 mishu-corpus.ts）。"
      + "《太乙金镜式经》卷一岁计周纪取 360 年，本站默认沿用。365 为对照参数；起元另有异说，故入局数可覆盖。仅供研究，不构成预测或现实裁决。",
  };
};
