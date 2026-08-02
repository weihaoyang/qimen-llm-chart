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
] as const;

const normalizeSearchText = (value: string) => value.toLocaleLowerCase();

const scoreExcerpt = (excerpt: BaziClassicExcerpt, query: string) => {
  const score = excerpt.keywords.reduce(
    (total, keyword) => total + (query.includes(normalizeSearchText(keyword)) ? 3 : 0),
    0,
  );

  return score;
};

export const selectBaziClassicsContext = ({
  question,
  structuredText,
  jsonPayload,
  limit = 4,
}: {
  question: string;
  structuredText: string;
  jsonPayload: string;
  limit?: number;
}) => {
  const query = normalizeSearchText([question, structuredText, jsonPayload].join("\n"));
  const safeLimit = Math.max(1, Math.min(6, Math.floor(limit)));
  const ranked = BAZI_CLASSIC_EXCERPTS.map((excerpt, index) => ({
    excerpt,
    score: scoreExcerpt(excerpt, query),
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
