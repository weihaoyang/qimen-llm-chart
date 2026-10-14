/**
 * 出处与原文登记册（供前端「出处与原文」区块查阅）。
 *
 * 纪律（与仓库的第三方声明同一条线）：
 * 1. 只登记**真实存在**的出处；逐字引文尽量照抄原文，不做现代化改写。
 * 2. 凡本仓采用但未取得一手核对者，标 `未核`；凡古籍/实现之间有分歧者，标 `异说` 并**并列**；
 *    凡无外部出处的本仓启发式，标 `本仓自撰`，不得当古典依据。
 * 3. 本文件只放**引文与出处**，不放本仓的实现结论；实现结论见各体系代码与免责声明。
 * 4. 「材料本体」（整段原文、整表数值、源码行）**不放在本文件**：它们按体系拆到
 *    `src/lib/provenance/materials/*`，只有读者展开「出处与原文」或打开「资料库」时才按需载入。
 *    本文件只保留元数据与短引文（`quote` / `details` / `note`）——因此首屏不再打包全部原文。
 */
import type { ProvenanceEntry } from "./types";

export const PROVENANCE: readonly ProvenanceEntry[] = [
  /* ───────────────────────── 太乙神数 ───────────────────────── */
  {
    id: "taiyi-jingshu-juan3-patterns",
    system: "taiyi-shenshu",
    kind: "古籍原文",
    status: "已核",
    title: "格局原文：掩 / 击 / 迫 / 囚 / 关 / 格 / 对 / 四郭固 / 四郭杜 / 提挟",
    citation: "《太乙金鏡式經》卷三（唐·王希明，四庫全書本）推掩法·推撃法·推迫法·推囚法·推闗法·推格法·推對法·推四郭固法·郭杜法·推執提法·推提挾法",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/太乙金鏡式經_(四庫全書本)/卷03",
    quote:
      "撃法：「太乙所在宫，客目在太乙前一辰為前擊，在太乙後一辰為後撃；在太乙前一宫為外宫擊，在太乙後一宫為内宫撃。」／迫法：「前為外迫，後為内迫，為上下二目、主客大小四将在太乙左右為迫。王希明曰：上目無迫，若下目在太乙前一辰為外辰迫，在後一辰為内辰迫，在太乙前一宫為外宫迫，後一宫為内宫迫。宫迫災㣲緩，辰迫災急疾。」／四郭固：「文昌將囚太乙宫，至大將參將又相闗，或客目臨之，或客大小將相闗，皆四郭固也。」／四郭杜：「為客參將與文昌將并，主大將與客大將并，兼之掩迫關格提挾。」／提挟（李淳風）：「客主兩将或一将而共太乙，挟客主目或大小將扵正宫者為提挟；若客主二目臨間神，客主二將共太乙挟二目扵間神，謂之挟閉。自一至四為内宫……自九至六為外宫。」",
    note:
      "本仓 11 类格局的判据逐条照此实现。「提挟」的几何（左右邻宫／邻辰）为依《太乙秘書》岁计算例反推，非原文显式定义；「执提」以开/生二门合冲为断，本仓未排八门，故未实现。",
  },
  {
    id: "taiyi-harmony-lists",
    system: "taiyi-shenshu",
    kind: "古籍原文",
    status: "已核",
    title: "和数（上和 / 次和 / 下和）",
    citation: "《太乙金鏡式經》卷二·推陰陽和不和",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/太乙金鏡式經_(四庫全書本)/卷02",
    quote: "若筭得十四、十八、三十三為上和，二十三、二十九、三十二為次和，十二、十六、二十七、三十四、三十八為下和。",
    note: "本仓按**算值**查此表（不是「主客两算俱和」那类合成口径）。",
  },
  {
    id: "taiyi-harmony-variant",
    system: "taiyi-shenshu",
    kind: "异说",
    status: "异说",
    title: "和数异文（另一系清单，出处待考）",
    citation: "另一系和数清单（本仓独立核查**未**在维基文库《太乙秘書》全文与《金鏡式經》卷二/卷三中找到，故不归属任何书名）",
    license: "待考",
    url: "https://zh.wikisource.org/wiki/太乙秘書",
    quote:
      "该系作：上和 十四、十八；次和 二十三、二十九、三十二、三十六；下和 十二、十六、二十一、二十七、三十四、三十八。（与卷二相比：卷二「三十三」为上和而无「三十六」；卷二无「二十一」。）",
    note:
      "本仓主表用卷二（已一手核对）。此异文清单**出处待考**：独立核查在维基文库《太乙秘書》全文与《金鏡式經》卷二/卷三中均未找到该清单，故本仓**不作归属**（既不称《秘書》，也不称《統宗寶鑑》《淘金歌》），只保留为「另一系说法，待考」。若无法补出一手出处，应以卷二为准。",
  },
  {
    id: "taiyi-standing-variant",
    system: "taiyi-shenshu",
    kind: "异说",
    status: "异说",
    title: "阳宫阴阳归属两说（故本仓不输出「和/不和」判词）",
    citation: "《太乙金鏡式經》卷二·推九宫所主法（引張良經） vs 《太乙淘金歌》",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/太乙金鏡式經_(四庫全書本)/卷02",
    quote: "卷二：「張良經云八三四九為陽，二七六一為隂。」；同卷又云「一宫為純陽，九宫為純隂」（指绝阳绝阴之气，非同一事）；《淘金歌》则作「一是纯阳九绝阴」。",
    note:
      "两说并存、且秘書局注与卷三立成对同一局的「和/不和」注记互相矛盾（如秘書阳局1作「客算十三和」，立成作「十三〈不和〉」），故本仓**只呈算值/奇偶/所立正宫或间神等事实，不下和/不和结论**。",
  },
  {
    id: "taiyi-jishen-jiangji",
    system: "taiyi-shenshu",
    kind: "古籍原文",
    status: "已核",
    title: "计神逆行与参将宫（「三因大将，满十去之」）",
    citation: "《太乙淘金歌》「求計神」「求參將宮」；《太乙秘書》『定计目计算大将参将』",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/太乙秘書",
    quote:
      "「子歲計神寅上起，丑牛寅鼠逆周流。」／「三因大將滿十去，餘零參將契於天。客將還從客目數，主將由主法如前。」／《秘書》：「……去十用零為定計大將之宮，三因之為定計參將之宮。」",
    note: "《淘金歌》目前仅有多个站点的一致转引，本仓未取得原刻本页——故其证据等级低于四库本《金鏡式經》。",
  },
  {
    id: "taiyi-bureau-tables",
    system: "taiyi-shenshu",
    kind: "计算口径",
    status: "已核",
    title: "阳局/阴局七十二局并列 ⇒ 遁不由局数推导",
    citation: "《太乙金鏡式經》卷三（阳局立成·阴局立成）；《太乙秘書》（定主客胜负阳局七十二局·阴局七十二局）",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/太乙金鏡式經_(四庫全書本)/卷03",
    quote: "卷三立成以「阳局天目地目计神主客大小将立成」与「阴局……立成」两表并列，各 72 局；《秘書》阳局第一局「太乙在一宫」、阴局第一局「太乙在九宫」。",
    note: "因此本仓**不再由局数推遁**：界面须由使用者择定阳遁/阴遁（未选定时按阳遁列出并提示）。",
  },
  {
    id: "taiyi-mishu-corpus",
    system: "taiyi-shenshu",
    kind: "古籍原文",
    status: "已核",
    title: "回归语料：《太乙秘書》局注 36 局（逐字转录）",
    citation: "《太乙秘書》阳局第 1–24 局、阴局第 1–12 局（逐字转录于 src/lib/taiyi/mishu-corpus.ts）",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/太乙秘書",
    quote:
      "阳局第一局（**节引**，全文见 mishu-corpus.ts）：「太乙在一宫，天目武德（主算七，主大将七宫，客目掩，主参将一宫囚，始击将大武掩主大将，客算十三和，客大将三宫发，客参将九宫格，计神寅。」／阴局第一局：「太乙在九宫，天目文昌将临吕申（主算五，八门杜，主大将、参将不出中宫，计神申。……客大将囚。」",
    details: [
      "比对字段：太乙宫、天目、主算、主大将宫、主参将宫、客目(始击)、客算、客大将宫、客参将宫、计神。",
      "秘書局注本身存在形讹与缺漏（如「大阳阴」「太昊」「太灵」等），凡与卷三立成互异者，本仓在语料中列「具名跳过」并注明，不改算法去迁就。",
    ],
    note: "本仓实现与该语料字段级一致（含具名跳过项）。",
  },
  {
    id: "taiyi-modern-glosses",
    system: "taiyi-shenshu",
    kind: "自撰/近似",
    status: "本仓自撰",
    title: "十六神「主…事」释义与格局白话判词（现代增释）",
    citation: "本仓 `src/lib/taiyi/data.ts`（`DEITIES:14-31`、`PATTERNS:80-92`）；month 字段依卷二·推十六神所主法，其余为现代整理",
    note:
      "十六神的建月（建子之月…）与格局判据文字有卷二/卷三原文；但「主阴私事」「主毁拆破废事」一类释义、以及格局的白话吉凶判词（如「簒废之祸，宜修德政」）为**本仓/通行整理的现代增释，无逐字出处**，不得当作古籍原文引用。",
  },
  {
    id: "taiyi-epoch-uncertain",
    system: "taiyi-shenshu",
    kind: "未核项",
    status: "未核",
    title: "元六纪周期（360 / 365）与起元",
    citation: "《太乙金鏡式經》卷二·推帝王年紀法；卷三「五子元積年立成法」",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/太乙金鏡式經_(四庫全書本)/卷02",
    quote: "「臣希明自周厲王三十七年甲子為上元，至大唐開元十二年甲子嵗，通計積一千五百六十一年矣。」；卷三：「置上元甲子至開元十二年甲子嵗，積三萬一筭，先以周紀法三百六十去之，餘以七十二約之，不盡為入元局數也。」",
    note: "「三百六十」见于卷三的算法描述，而另有作三百六十五之说；本仓默认 360 且可切换，并允许手工覆盖入局数与遁。",
  },

  /* ───────────────────────── 七政四余 ───────────────────────── */
  {
    id: "qizheng-mansion-table",
    system: "qizheng",
    kind: "计算口径",
    status: "已核",
    title: "二十八宿黄道宿度表（距星）+ 1684（康熙甲子）历元 + 岁差",
    citation: "清代《二十八宿黄道经纬度钤》（求敏斋主人辑《中西算学丛书初编》；公有领域），互证于《清史稿·卷28·天文三》「康熙甲子年黄道十二次初度值宿」",
    license: "公共领域",
    quote:
      "该表按二十八距星给出黄道经度（如「斗初宫五度五十分」、「觜五宫十九度二十二分」），并注「乃历元甲子年之黄道经纬度分……经度则每岁东行五十一秒，所谓岁差也」。",
    details: [
      "宿界＝距星：角宿起点取角宿一（室女座α／Spica），J2000 赤经 201.29825°、赤纬 −11.16132° 折 1684 回归黄经 ≈199.43°，与该表「角九宫十九度二十六分」≈199.4333° 相差 0.003°。",
      "《清史稿》康熙甲子「黄道十二次初度值宿」与该表 12 条中 10 条完全吻合，2 条差 0.07°/0.17°。",
      "本表沿用 1684 年「参前觜后」次序；清乾隆十九年改「觜前参后」后，通行次序与之一致，二者在觜/参交界处约差 1.35°。",
    ],
    note:
      "本仓据此把等分 360/28 换为距星宿界，并用岁差把当日回归黄经折回 1684 历元。岁差量取本仓 Lahiri（IAU2006 总岁差）多项式——它是印度口径，与中国古代「岁差」实测体系并非一事，仅作数值近似（1684–2100 累计差 <0.1°）。",
  },
  {
    id: "qizheng-palace-branches",
    system: "qizheng",
    kind: "古籍原文",
    status: "已核",
    title: "十二宫配十二次（白羊＝戌宫）",
    citation: "果老星宗「太阳过宫」一系通行表；与本仓庙旺陷表（太阳庙于戌）自洽",
    license: "公共领域",
    quote: "白羊＝戌、金牛＝酉、双子＝申、巨蟹＝未、狮子＝午、处女＝巳、天秤＝辰、天蝎＝卯、射手＝寅、摩羯＝丑、水瓶＝子、双鱼＝亥。",
    note:
      "上游 MIT 脚本（dglijin-oss/chinese-metaphysics-skills）把白羊映射到「寅」，与其自身按古典键位编制的庙旺陷表互相矛盾；本仓已改为古典口径，修正后庙旺判定才可达（太阳入白羊即「庙」）。",
  },
  {
    id: "qizheng-four-remainders",
    system: "qizheng",
    kind: "异说",
    status: "异说",
    title: "四余定义：罗睺 / 计都 / 月孛 / 紫气",
    citation: "元·赵友钦《革象新書》卷二·月有九行、日月盈缩；《七曜攘灾决》旧译系；《清史稿·时宪志一》",
    license: "公共领域（PD-old / 大正藏）",
    url: "https://zh.wikisource.org/wiki/革象新書_(四庫全書本)/卷2",
    quote:
      "赵友钦：「月道與黄道相交處，在二交之始强名曰羅㬋，交之中强名曰計都。……李淳風有推步月孛法，謂六十二日行七度，六十二年七周天……孛之所在，太陰所行最遲。」；沈括：「交初謂之羅睺，交中謂之計都。」；旧译系《七曜攘灾决》：「羅睺……一名蝕神頭……常逆行於天，十八年一周天」「計都……一名蝕神尾……常順行於天，凡九年一周天」。",
    details: [
      "罗睺/计都的方向命名各派相反（旧译系以罗睺＝交点、计都＝月远地点；沈括/赵友钦系以交初/交中分罗计），属古法新法之争，无统一定论。",
      "月孛＝「太阴所行最迟处」（月球远地点一派），《革象新书》已驳「彗孛」之说。",
      "紫气：「起于閏法，約二十八年而周天」，按闰余推出、顺行、年行约 13°05′。",
      "《清史稿·时宪志一》：「月孛乃月行极高之点」「至紫气一余，无数可定……今俱改删」。",
    ],
    note:
      "本仓：罗睺/计都取黄白平交点（罗睺＝降交点，系「果老旧法」一系约定）；月孛取 Meeus 平月远地点；**紫气**因古籍无确定历元，《时宪志》亦判「无数可定」，故保留上游数值但明确标注为「脚本约定虚星，非古典虚星」。",
  },

  /* ───────────────────────── 奇门遁甲 ───────────────────────── */
  {
    id: "qimen-3meta",
    system: "qimen",
    kind: "开源实现",
    status: "已核",
    title: "主引擎 3meta（定局→布三奇六仪→值符值使→转天盘→八门九星八神→格局）",
    citation: "npm `3meta@2.6.0`（lib/qimen/calculator.js、lib/qimen/QimenChart.js、lib/data/constants.js）",
    license: "MIT",
    url: "https://github.com/3metaJun/3meta",
    note:
      "全流程由上游产出，本仓不自写奇门算法。其定元用符头表（getYuan：甲子己卯甲午己酉＝上元…），局数用 YANGDUN_JIEQI/YINDUN_JIEQI 表。",
  },
  {
    id: "qimen-chaibu-is-default",
    system: "qimen",
    kind: "计算口径",
    status: "已核",
    title: "「拆补」并非第二套局法：3meta 默认即符头（拆补）定元",
    citation: "3meta `lib/qimen/calculator.js:15-21` getYuan；taobi `lib/pojo/taobi/TheArtOfBecomingInvisible.js:164-171` SPLIT",
    license: "MIT / MPL-2.0",
    note:
      "两者同规则，故 taobi 的「拆补」局数恒等于默认口径；本仓因此不提供「拆补」选项（提供了也没有第二种结果）。",
  },
  {
    id: "qimen-taobi-removed",
    system: "qimen",
    kind: "开源实现",
    status: "已核",
    title: "taobi 适配器已撤下（上游自注 @check FALSE、茅山可出负局数、四柱随宿主时区）",
    citation: "npm `taobi@0.4.5` `lib/pojo/taobi/TheArtOfBecomingInvisible.js`",
    license: "MPL-2.0",
    url: "https://github.com/Taogram/taobi",
    quote:
      "`@check FALSE` 位于 :69 `#generateCalendar`、:154 `#generateElement`、:202 `#midPlace`、:325 `#overDivinity`；:176-178 茅山法 `MAO=(time-during)/5d` 无下界保护且只截顶 2（可致局数为负）；:337、:343 仍留 TODO。四柱由 tao_calendar 以 `date.getHours()`／`getTimezoneOffset()` 取得（algorithm/SolarCalendar.js:84、reduceTimeOffset.js:10），故随宿主时区变化。",
    note:
      "实测：同一输入换宿主时区，14 例拆补/茅山输出全部不同（UTC 下 6 例抛错）；茅山在冬至窗口局数为负。因无法用测试钉死、且不能自造茅山法（古籍无逐字定局规则），本仓撤下这两个方法，只保留单一默认口径。",
  },
  {
    id: "qimen-classical-chaibu",
    system: "qimen",
    kind: "古籍原文",
    status: "已核",
    title: "拆局补局与超接置闰（古籍原文）",
    citation: "《奇門遁甲統宗》卷之一·遁甲起例·论超接之法·置闰法",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/奇門遁甲統宗",
    quote:
      "「五日一元，遇甲己日為氣交，而非甲己則以超接之，即拆局補局之法。」／置闰法：「……十六日甲子不作夏至上局，而為芒種閏奇上局……斯乃謂之接氣。」",
    note:
      "「茅山道人法」（不拆不闰）本轮未获古籍逐字原文，仅坊间转述——故本仓不实现它。资料本体照维基文库该页原样（该页为**标点简体**转录本，非四库影本行款；古籍原本无句读），故此处「拆局補局」等原文呈简体加标点形；引句栏则作繁体对应。",
  },

  /* ───────────────────────── 星盘 / 汉堡学派 ───────────────────────── */
  {
    id: "astro-celestine",
    system: "astro",
    kind: "开源实现",
    status: "已核",
    title: "天文计算引擎 celestine（行星/小行星/交点/莉莉丝/宫位/相位/四轴）",
    citation: "npm `celestine@0.2.1`（`dist/index.js`）",
    license: "MIT",
    url: "https://github.com/Anonyfox/celestine",
    note:
      "宫制沿用 celestine 默认 Placidus（界面与载荷已标注）；高纬约 |φ|>66° 时库内会自动回退（`MAX_LATITUDE_PLACIDUS2 = 66`），已在宫制说明中提示。本仓未纳入阿拉伯点以外的 lots 与恒星。",
  },
  {
    id: "astro-lots",
    system: "astro",
    kind: "计算口径",
    status: "已核",
    title: "阿拉伯点：库仅给出福点与精神点（按昼夜 sect 切换公式）",
    citation: "celestine `dist/index.js:7529-7573`（calculatePartOfFortune / getPartOfFortune / calculatePartOfSpirit）、`:7645-7655`（calculateLots）、`:8670-8704`（ChartLot 组装）",
    license: "MIT",
    quote: "福点：昼盘 `ASC + Moon − Sun`，夜盘 `ASC + Sun − Moon`；精神点取福点之反。sect（昼夜）由太阳相对上升的位置判定（:8533-8541）。",
    note: "故本仓只输出这两个点，不自行补婚姻点/爱欲点等（否则需另引 Paulus 一系公式源）。lots 含上升点，故无出生地时不输出。",
  },
  {
    id: "uranian-astrolog-elements",
    system: "uranian",
    kind: "开源实现",
    status: "已核",
    title: "八虚星轨道要素与解算（移植自 Astrolog / Neely-Matrix）",
    citation: "Astrolog `matrix.cpp`（`rgoe[]`，matrix.cpp:98-138；`ComputePlanets()`，matrix.cpp:563-…）；字段序 `astrolog.h:2240-2246`",
    license: "GPL-2.0-or-later",
    url: "https://github.com/CruiserOne/Astrolog",
    note:
      "元素（平近点角/离心率/半长轴/近日点角距/升交点/倾角，历元 J1900.0）与「解 Kepler→轨道面旋转→地心黄经」流程照上游；八虚星为 Witte 以来的**名义假想天体**（其轨道要素表除平近点角与半长轴外全为零）。⚠ 其「原则」归词（家庭/悲伤/创造之火…）与中文名、缩写**均无具体文献出处**，属该体系通行的象征解释，不是计算事实，不得当作占星判据。本仓未采用 Swiss Ephemeris（AGPL）路径。",
  },
  {
    id: "uranian-aberration",
    system: "uranian",
    kind: "计算口径",
    status: "已核",
    title: "光行差项：Astrolog 的 `aber` 是「光行时×自身运动」，不是地球速度年周光行差",
    citation: "Astrolog `matrix.cpp:640`；`calc.cpp:932-937`",
    license: "GPL-2.0-or-later",
    quote:
      "matrix.cpp:640：`aber = 0.0057756 * RLength3(XS, YS, ZS) * ret[i];  // Aberration`；calc.cpp:937：`planet[ind] = Mod(DFromR(ang) - aber + is.rSid);`（0.0057756＝1 AU 的光行时，天/AU；ret[i] 为该天体地心黄经的日变化）。",
    note:
      "本仓按同一式子实现，并额外输出 geometricLongitude / aberration 以便核对；量级 ~0.006°，远小于汉堡通行容许度（默认 1.5°）。物理上「光行差」只对真实发光/反光天体成立，八虚星为假想体，此处施加只为与参考实现同口径，可在代码中关闭。",
  },

  /* ───────────────────────── 吠陀 / 玛雅 / 卢恩 / 卡巴拉 / 神圣几何 / 塔罗 ───────────────────────── */
  {
    id: "vedic-sources",
    system: "vedic",
    kind: "开源实现",
    status: "已核",
    title: "Lahiri 岁差、16 分盘与宿宿主序列",
    citation: "npm `vedic-panchanga@0.2.0` / `vedic-kundali@0.1.0`（MIT；其 GitHub 上游 ravipathak3001/vedic-panchang 现已 404）；分盘规则另经 BPHS 复核",
    license: "MIT",
    quote: "J2000 基准岁差 `AYANAMSA_AT_J2000.lahiri = 23.853064`，其后用一般岁差多项式（5028.796195″·t + …）；分盘 D30 Trimsamsa 阴阳分段表、D2 Hora 日月时分等与上游逐值一致。",
    note:
      "星历改用真星历（celestine 回归黄经 − 岁差 = 恒星黄经），不用上游的简易近似。罗睺/计都**可切换平/真交点**（默认平；真交点直接用 celestine 的 `getTrueNodeLongitude`，MIT，`dist/index.js:2245-2260`，Meeus 级数含 17 项摄动，最大摆动 ≤1.5°）；岁差为「J2000 常量 + 一般岁差多项式」，非 Spica 锚定的严格 Chitrapaksha（差在角秒级）。",
  },
  {
    id: "maya-sources",
    system: "maya",
    kind: "开源实现",
    status: "已核",
    title: "长纪年/卓尔金/哈布 与 13:20（Dreamspell）",
    citation: "自实现（GMT 相关系数 584283）+ npm `@oshimishi/dreamspell-math`（Oracle.js / Kin.js / DreamDate.js）",
    license: "MIT",
    url: "https://github.com/oshimish/dreamspell-math",
    quote: "13:20 计数与「闰日不推进」约定、印章/调性/颜色/波符/神谕（高我五位）、十三月历（13×28＋无时间日）与上游逐式一致；锚点 2013-07-26 = Kin 164，另以 1983-09-16 = 1 Bʼatzʼ 校验传统口径。",
    note:
      "银河门户（PORTALS_MATRIX，260 值）与神秘柱（第 7 列，kin 121–140）**已逐字段移植**（来源：`oshimish/dreamspell-math` `src/Kin.ts:6-27`、`76-91`，MIT）。上游无「门户日名称/含义」等额外数据，故未新增。印章/调性名称出自 Argüelles 体系。",
  },
  {
    id: "runes-source",
    system: "runes",
    kind: "开源实现",
    status: "已核",
    title: "24 符文（Elder Futhark）名称、Unicode、三个 aett 与正逆位义",
    citation: "evoluteur/rune-reading `js/runes-data.js`",
    license: "MIT",
    url: "https://github.com/evoluteur/rune-reading",
    note: "本仓改写为 TypeScript 并保留 40×64 SVG 笔画路径；「北欧九界」为 Yggdrasil 三层九界的通行说法整理（公共神话事实）。符文无「正逆位」的九个不可逆符文恒作正位。",
  },
  {
    id: "qabalah-source",
    system: "qabalah",
    kind: "开源实现",
    status: "已核",
    title: "希伯来字母数值、十三种 gematria 算法与拼读表",
    citation: "npm `mispar`（MIT，(c) Moshe Malka）",
    license: "MIT",
    url: "https://github.com/moshejs/mispar",
    quote: "hechrachi / gadol / katan / siduri / katan-mispari / perati(=v²) / meshulash(=v³) / kidmi(累进) / boneeh / haakhor / milui / atbash / albam 与上游逐行等价。",
    note:
      "十辉与二十二字母的名称、数值、三分法（3 母/7 双/12 单）出自《创造之书》（Sepher Yetzirah）；「字母↔塔罗/元素/行星/星座」为 Golden Dawn 一系通行对应。「数根→辉位」对照链为本仓所加（界面标注为对照而非等式）。已与上游对齐：`letterValues` 逐字入口对 `katan-mispari` **按上游一致抛 `RangeError`**（该法把归约作用在总和上，逐字拆解无定义；来源 `mispar` `src/index.ts:257-264`，MIT）。",
  },
  {
    id: "sacred-geometry-source",
    system: "sacred-geometry",
    kind: "开源实现",
    status: "已核",
    title: "Vesica / Seed / Flower / Metatron / Golden Spiral 的几何构造",
    citation: "evoluteur/sacred-geometry `patterns.js`",
    license: "MIT",
    url: "https://github.com/evoluteur/sacred-geometry",
    note: "本仓按几何分层生成（非写死坐标），如 Vesica 圆心距＝半径、Flower 为三角格子（rings=2 得 19 圆）、Metatron 为 13 圆的 C(13,2)=78 线。`PHI` 为上游导出但本仓未使用的常量。",
  },
  {
    id: "tarot-source",
    system: "tarot",
    kind: "开源实现",
    status: "已核",
    title: "78 张塔罗牌数据、正逆位与中文牌义",
    citation: "npm `@cometpisces/tarot-kit@0.2.0`（`dist/data/major-arcana.js`、`dist/data/wands|cups|swords|pentacles.js`、`dist/data/cards.js`、`dist/helpers/draw.js`、`dist/types/card.d.ts`）",
    license: "MIT",
    note: "牌义文本与逐牌质量来自该包（本仓无独立来源链）；抽牌为「由出生资料确定的伪随机」，同一出生资料恒得同一组牌（界面已声明可复现）。",
  },

  /* ───────────────────────── 紫微 / 八字 / 大六壬 / 皇极经世 ───────────────────────── */
  {
    id: "ziwei-iztro",
    system: "ziwei",
    kind: "开源实现",
    status: "已核",
    title: "命盘排布（十二宫、宫干、主星辅曜、生年四化、大限）",
    citation: "npm `iztro@2.6.1`（astro.bySolar / astro.byLunar；`lib/data/heavenlyStems.js`、`lib/data/constants.js`、`lib/i18n/locales/zh-CN/*`）",
    license: "MIT",
    url: "https://github.com/SylarLong/iztro",
    note:
      "本仓不改该库。`insights` 的 8 类格局名与判据依传统说法整理，逐条注明所据古籍或口诀（《紫微斗数全书》《紫微斗数骨髓赋》、四化与禄存歌诀等）。",
  },
  {
    id: "ziwei-flying-own",
    system: "ziwei-flying",
    kind: "自撰/近似",
    status: "本仓自撰",
    title: "飞化/自化/来因宫/转忌链与洛书河图对照（本仓据通行口诀整理）",
    citation: "公共领域口诀与北派通行技法（未移植第三方代码）",
    quote:
      "十干四化口诀「甲廉破武阳，乙机梁紫阴，丙同机昌廉，丁阴同机巨，戊贪阴右机，己武贪梁曲，庚阳武阴同，辛巨阳曲昌，壬梁紫左武，癸破巨阴贪」；天乙贵人口诀「甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎」。",
    note:
      "「天乙飞星」一名未见统一文献术语，本仓按「年干取天乙贵人宫 + 宫干飞化」组合呈现并显式标注。洛书数（一白…九紫）依后天八卦配十二支、河图生成数依卦位，属对照呈现，不另立判词。转忌链并列「生年四化」与「宫干自化」两条起法。",
  },
  {
    id: "bazi-sources",
    system: "bazi",
    kind: "计算口径",
    status: "已核",
    title: "四柱/藏干/十神/纳音/空亡/大运 与 古籍摘录、结构审计",
    citation: "npm `lunar-typescript@1.8.6`（MIT）＋ 本仓 `src/lib/agent/bazi-classics.ts` 摘录（`BAZI_CLASSIC_EXCERPTS`）＋ `structure-audit.ts` 启发式",
    license: "MIT（历法库）；古籍摘录属公共领域",
    note:
      "四柱与十神等由 lunar-typescript 产出。以上 12 条即本仓 `src/lib/agent/bazi-classics.ts` 的 `BAZI_CLASSIC_EXCERPTS` 全表（`text` 逐字照录，`editorial` 以「【editorial…】」标注并明示非原文）。古籍摘录**未经逐字校对**，界面与载荷都要求只能引作「据《书名·篇目》大意」，禁止当逐字原文；`editorial` 为本仓现代编者按，不得挂书名引用。旺衰权重、从格门槛、调候取用为**本仓启发式**，不是古籍固定算法。",
  },
  {
    id: "daliuren-upstream",
    system: "daliuren",
    kind: "开源实现",
    status: "已核",
    title: "大六壬天地盘/四课三传/课体（直接调用上游引擎）",
    citation: "npm `taibu-core@3.5.0`（daliuren 域，MIT）→ 底层 `liuren-ts-lib@1.9.0`（Apache-2.0）",
    license: "MIT / Apache-2.0",
    url: "https://github.com/hhszzzz/taibu",
    note: "本仓不自行重写六壬算法；历史自研副本（含 720 组三传查表）已删除，只保留上游这一份。",
  },
  {
    id: "huangji-source",
    system: "huangji",
    kind: "开源实现",
    status: "已核",
    title: "元会运世纪年",
    citation: "Ryanlyly-ai/huangji-jingshi `src/constants.ts`、`src/chronology.ts`、`src/evidence.ts`；本仓移植件 `src/lib/huangji/chronology.ts`",
    license: "MIT",
    url: "https://github.com/Ryanlyly-ai/huangji-jingshi",
    quote:
      "「易之生數一十二萬九千六百，為四千三百二十。此消長之大數，演三十年之辰數，即其數也。歲三百六十日，得四千三百二十辰，以三十乘之，得其數矣。凡甲子、甲午為世首，此為經世之數，始于日甲、月子、星甲、辰子。又云：此經世日甲之數，月子、星甲、辰子從之也。」（維基文庫《皇極經世》卷十三，逐字）／「一元十二会、三百六十运、四千三百二十世；一世三十年。」（上游 `src/evidence.ts` `cycle-hierarchy` 条目注，自标 PRIMARY_EXPLICIT）",
    details: [
      "异说（起元锚点）：原书未给公历起元年份；上游把起元年份自标为 PRIMARY_DERIVED（由第 2232 世甲午＝公元前 87 年、第 2253 世甲子＝公元 544 年独立反推），本仓 `chronology.ts:27` 采用同一数值（公元前 67017 年）。本仓**未获**其他学者取用不同纪元锚点的逐字来源，故未并列第二说；若日后取得，应在此并列。",
      "异文（非起元，属转写差异）：卷十三「易之生數一十二萬九千六百」一句，《皇極經世書 (四庫全書本)/卷13》作「……為四千三百二十比消長之大數」，《性理大全書 (四庫全書本)/卷12》引作「……總為四千三百二十世，此消長之大數」，維基文庫標點本作「……為四千三百二十，此消長之大數」——系 OCR／傳抄之异，不改变 129600＝4320×30 的数量关系。",
    ],
    note: "忠实移植并改写导出与文档注释，算法与原实现一致。上游为个人项目，本仓宜自持锚点校验。",
  },

  /* ───────────────────────── 第四道 / 阿卡西 / 研究 ───────────────────────── */
  {
    id: "fourth-way-content",
    system: "fourth-way",
    kind: "自撰/近似",
    status: "本仓自撰",
    title: "第四道内容模块（非算法体系）",
    citation: "葛吉夫／邬斯宾斯基体系通行说法整理（无计算逻辑）；本仓 `src/lib/fourth-way/content.ts`（`FOURTH_WAY_CONTENT`）",
    note: "本模块只作知识条目展示，无可计算量；法则数序列、H6…H3072、Man No.1–7 等属通行说法，以上均为**本仓整理**（非算法、无逐字出处）。",
  },
  {
    id: "akasha-physics",
    system: "akasha",
    kind: "计算口径",
    status: "已核",
    title: "全息物理（教科书标准式，未移植第三方代码）＋ 阿卡西知识条目",
    citation: "自实现：史瓦西半径 r_s=2GM/c²、视界面积 A=4πr_s²、贝肯斯坦–霍金熵 S=k_B·A/(4ℓ_P²)、体积律对照、贝肯斯坦界 S≤2πk_BRE/(ħc)；常数取 CODATA",
    details: [
      "贝肯斯坦界以 S/k_B（nat）计，换算比特需再除以 ln2——界面与载荷两个口径都给出。",
      "全息碎片重建：自实现基数-2 FFT，测试以 N=256 与朴素 DFT 逐点比对；碎片 25% 重建峰位与整幅一致、相关系数 0.755（已落为断言）。",
    ],
    note: "**阿卡西记录部分无开源实现、且非可计算体系**：本仓只列知识条目与伦理边界，**不提供任何「读取」**。",
  },
  {
    id: "research-aggregate",
    system: "research",
    kind: "自撰/近似",
    status: "本仓自撰",
    title: "术数研究 / 人生 K 线（阶段打分与线型权重为本仓启发式）",
    citation: "本仓 `src/lib/qimen/kline.ts`、`src/lib/research/trend.ts`；可视化层移植自 `miounet11/life-kline`（Apache-2.0）",
    license: "Apache-2.0（可视化层）",
    note: "线型权重与 STAGE_SCORE 为产品启发式，不是古籍算法。",
  },

  /* ───────────────────────── 人类图 / 泛音 / 三盘联合 ───────────────────────── */
  {
    id: "human-design-source",
    system: "human-design",
    kind: "开源实现",
    status: "已核",
    title: "激活计算（门/爻/色/调/基）与中心/通道推导",
    citation: "npm `hd-chart-engine@0.1.1`（其底层为 MIT 的 `astronomy-engine`）；本仓 `src/lib/human-design/chart.ts` 的通道/中心/类型/权威映射",
    license: "MIT",
    url: "https://github.com/domalhambra/hd-chart-engine",
    quote:
      "上游用固定天轮起点（WHEEL_START 223.25）、门宽 5.625°（＝360/64）、88° 设计弧与真交点计算行星激活；本仓依公开的 36 通道 / 64 门→9 中心映射推导类型、权威、定义与 Profile。",
    note:
      "行星激活为地心坐标、不依赖出生地。**未给** Incarnation Cross 的十字名（只给角度类型与四个门）；`tone/base` 为估值（上游 precision 字段已透出）。本仓只改作研究性呈现，不代表认证排盘或医学/心理诊断。",
  },
  {
    id: "harmonic-technique",
    system: "harmonic",
    kind: "自撰/近似",
    status: "本仓自撰",
    title: "泛音（谐波）星盘：黄经×n 折算与合相判定",
    citation: "泛音占星为 20 世纪通行做法（Addey 一系）；本仓 `src/lib/harmonic/chart.ts` 自实现",
    quote: "折算：`h = (黄经 × n) mod 360`；本仓只判合相（固定容许度），点位沿用本仓星盘（celestine）的输出（现为 18 项，自动纳入）。",
    note:
      "「谐波盘以**合相**为读取口径」为 Addey 一系的通行做法（如 Astrodienst：In the harmonic chart, these planets form conjunctions；谐波盘内其它相位虽可研究，但解释会迅速复合、须更谨慎），故本仓此举是**取值口径而非简化**。谐波盘专属的四轴反推做法（部分流派由谐波中天反推上升）未实现——无统一规则，不新造。",
  },
  {
    id: "combined-aggregate",
    system: "combined",
    kind: "自撰/近似",
    status: "本仓自撰",
    title: "三盘联合：仅做聚合，不含程序断语",
    citation: "本仓 `src/lib/combined/serializer.ts`（阶段一）与 `src/lib/combined/chart-times.ts` 的分时口径",
    note:
      "三盘联合把奇门/八字/紫微的既有结果并列，**不产出任何自动吉凶断语**；分时口径（真太阳时/平太阳时等）在界面上显式可选。",
  },

  /* ───────────────────────── 通用 ───────────────────────── */
  {
    id: "shared-agpl-excluded",
    system: "shared",
    kind: "许可",
    status: "已核",
    title: "因许可排除的开源实现",
    citation: "本仓库为 GPL-3.0-only",
    details: [
      "`mingyu-core`（含 huangji-jingshi 模块）— AGPL-3.0-only",
      "`caelis-engine` / `Caelus`（harmonicChart）— AGPL-3.0",
      "`kaabalah`（含 enneagram）— AGPL-3.0",
      "Swiss Ephemeris 系（`swemplan.cpp` 等）与 `falcon-ephemeris` — AGPL-3.0",
      "铁板/邵子候选仓库：`x3747991-ship-it/tieban-shenshu-skillpack`、`xaminxan/tiebanshenshu`、`kentang2017/kinastro`、`kentang2017/kinqimen` — **无 LICENSE 文件**；`Horace-Maxwell/horosa-skill` — AGPL-3.0-only",
    ],
    note: "AGPL 与本仓库组合会把整体许可提升为 AGPL，故不引入；无 LICENSE 者一律不可用。",
  },
  /* ───────────────────────── 中医运气（八字结合） ───────────────────────── */
  {
    id: "bazi-tcm-wuyun-liuqi",
    system: "bazi-tcm",
    kind: "古籍原文",
    status: "已核",
    title: "十干化五运（中运）与十二支化六气（司天）",
    citation: "《素問·天元紀大論》《素問·五運行大論》（維基文庫《黃帝內經/素問第十九卷》，Public Domain）",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/黃帝內經/素問第十九卷",
    quote:
      "《天元紀大論》「甲己之歲，土運統之。乙庚之歲，金運統之。丙辛之歲，水運統之。丁壬之歲，木運統之。戊癸之歲，火運統之。」／《五運行大論》「土主甲己，金主乙庚，水主丙辛，木主丁壬，火主戊癸。子午之上，少陰主之……己亥之上，厥陰主之。」",
    note:
      "本仓的中运＝年干所化之运（太过/不及另见异说条目），司天＝年支所化之气；在泉与司天相对（间隔三气），据《素問·六元正紀大論》「歲半之前，天氣主之，歲半之後，地氣主之」。原文为繁体录入本，未做简繁转换。",
  },
  {
    id: "bazi-tcm-jiming",
    system: "bazi-tcm",
    kind: "古籍原文",
    status: "已核",
    title: "五运纪名三套：平气／不及／太过（敷和·委和·发生…）",
    citation: "《素問·五常政大論》（維基文庫《黃帝內經/素問第二十卷》，Public Domain）",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/黃帝內經/素問第二十卷",
    quote: "平气「木曰敷和，火曰升明，土曰備化，金曰審平，水曰靜順」；不及「木曰委和，火曰伏明，土曰卑監，金曰從革，水曰涸流」；太过「木曰發生，火曰赫曦，土曰敦阜，金曰堅成，水曰流衍」。",
    note:
      "经文只列纪名，未给「阳干太过、阴干不及」的取运规则；该规则不在《素問》正文（见本体系「异说」条目）。纪名义与各纪德化政令原文见本卷「敷和之紀…」以下诸段，本仓只取纪名，不取气候与疾病段落。",
  },
  {
    id: "bazi-tcm-zhuqi-tonghua",
    system: "bazi-tcm",
    kind: "古籍原文",
    status: "已核",
    title: "主气六步之「位」、岁会（岁位）、天符、太一天符",
    citation: "《素問·六微旨大論》（維基文庫《黃帝內經/素問第十九卷》，Public Domain）",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/黃帝內經/素問第十九卷",
    quote: "「顯明之右，君火之位也。君火之右，退行一步，相火治之，復行一步，土氣治之，復行一步，金氣治之，復行一步，水氣治之，復行一步，木氣治之，復行一步，君火治之。」／「木運臨卯，火運臨午，土運臨四季，金運臨酉，水運臨子，所謂歲會，氣之平也。」／「天符為執法，歲位為行令，太一天符為貴。」",
    note:
      "同天符、同岁会（中运与在泉同气）在各家注本中定义分歧较大，本仓**不输出**；君火与相火是否同气（客主加临的相得判据）亦各家不一，见异说条目。",
  },
  {
    id: "bazi-tcm-kezhu-shengfu",
    system: "bazi-tcm",
    kind: "古籍原文",
    status: "已核",
    title: "六气司天所化「其化以风/热/湿/火/燥/寒」与「主胜逆，客胜从」",
    citation: "《素問·至真要大論》（維基文庫《黃帝內經/素問第二十二卷》，Public Domain）",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/黃帝內經/素問第二十二卷",
    quote: "「厥陰司天，其化以風……太陽司天，其化以寒，以所臨藏位，命其病者也。」／「主勝逆，客勝從，天之道也。」",
    note: "经文此篇后段多为方药与治法（「治以辛涼，佐以苦」等），本仓**不取**，只作文献对照。",
  },
  {
    id: "bazi-tcm-xiangde",
    system: "bazi-tcm",
    kind: "古籍原文",
    status: "已核",
    title: "「上下相遘…气相得则和，不相得则病」与「岁半之前/之后」",
    citation: "《素問·五運行大論》《素問·六元正紀大論》（維基文庫《黃帝內經/素問第十九卷》《第二十一卷》，Public Domain）",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/黃帝內經/素問第十九卷",
    quote: "《五運行大論》「所謂面南而命其位，言其見也。 上下相遘，寒暑相臨，氣相得則和，不相得則病。」／《六元正紀大論》「歲半之前，天氣主之，歲半之後，地氣主之」。",
    note: "「气相得」的具体判据（同气/相生/相克、君相二火是否同气）各家不一，本仓按通行口径实现并标注。",
  },
  {
    id: "bazi-tcm-zangfu-ganzhi",
    system: "bazi-tcm",
    kind: "古籍原文",
    status: "已核",
    title: "干支 ↔ 脏腑/经络：十干配脏腑歌、十二经纳地支歌与五藏主时",
    citation: "《素問·藏氣法時論》（維基文庫《黃帝內經/素問第七卷》）· 明·高武《鍼灸聚英·十二經納天干歌》· 明·徐鳳《針灸大全·十二經納地支歌》· 明·楊繼洲《針灸大成·卷七》（維基文庫，Public Domain）",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/黃帝內經/素問第七卷",
    quote:
      "《藏氣法時論》「肝主春……其日甲乙；心主夏……其日丙丁；脾主長夏……其日戊己；肺主秋……其日庚辛；腎主冬……其日壬癸」；《鍼灸聚英·十二經納天干歌》「甲膽乙肝丙小腸，丁心戊胃己脾鄉，庚屬大腸辛屬肺，壬屬膀胱癸腎藏，三焦亦向壬中寄，包絡同歸入癸方」；《針灸大全·十二經納地支歌》「肺寅大卯胃辰宮，脾巳心午小未中，申胱酉腎心包戌，亥三子膽丑肝通」。",
    note:
      "本仓十干配脏腑取《鍼灸聚英·十二經納天干歌》，十二时辰配十二经取《針灸大全·十二經納地支歌》；两首均属子午流注纳子法一系，非《素問》正文。别本差异已逐条并列，不择一为真理。",
  },
  {
    id: "bazi-tcm-wuxing-peishu",
    system: "bazi-tcm",
    kind: "古籍原文",
    status: "已核",
    title: "五行配属：五方段（色/音/声/窍/味/志/数/臭/谷）",
    citation: "《素問·陰陽應象大論》（維基文庫《黃帝內經/素問第二卷》）·《素問·金匱真言論》（維基文庫《黃帝內經/素問第一卷》，Public Domain）",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/黃帝內經/素問第一卷",
    quote: "《陰陽應象大論》「東方生風……在竅為目，在味為酸，在志為怒」；《金匱真言論》「東方青色，入通於肝，開竅於目……其音角，其數八……其臭臊」。",
    note: "「其窍」一栏《阴阳应象大论》与《金匮真言论》用字略异（如心「舌」／「耳」、肾「耳」／「二阴」），本仓数据表取两说并列写法（如「舌（耳）」），不改原文。",
  },
  {
    id: "bazi-tcm-jiaonian-variants",
    system: "bazi-tcm",
    kind: "异说",
    status: "异说",
    title: "运气交年三派、太过不及与主气六气专名的出处层次",
    citation: "《素問·六節藏象論》（維基文庫《黃帝內經/素問第三卷》）·《素問·六元正紀大論》（維基文庫《第二十一卷》）· 宋·劉溫舒《素問入式運氣論奧》· 清《醫宗金鑑·運氣要訣》",
    license: "公共领域（PD-old）",
    url: "https://zh.wikisource.org/wiki/黃帝內經/素問第三卷",
    quote:
      "《六節藏象論》「求其至也，皆歸始春」；《六元正紀大論》「常以正月朔日平旦視之」。三派之中，「大寒交初气」的明文见宋·刘温舒《素问入式运气论奥》，本仓**尚未取得逐字来源**。",
    note:
      "交年三派并列：大寒交初气（宋·刘温舒《素问入式运气论奥》明文，未取得逐字来源）、《素问·六节藏象论》「皆归始春」、《素问·六元正纪大论》「正月朔日」。本页按**干支纪年**取年，不落节令步序。另须注意两处出处层次：「阳干太过、阴干不及」与「主气六步的六气专名」**不在《素问》正文**，明文见宋·刘温舒《素问入式运气论奥》与清《医宗金鉴·运气要诀》（均未取得逐字来源）；同天符/同岁会定义分歧大，本仓不输出；君火与相火是否同气（客主加临判据）各家不一。",
  },
  {
    id: "shared-heuristics",
    system: "shared",
    kind: "自撰/近似",
    status: "本仓自撰",
    title: "本仓自撰的启发式与近似（不得当古典依据）",
    citation: "详见 docs/THIRD_PARTY_NOTICES.md「本仓自撰的启发式、近似与未实现项」",
    details: [
      "八字：旺衰权重、从格门槛、调候取用（产品启发式）。",
      "奇门：格局评分与话术（非 3meta 输出）。",
      "研究/K 线：线型权重、STAGE_SCORE。",
      "紫微飞星：「天乙飞星」组合命名、数根→辉位对照、洛书/河图对照。",
      "太乙：不输出「和/不和」判词（两书矛盾）；「执提」与「自挟」未实现。",
      "七政四余：紫气非古典虚星；岁差用 Lahiri 近似；宫位为等分十二次（未做斜升）。",
      "星盘：宫制固定 Placidus（高纬回退）；未含阿拉伯点以外的 lots 与恒星。",
      "人类图：Incarnation Cross 只给角度与四门、不给十字名；tone/base 为估值。",
      "玛雅：银河门户与神秘柱**已移植**（来源 `oshimish/dreamspell-math` `src/Kin.ts`，MIT）；上游无门户日名称/含义数据。",
      "吠陀：罗睺/计都可切平/真交点（真交点用 celestine 的 Meeus 级数实现）；岁差仍非严格 Chitrapaksha。",
      "泛音：只判合相为 Addey 一系通行读取口径（非简化）；谐波四轴反推未实现。",
      "汉堡：光行差按 Astrolog 口径施加（物理上对假想体非必然）；未做周年光行差的地球速度口径。",
    ],
  },
];

export const provenanceBySystem = (system: ProvenanceEntry["system"]) => PROVENANCE.filter((entry) => entry.system === system);

/** 供「出处与原文」总览页使用的顺序（按体系分组）。 */
export const PROVENANCE_SYSTEM_LABELS: Record<ProvenanceEntry["system"], string> = {
  qimen: "奇门遁甲",
  bazi: "八字",
  ziwei: "紫微斗数",
  combined: "三盘联合",
  research: "术数研究 · 人生 K 线",
  astro: "星盘",
  "human-design": "人类图",
  tarot: "塔罗",
  "fourth-way": "第四道",
  harmonic: "泛音星盘",
  huangji: "皇极经世",
  qizheng: "七政四余",
  "sacred-geometry": "神圣几何",
  runes: "卢恩符文",
  uranian: "汉堡学派",
  maya: "玛雅历法",
  vedic: "吠陀占星",
  qabalah: "赫尔墨斯卡巴拉",
  "taiyi-shenshu": "太乙神数",
  akasha: "阿卡西 · 全息",
  "ziwei-flying": "紫微飞星 · 河洛化象",
  "bazi-tcm": "中医运气（八字结合）",
  daliuren: "大六壬",
  shared: "通用（许可与自撰声明）",
};
