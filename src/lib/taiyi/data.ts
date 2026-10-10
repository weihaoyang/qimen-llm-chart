/**
 * 太乙神数（三式之首）基础数据。
 *
 * 来源：公共领域古籍《太乙金镜式经》（唐·王希明）与《太乙全书》一系的通行规则、
 * 十六神释义与格局条目。本仓未采用开源实现——检索到的 `taibu-core`（MIT）之
 * 「taiyi」域实为「太乙九星推演」（九星换皮），非古典太乙神数，故不采用。
 *
 * 十六神顺行次序（地盘）：子 丑 艮 寅 卯 辰 巽 巳 午 未 坤 申 酉 戌 乾 亥。
 */

export type TaiyiDeity = { position: string; name: string; month: string; meaning: string };

/** 十六神（地盘方位神），按顺行次序。 */
export const DEITIES: TaiyiDeity[] = [
  { position: "子", name: "地主", month: "建子之月", meaning: "阳气初发，万物阴生。主动摇言语事。" },
  { position: "丑", name: "阳德", month: "建丑之月", meaning: "二阳用事，布育万物。主施恩育物事。" },
  { position: "艮", name: "和德", month: "春冬将交", meaning: "阴阳气合，群物方生。主和集成就事。" },
  { position: "寅", name: "吕申", month: "建寅之月", meaning: "阳育大申，草木甲拆。主运用主宰事。" },
  { position: "卯", name: "高丛", month: "建卯之月", meaning: "万物皆出，自地丛生。主发挥事。" },
  { position: "辰", name: "太阳", month: "建辰之月", meaning: "雷出震势，阳气大盛。主危会兵革事。" },
  { position: "巽", name: "大旲", month: "春夏将交", meaning: "阳气炎皓。主申命号令事。" },
  { position: "巳", name: "大神", month: "建巳之月", meaning: "少阴用事，阴阳不测。主毁拆破废事。" },
  { position: "午", name: "大威", month: "建午之月", meaning: "阳附阴生，刑暴始行。主光明威烈事。" },
  { position: "未", name: "天道", month: "建未之月", meaning: "火能生土，土王于未。主阴私事。" },
  { position: "坤", name: "大武", month: "夏秋将交", meaning: "阴气施令，杀伤万物。主刑罚事。" },
  { position: "申", name: "武德", month: "建申之月", meaning: "万物欲死，荠麦将生。主传送迁移事。" },
  { position: "酉", name: "太簇", month: "建酉之月", meaning: "万物皆成，有大品簇。主更易肃杀事。" },
  { position: "戌", name: "阴主", month: "建戌之月", meaning: "阳气不长，阴气用事。主危期兵丧事。" },
  { position: "乾", name: "阴德", month: "秋冬将交", meaning: "阴前生阳，大有其情。主命令事。" },
  { position: "亥", name: "大义", month: "建亥之月", meaning: "万物怀垢，群阳欲尽。主计谋废弃事。" },
];

/** 八正宫（子午卯酉乾坤艮巽）；其余八位为间神。 */
export const MAIN_PALACE_POSITIONS = ["子", "午", "卯", "酉", "乾", "坤", "艮", "巽"];

export type TaiyiPalace = { palace: number; trigram: string; direction: string; element: string; gate: string; qi: string; note: string };

/** 太乙九宫（太乙行其考治而不居中宫，故实为八宫）。 */
export const PALACES: TaiyiPalace[] = [
  { palace: 1, trigram: "乾", direction: "西北", element: "金", gate: "天门", qi: "", note: "" },
  { palace: 2, trigram: "离", direction: "正南", element: "火", gate: "火门", qi: "", note: "" },
  { palace: 3, trigram: "艮", direction: "东北", element: "土", gate: "鬼门", qi: "", note: "" },
  { palace: 4, trigram: "震", direction: "正东", element: "木", gate: "日门", qi: "绝气", note: "主徐州" },
  { palace: 5, trigram: "中", direction: "中央", element: "土", gate: "—", qi: "", note: "中天之枢纽，斡旋八方，太乙行其考治而不居。" },
  { palace: 6, trigram: "兑", direction: "正西", element: "金", gate: "月门", qi: "绝气", note: "主雍州" },
  { palace: 7, trigram: "坤", direction: "西南", element: "土", gate: "人门", qi: "和", note: "主益州" },
  { palace: 8, trigram: "坎", direction: "正北", element: "水", gate: "水门", qi: "易气", note: "主兖州" },
  { palace: 9, trigram: "巽", direction: "东南", element: "木", gate: "风门", qi: "", note: "" },
];

/** 太乙行宫次序（三年一宫，二十四年一周，不入中宫）。 */
export const PALACE_SEQUENCE = [1, 2, 3, 4, 6, 7, 8, 9];

/** 阳卦四宫（乾坎艮震）为阳宫，其余为阴宫。 */
export const YANG_PALACES = [1, 3, 4, 8];

export type TaiyiGeneral = { name: string; alias: string; element: string; rule: string };

/** 太乙八将。 */
export const GENERALS: TaiyiGeneral[] = [
  { name: "太乙", alias: "北极星之象", element: "—", rule: "每宫停留三年，不入中宫，二十四年绕行八宫一周，为盘局核心，代表最高决策者与整体趋势。" },
  { name: "文昌", alias: "天目、主将之首", element: "火（荧惑之精）", rule: "主将之首，建三月旺夏三月。顺行十六神，十八年一周；阳遁数至乾、坤重留一次，阴遁数至艮、巽重留一次。" },
  { name: "始击", alias: "地目、客目", element: "土（填星之精）", rule: "以计神加于和德（艮）之上，顺行十六神，取天目所乘之位即为始击。旺四季之月。" },
  { name: "计神", alias: "岁星之使", element: "木", rule: "为二目之首、四将之源，筹度军国动静。逆行十二地支，跳过乾坤艮巽四维，十二年一周（口诀「一寅、二丑、三子」）。" },
  { name: "主大将", alias: "金神、太白之精", element: "金", rule: "由主算之个位（或除九之余数）定宫，主内部核心执行力量。与太乙同宫为「囚」。" },
  { name: "主参将", alias: "主大将之副", element: "—", rule: "由主大将宫推「三因大将，满十去之」：主大将宫 × 3 取个位。" },
  { name: "客大将", alias: "水神", element: "水", rule: "由客算之个位（或除九之余数）定宫，主外部力量之核心。" },
  { name: "客参将", alias: "客大将之副", element: "—", rule: "由客大将宫推「三因大将，满十去之」：客大将宫 × 3 取个位。" },
];

export type TaiyiPattern = { name: string; rule: string; meaning: string };

/** 格局：本仓已实现六类可确证格局。古籍另有「击/迫（内外迫）/提挟/四郭固」等，
 *  因未获可核验的完整定义而未实现（不以推测补齐）。 */
export const PATTERNS: TaiyiPattern[] = [
  { name: "杜塞", rule: "主客大小将落入中宫", meaning: "将领与统帅失去联系，被封闭孤立。不宜主动出击，只宜固守。" },
  { name: "对", rule: "文昌与太乙处于对冲之宫", meaning: "大臣怀有二心，君主疏远良将，下欺上瞒，内部离心。" },
  { name: "格", rule: "始击或客大小将与太乙对冲", meaning: "以下犯上，变乱冲突，外部力量直接挑战核心权威。" },
  { name: "掩", rule: "始击降临太乙宫位", meaning: "遮掩袭击，君弱臣强，君主被蒙蔽，身边有奸佞。" },
  { name: "囚", rule: "文昌或四将与太乙同宫", meaning: "囚禁困守，对上不利，易有奔窜败亡之变。" },
  { name: "关", rule: "主客大小将同宫", meaning: "将相不和，互相猜忌，内部防守出现隔阂。" },
];

/** 八宫对冲（洛书九宫对宫）。 */
export const OPPOSITE_PALACE: Record<number, number> = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4, 5: 5 };
