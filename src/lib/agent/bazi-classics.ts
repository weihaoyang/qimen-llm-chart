/**
 * Short, verbatim excerpts carried over from the original Quantum Bazi
 * corpus. They are intentionally curated instead of bundling the whole book
 * collection into every request. The model receives the source and section so
 * it can distinguish quoted material from its own interpretation.
 */
export type BaziClassicExcerpt = {
  id: string;
  sourceBook: string;
  sourceFile: string;
  section: string;
  keywords: readonly string[];
  text: string;
};

export const BAZI_CLASSIC_EXCERPTS: readonly BaziClassicExcerpt[] = [
  {
    id: "yuanhaiziping-wuxing-shengke",
    sourceBook: "《渊海子平》",
    sourceFile: "八字 - 渊海子平.txt",
    section: "论五行生剋制化",
    keywords: ["五行", "生克", "生剋", "制化", "通关", "强弱", "身旺", "身弱"],
    text:
      "金旺得火，方成器皿；火旺得水，方成相济；水旺得土，方成池沼；土旺得木，方能疏通；木旺得金，方成栋樑。\n强金得水，方挫其锋；强水得木，方泄其势；强木得火，方化其顽；强火得土，方止其燄；强土得金，方制其害。",
  },
  {
    id: "yuanhaiziping-rizhu-yueling",
    sourceBook: "《渊海子平》",
    sourceFile: "八字 - 渊海子平.txt",
    section: "论日为主、论月令",
    keywords: ["日主", "日干", "月令", "提纲", "十神", "格局", "身旺", "身弱", "四柱"],
    text:
      "取日干为主，以年为根，以月为苗，以日为花，以时为果；以生旺死绝休囚制化，决人生休咎。\n以日为主，年为本，月为提纲，时为辅佐。大要看日加临于甚度，或身旺、身弱；又看地支有何格局，金木水火土之数；后看月令中何者旺，又看岁运有何旺。",
  },
  {
    id: "yuanhaiziping-dayun",
    sourceBook: "《渊海子平》",
    sourceFile: "八字 - 渊海子平.txt",
    section: "论大运",
    keywords: ["大运", "岁运", "流年", "起运", "运势", "时间", "十年"],
    text:
      "子平之法，大运看支，岁君看干，交运同接木。月令者，天元也，今运就月上起；月之用神，则知其格。\n此乃死法譬喻，须随格局喜忌推之，不可执一；妙在识其通变。大运不宜与太岁相剋、相冲者凶，更刑、冲、相剋者亦忌；岁运相生者吉。",
  },
  {
    id: "yuanhaiziping-zhengcai",
    sourceBook: "《渊海子平》",
    sourceFile: "八字 - 渊海子平.txt",
    section: "论正财",
    keywords: ["财", "财星", "正财", "偏财", "财富", "财务", "收入", "比劫"],
    text:
      "故财要得时，不要财多。若财多则自家日主有力，可以胜任。力不任财，祸患百出；或中年、末年复临父母之乡，或三合可以助我者，则勃然而兴。\n财多生官，要须身健。财多盗气，本自身柔；又云正财者喜身旺、印綬，忌官星、忌倒食、忌身弱、比肩劫财。",
  },
  {
    id: "yuanhaiziping-zhengguan-qisha",
    sourceBook: "《渊海子平》",
    sourceFile: "八字 - 渊海子平.txt",
    section: "正官论、论七杀",
    keywords: ["官", "官星", "正官", "七杀", "偏官", "事业", "职位", "权力", "制伏"],
    text:
      "大抵要行官旺乡，月令是也。月令者，提纲也。看命先看提纲，方看其馀。正官乃贵气之物，大忌刑冲破害；又曰喜身旺、印綬。\n七杀者，亦名偏官，喜身旺合杀、喜制伏、喜阳刃；忌身弱、忌见财，生忌无制。七杀不可便言凶，须看身旺身弱、制伏和岁运。",
  },
  {
    id: "yuanhaiziping-shangguan",
    sourceBook: "《渊海子平》",
    sourceFile: "八字 - 渊海子平.txt",
    section: "论伤官",
    keywords: ["伤官", "食伤", "才艺", "表达", "输出", "官星", "财星"],
    text:
      "伤官务要伤尽；伤之不尽，官来乘旺，其祸不可胜言。伤官见官，为祸百端。\n伤官者，我生彼之谓也，亦名盗气。若伤官不尽，四柱有官星露，岁运若见官星；如遇伤官者，须见其财为妙，是财能生官也。",
  },
  {
    id: "yuanhaiziping-shishen",
    sourceBook: "《渊海子平》",
    sourceFile: "八字 - 渊海子平.txt",
    section: "论食神",
    keywords: ["食神", "食伤", "才艺", "表达", "产出", "子息", "寿"],
    text:
      "食神者，生我财神之谓也。恒不喜见官星，忌倒食，恐伤其食神；喜财神相生。却喜身旺，不喜印綬，亦恐伤其食神也；如运得地，方可发福。\n食神有气胜财官，先要他强旺本干；若是反伤来夺食，忙忙辛苦祸千般。",
  },
  {
    id: "yuanhaiziping-yinshou",
    sourceBook: "《渊海子平》",
    sourceFile: "八字 - 渊海子平.txt",
    section: "论印綬",
    keywords: ["印", "印绶", "印綬", "学习", "学历", "父母", "资源", "官印"],
    text:
      "所谓印？生我者，即印綬也。印綬畏财，财能反伤我；喜官星生印，忌财旺破印。\n大凡月与时上见者为妙，而月上最为紧要。如带印綬，须带官星，谓之官印两全；若用官不显，用印綬为妙。",
  },
  {
    id: "yuanhaiziping-yangren",
    sourceBook: "《渊海子平》",
    sourceFile: "八字 - 渊海子平.txt",
    section: "论阳刃",
    keywords: ["阳刃", "羊刃", "刃", "七杀", "魁罡", "冲", "刑", "合"],
    text:
      "如命中有刃，不可便言凶，大率与七杀相似。喜偏官七杀，喜印綬；大要身旺，运行身旺之乡；不要见伤官、刃旺运。\n若命有刃无杀，岁运逢杀旺之乡，乃转生而反成厚福；如伤官财旺，身弱杀旺，最可忌也。",
  },
  {
    id: "sanming-wuxing-wangshu",
    sourceBook: "《三命通会》",
    sourceFile: "八字 - 三命通会.txt",
    section: "论五行旺相休囚死并寄生十二宫",
    keywords: ["五行", "月令", "季节", "旺相", "休囚", "十二长生", "调候", "寒暖", "燥湿"],
    text:
      "盛德乘时曰旺。如春木旺，旺则生火，火乃木之子，子乘父业，故火相；木用水生，生我者父母，今子嗣得时，而生我者当知退矣，故水休。\n夏火旺，火生土则土相；秋金旺，金生水则水相；冬水旺，水生木则木相。四时之序，节满即谢，五行之性，功成必复。",
  },
  {
    id: "sanming-dayun",
    sourceBook: "《三命通会》",
    sourceFile: "八字 - 三命通会.txt",
    section: "论大运",
    keywords: ["大运", "起运", "顺逆", "岁运", "用神", "流年", "十年"],
    text:
      "探命之说先以三元、四柱、五行、生死、格局致合以定根基，然后考究运气，协而从之以定平生之吉凶。阳男阴女，大运以生日后未来节气日时为数，顺而行之；阴男阳女，以生日前过去节气日时为数，逆而行之。\n凡行运，在干兼用地支之神，在支则弃天干之物。用神者欲运生之；弱欲运引进旺乡；官欲运生，不欲运伤；财欲运扶，不欲运劫。",
  },
  {
    id: "sanming-taisui",
    sourceBook: "《三命通会》",
    sourceFile: "八字 - 三命通会.txt",
    section: "论太岁",
    keywords: ["流年", "太岁", "岁君", "当年", "今年", "明年", "时间", "触发"],
    text:
      "其逐年太岁游行十二宫，定一年之祸福，为四时之吉凶。盖太岁如君也，大运如臣也；如君臣和悦，其年则吉，若值刑战，其年则凶。\n若五行有救，四柱有情，仍须结合原局、行运和具体干支关系详审，不可只凭流年一个字作断。",
  },
] as const;

const normalizeSearchText = (value: string) => value.toLocaleLowerCase();

const scoreText = (excerpt: BaziClassicExcerpt, text: string, weight: number) =>
  excerpt.keywords.reduce(
    (total, keyword) =>
      total + (text.includes(normalizeSearchText(keyword)) ? weight : 0),
    0,
  );

const scoreExcerpt = (
  excerpt: BaziClassicExcerpt,
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
  const ranked = BAZI_CLASSIC_EXCERPTS.map((excerpt, index) => ({
    excerpt,
    score: scoreExcerpt(excerpt, { question, structuredText, jsonPayload }),
    index,
  })).sort((left, right) => right.score - left.score || left.index - right.index);

  const selected = ranked.slice(0, safeLimit);
  return [
    "以下是原始项目古籍语料中的短篇原文摘录，只作为传统理论的参考证据：",
    "不要把摘录中的古代断语直接改写成现代确定事件；引用时标明书名和篇目，并说明它如何对应当前盘面。",
    ...selected.map(
      ({ excerpt }) =>
        [`【${excerpt.sourceBook}｜${excerpt.section}｜原始语料：${excerpt.sourceFile}】`, excerpt.text].join("\n"),
    ),
  ].join("\n\n");
};
