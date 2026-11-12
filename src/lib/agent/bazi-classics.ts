// Site-authored summaries of classical topics, with links to readable editions.
const YUANHAI_SOURCE = "https://www.chinese-classics.org/read/shushu/mingli/yuan-hai-zi-ping/001";
const SANMING_SOURCE = "https://zh.wikisource.org/zh-hant/三命通會/卷二";

export type BaziClassicSummary = {
  id: string;
  sourceBook: string;
  sourceUrl: string;
  section: string;
  keywords: readonly string[];
  summary: string;
  /** Our modern editor's note. Must never be cited as classical text. */
  editorial?: string;
};

export const BAZI_CLASSIC_SUMMARIES: readonly BaziClassicSummary[] = [
  {
    id: "yuanhaiziping-wuxing-shengke",
    sourceBook: "《渊海子平》",
    sourceUrl: YUANHAI_SOURCE,
    section: "论五行生剋制化",
    keywords: ["五行", "生克", "生剋", "制化", "通关", "强弱", "身旺", "身弱"],
    summary: "生克的效果取决于五行在具体盘中的强弱。一行偏旺时，可以比较制约它的力量与泄导它的力量。",
  },
  {
    id: "yuanhaiziping-rizhu-yueling",
    sourceBook: "《渊海子平》",
    sourceUrl: YUANHAI_SOURCE,
    section: "论日为主、论月令",
    keywords: ["日主", "日干", "月令", "提纲", "十神", "格局", "身旺", "身弱", "四柱"],
    summary: "分析以日干为中心，用月令确定时令背景，再考察其余柱位的五行和结构。",
  },
  {
    id: "yuanhaiziping-dayun",
    sourceBook: "《渊海子平》",
    sourceUrl: YUANHAI_SOURCE,
    section: "论大运",
    keywords: ["大运", "岁运", "流年", "起运", "运势", "时间", "十年"],
    summary: "大运以月柱为排列起点。考察运与岁时，应结合原局格局和相互生克，单个冲合不足以确定解释。",
  },
  {
    id: "yuanhaiziping-zhengcai",
    sourceBook: "《渊海子平》",
    sourceUrl: YUANHAI_SOURCE,
    section: "论正财",
    keywords: ["财", "财星", "正财", "偏财", "财富", "财务", "收入", "比劫"],
    summary: "财星的判断要同时看得令程度与日主承受力。财多和能承财是两个条件，也须留意比劫和印绶的作用。",
  },
  {
    id: "yuanhaiziping-zhengguan-qisha",
    sourceBook: "《渊海子平》",
    sourceUrl: YUANHAI_SOURCE,
    section: "正官论、论七杀",
    keywords: ["官", "官星", "正官", "七杀", "偏官", "事业", "职位", "权力", "制伏"],
    summary: "正官的取用重视月令与印绶，也看官星是否受冲刑。偏官是否有用，取决于日主力量以及全盘有无相应制伏或配合。",
    editorial: "七杀的吉凶还须看身旺身弱、制伏与岁运的配合。",
  },
  {
    id: "yuanhaiziping-shangguan",
    sourceBook: "《渊海子平》",
    sourceUrl: YUANHAI_SOURCE,
    section: "论伤官",
    keywords: ["伤官", "食伤", "才艺", "表达", "输出", "官星", "财星"],
    summary: "伤官与官星相见时，先查二者在原局的强弱和位置，再看财星等成分是否改变两者关系。",
  },
  {
    id: "yuanhaiziping-shishen",
    sourceBook: "《渊海子平》",
    sourceUrl: YUANHAI_SOURCE,
    section: "论食神",
    keywords: ["食神", "食伤", "才艺", "表达", "产出", "子息", "寿"],
    summary: "食神可作为日主生财的中间环节。判断时看日主是否有力、食神是否受制、财星是否承接。",
  },
  {
    id: "yuanhaiziping-yinshou",
    sourceBook: "《渊海子平》",
    sourceUrl: YUANHAI_SOURCE,
    section: "论印綬",
    keywords: ["印", "印绶", "印綬", "学习", "学历", "父母", "资源", "官印"],
    summary: "印星是生助日主的五行。可考察官能否生印，以及财对印的制约，并结合印所在的柱位。",
  },
  {
    id: "yuanhaiziping-yangren",
    sourceBook: "《渊海子平》",
    sourceUrl: YUANHAI_SOURCE,
    section: "论阳刃",
    keywords: ["阳刃", "羊刃", "刃", "七杀", "魁罡", "冲", "刑", "合"],
    summary: "阳刃的作用取决于原局强弱和与官杀的关系，查看有无制衡后再结合岁运分析。",
  },
  {
    id: "sanming-wuxing-wangshu",
    sourceBook: "《三命通会》",
    sourceUrl: SANMING_SOURCE,
    section: "论五行旺相休囚死并寄生十二宫",
    keywords: ["五行", "月令", "季节", "旺相", "休囚", "十二长生", "调候", "寒暖", "燥湿"],
    summary: "按季节区分五行的旺、相、休、囚、死。春木当令，火因木生而居相；夏、秋、冬各有相应变化。十二长生另按起点和顺序计算。",
  },
  {
    id: "sanming-dayun",
    sourceBook: "《三命通会》",
    sourceUrl: SANMING_SOURCE,
    section: "论大运",
    keywords: ["大运", "起运", "顺逆", "岁运", "用神", "流年", "十年"],
    summary: "大运顺逆由年干阴阳与性别配合。顺排向出生后的节令计距，逆排向出生前计距，解释时再比较运与本命。",
  },
  {
    id: "sanming-taisui",
    sourceBook: "《三命通会》",
    sourceUrl: SANMING_SOURCE,
    section: "论太岁",
    keywords: ["流年", "太岁", "岁君", "当年", "今年", "明年", "时间", "触发"],
    summary: "该篇将太岁作为流年的参照，比较它与大运、日主及原局之间的关系。同一种冲克还要结合其他组合分析。",
    editorial: "若五行有救、四柱有情，仍须结合原局与行运详审，不可只凭流年一字作断。",
  },
] as const;

const normalizeSearchText = (value: string) => value.toLocaleLowerCase();

const scoreText = (excerpt: BaziClassicSummary, text: string, weight: number) =>
  excerpt.keywords.reduce(
    (total, keyword) =>
      total + (text.includes(normalizeSearchText(keyword)) ? weight : 0),
    0,
  );

const scoreExcerpt = (
  excerpt: BaziClassicSummary,
  {
    question,
    structuredText,
    jsonPayload,
  }: {
    question: string;
    structuredText: string;
    jsonPayload: string;
  },
) =>
  // The user's explicit angle is the strongest signal. Serialized chart data
  // still helps when the question is broad, but its boilerplate must not drown
  // out a focused request such as "只分析事业" or "只看调候".
  scoreText(excerpt, normalizeSearchText(question), 10) +
  scoreText(excerpt, normalizeSearchText(structuredText), 2) +
  scoreText(excerpt, normalizeSearchText(jsonPayload), 1);

export const selectBaziClassicsContext = ({
  question,
  structuredText,
  jsonPayload,
  limit = 3,
}: {
  question: string;
  structuredText: string;
  jsonPayload: string;
  limit?: number;
}) => {
  const safeLimit = Math.max(1, Math.min(6, Math.floor(limit)));
  const ranked = BAZI_CLASSIC_SUMMARIES.map((excerpt, index) => ({
    excerpt,
    score: scoreExcerpt(excerpt, { question, structuredText, jsonPayload }),
    index,
  })).sort((left, right) => right.score - left.score || left.index - right.index);

  const selected = ranked.slice(0, safeLimit);
  return [
    "以下为本站撰写的古籍主题概述。引用时只能表述为「据《书名·篇目》大意」。",
    "禁止把概述当作逐字原文引用；「编者按」是本仓现代说明，绝不可挂上书名或篇目引用。",
    "说明传统规则如何对应当前盘面，保持概述与当前盘面事实的区分。",
    ...selected.map(({ excerpt }) =>
      [
        `【${excerpt.sourceBook}｜${excerpt.section}｜本站概述｜${excerpt.sourceUrl}】`,
        excerpt.summary,
        excerpt.editorial ? `编者按（本仓现代说明，非原文，禁止作为古籍引用）：${excerpt.editorial}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ].join("\n\n");
};
