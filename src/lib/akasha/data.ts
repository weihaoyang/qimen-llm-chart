/**
 * 阿卡西记录（Akashic Records）与全息宇宙模型（Holographic Universe）的概念对照表。
 *
 * 说明（重要）：
 * - 阿卡西记录**不是**可计算的术数体系：没有排盘规则、没有可复现的推算口径，各家
 *   说法亦不一致。故本仓**不提供任何「读取」**，只把该概念的来源、分期、现代实践
 *   被记载的做法与伦理边界整理为知识条目。
 * - 全息宇宙模型包含**可计算**的物理（面积律、Bekenstein–Hawking 熵、Bekenstein
 *   界、全息碎片重建、自相似分形维数），见 `./holography`。
 * - 二者在流行文献中常被类比，本表把「类比」与「物理」分开标注。
 */

export type ConceptEntry = { term: string; zh: string; tradition: string; period: string; note: string };

/** 阿卡西：词源、传统与分期。 */
export const AKASHA_CONCEPTS: ConceptEntry[] = [
  { term: "Ākāśa", zh: "空 · 以太", tradition: "印度哲学（吠檀多、正理派、数论）", period: "约公元前 8–前 3 世纪", note: "五大（地水火风空）之一，指「空」或「以太」，是声音与空间的基质，本身不是「记录」。" },
  { term: "Ākāśic Records", zh: "阿卡西记录", tradition: "神智学（Theosophy）", period: "1875 年起；1888《秘密教义》", note: "布拉瓦茨基把「阿卡夏」引申为星光界中的「宇宙记忆」：一切事件、思想与情感在其中留下不可磨灭的痕迹。" },
  { term: "Astral Light", zh: "星光 · 宇宙记忆", tradition: "西方神秘学（Éliphas Lévi 等）", period: "19 世纪中", note: "与阿卡西记录常被视为同义或近义；记录被描述为可由具备相应能力者「读取」。" },
  { term: "Book of Life", zh: "生命之书", tradition: "亚伯拉罕宗教与神秘学交叉", period: "古代—近代", note: "「记录一切行为」的意象来源之一，现代阿卡西话语常与「灵魂的档案」混用。" },
  { term: "Edgar Cayce", zh: "凯西「阿卡西阅读」", tradition: "美国新时代运动", period: "1901–1944", note: "以进入出神状态后描述「记录」著称；其内容属个人声称，无法独立复现或验证。" },
  { term: "Akashic Field", zh: "阿卡西场", tradition: "系统科学 · E. Laszlo", period: "2004（《科学与阿卡西场》）", note: "把阿卡西重述为「宇宙信息场」，与量子真空/零点场类比；属思辨性假说，不是主流物理结论。" },
  { term: "Path Prayer", zh: "路径祈请 · 现代实践", tradition: "当代阿卡西教学（如 Linda Howe 一系）", period: "2000 年代起", note: "以固定祈请词进入「记录」：设界、致意、提问、记录、收束。该做法为文献对该实践的描述，本仓不复述祈请词、也不声称可进入。" },
];

/** 现代实践被记载的步骤（描述性，非本仓能力）。 */
export const AKASHA_PROTOCOL = [
  { step: "设界与祈请", note: "以固定祷词声明只连接「最高善」的层面；文献强调先设边界。" },
  { step: "提出许可", note: "声称只查阅与自身有关的记录；涉及他人时需其同意（伦理条目之一）。" },
  { step: "三层提问", note: "常见描述为：事实层（发生了什么）→ 情绪层（当时如何感受）→ 选择层（当时的选择与今天的自由）。" },
  { step: "记录与核对", note: "记录后与可验证的经历核对，把无法核对的部分标注为象征而非事实。" },
  { step: "收束与落地", note: "以具体、低风险、可复盘的行动收尾；不据此做医疗、法律或财务决定。" },
];

/** 伦理与边界（本仓的硬约束）。 */
export const AKASHA_ETHICS = [
  "不对他人做未经同意的「阅读」；不代替他人做决定。",
  "不作医疗、心理、法律或财务诊断或建议。",
  "不把「记录内容」当作事实：不可核对的叙述一律标注为象征或自省材料。",
  "不用来预言事件、寿命、婚配或命运。",
  "与典籍、师承、收费等现实信息分离判断；本仓不提供任何读取服务。",
];

/** 时间线。 */
export const AKASHA_TIMELINE: Array<[string, string]> = [
  ["约前 800–前 500", "奥义书时代：ākāśa 作为「空」进入五大体系。"],
  ["1875", "神智学会成立，阿卡西记录概念成型。"],
  ["1888", "《秘密教义》系统化「宇宙记忆」的叙述。"],
  ["19 世纪中", "西方神秘学的「星光」与阿卡西话语合流。"],
  ["1901–1944", "凯西的「阅读」使该概念在英语世界流行。"],
  ["1971–1980", "Pribram 的全息脑假说与 Bohm 的隐卷序出版。"],
  ["1991", "Talbot《全息宇宙》把物理隐喻推向大众。"],
  ["1993–1995", "'t Hooft 与 Susskind 提出全息原理。"],
  ["2004", "Laszlo《科学与阿卡西场》把阿卡西重述为信息场。"],
];

/** 全息宇宙模型：概念与可计算性标注。 */
export const HOLOGRAM_CONCEPTS: Array<{ term: string; zh: string; period: string; computed: string; note: string }> = [
  { term: "Hologram", zh: "全息图", period: "1948（Gabor）", computed: "可算：碎片重建与分辨率", note: "记录干涉条纹；任一片段仍可重建整体，但分辨率随碎片面积下降。这是「部分含整体」最直接的物理实例。" },
  { term: "Implicate / Explicate Order", zh: "隐卷序 / 显卷序", period: "1980（Bohm）", computed: "不可算（哲学）", note: "显卷序是展开的现象，隐卷序是卷入的全体；Bohm 用全息类比说明「部分卷入整体」。" },
  { term: "Holonomic Brain", zh: "全息脑假说", period: "1971（Pribram）", computed: "不可算（假说）", note: "记忆以分布式干涉模式存储，故局部损伤不导致局部记忆缺失。" },
  { term: "Holographic Principle", zh: "全息原理", period: "1993–1995（'t Hooft, Susskind）", computed: "可算：面积律与熵", note: "一个区域内的全部自由度可编码在其边界上，信息量正比于**面积**（每 4 个普朗克面积 1 比特），而非体积。" },
  { term: "Bekenstein–Hawking Entropy", zh: "贝肯斯坦–霍金熵", period: "1973–1974", computed: "可算", note: "S = k_B A /(4 l_P²)，黑洞熵只由视界面积决定。" },
  { term: "Bekenstein Bound", zh: "贝肯斯坦界", period: "1981", computed: "可算", note: "S ≤ 2π k_B R E /(ħ c)：给定半径与能量时的信息上限（以 S/k_B 计为 nat，换算比特需再除以 ln2）。" },
  { term: "AdS/CFT", zh: "反德西特/共形场对应", period: "1997（Maldacena）", computed: "不可算（本仓未实现）", note: "全息原理最具体的实现：d 维引力 ↔ (d−1) 维边界场论。" },
  { term: "It from Qubit", zh: "由量子比特生成时空", period: "2013 起", computed: "不可算（研究方向）", note: "时空几何被猜想由边界纠缠结构涌现；仍属研究前沿。" },
  { term: "Self-similarity", zh: "自相似 · 分形", period: "1975（Mandelbrot）", computed: "可算：盒计数维数", note: "缩放下重复自身，是「部分含整体」的几何版本。" },
];

/** 常见类比（须与物理分开）。 */
export const ANALOGY_NOTES = [
  "「阿卡西记录 = 全息图」是流行文献的**类比**：全息图是一种可算的物理对象，阿卡西记录不是。",
  "「每个碎片含全体」只在**记录干涉条纹**的意义上成立，且分辨率下降；不能据此推出「个人能读取全体历史」。",
  "面积律说的是「某区域的信息可由边界编码」，与「宇宙保存一切事件的影像」不是同一命题。",
];

/** 典型质量（kg），用于对照。 */
export const MASS_PRESETS: Array<{ label: string; massKg: number }> = [
  { label: "质子", massKg: 1.67262192369e-27 },
  { label: "人（70 kg）", massKg: 70 },
  { label: "地球", massKg: 5.9722e24 },
  { label: "太阳", massKg: 1.98847e30 },
  { label: "观测宇宙", massKg: 1.5e53 },
];

/** 自相似分形维数（解析值，用于演示缩放下的「部分含整体」）。 */
export const FRACTALS: Array<{ name: string; zh: string; copies: number; ratio: number; dimension: number; note: string }> = [
  { name: "Cantor set", zh: "康托集", copies: 2, ratio: 3, dimension: Math.log(2) / Math.log(3), note: "每次去中间三分之一。" },
  { name: "Koch curve", zh: "科赫曲线", copies: 4, ratio: 3, dimension: Math.log(4) / Math.log(3), note: "每次把每段替换为四段。" },
  { name: "Sierpinski triangle", zh: "谢尔宾斯基三角", copies: 3, ratio: 2, dimension: Math.log(3) / Math.log(2), note: "每次把三角形替换为三个半尺寸三角形。" },
  { name: "Sierpinski carpet", zh: "谢尔宾斯基地毯", copies: 8, ratio: 3, dimension: Math.log(8) / Math.log(3), note: "正方形留八去一。" },
  { name: "Menger sponge", zh: "门格海绵", copies: 20, ratio: 3, dimension: Math.log(20) / Math.log(3), note: "立方体留二十去七。" },
];
