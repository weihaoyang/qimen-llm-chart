/**
 * 出处与原文登记册（供前端「出处与原文」区块查阅）。
 *
 * 纪律（与仓库的第三方声明同一条线）：
 * 1. 只登记**真实存在**的出处；逐字引文尽量照抄原文，不做现代化改写。
 * 2. 凡本仓采用但未取得一手核对者，标 `未核`；凡古籍/实现之间有分歧者，标 `异说` 并**并列**；
 *    凡无外部出处的本仓启发式，标 `本仓自撰`，不得当古典依据。
 * 3. 本文件只放**引文与出处**，不放本仓的实现结论；实现结论见各体系代码与免责声明。
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
    documents: [
      {
        title: "推掩法",
        lines: [
          "經曰始擊將臨太乙宫謂之掩嵗計遇之王綱失序臣張君弱宜修徳以禳之盖掩襲刼殺之義若掩太乙在陽絶之地君凶隂絶之地臣誅掩主大將主人筭和吉不和凶參擊之勝",
        ],
      },
      {
        title: "推撃法",
        lines: [
          "經曰太乙所在宫客目在太乙前一辰為前擊在太乙後一辰為後撃在太乙前一宫為外宫擊在太乙後一宫為内宫撃所為撃者臣凌君卑凌尊下凌上僭也嵗計遇之將相相伐之義也",
        ],
      },
      {
        title: "推迫法",
        lines: [
          "經曰前為外迫後為内迫為上下二目主客大小四將在太乙左右為迫王希明曰上目無迫若下目在太乙前一辰為外辰迫在後一辰為内辰迫在太乙前一宫為外宫迫後一宫為内宫迫宫迫災㣲緩辰迫災急疾嵗計遇迫人君慎之",
        ],
      },
      {
        title: "推囚法",
        lines: [
          "經曰囚者簒戮之義也若文昌將并主客大小四將俱與太乙同宫總名曰囚若在陽氣絶氣之地大凶若在絶陽絶隂之地自敗臣受誅若諸將與太乙同宫或近大將謀在同類近參將謀在内也筭和者利筭不和者謀不成也",
        ],
      },
      {
        title: "推闗法",
        lines: [
          "經曰客主大小將目相宫齊為闗王希明曰闗之為義但將相怕忌之事不及於君也主客大小將同宫數齊皆為闗日",
        ],
      },
      {
        title: "推格法",
        lines: [
          "經曰客目大小將與太乙對宫為格言政事上下格也若在陽絶之地又與嵗計遇格不利有為所格者格易之義也若格太乙者盜侮其君主客筭不和者必敗",
        ],
      },
      {
        title: "推對法",
        lines: [
          "經曰下目文昌將與太乙衝而相當者為對若下目相對之時皆為大臣懐二心君逐良將兇奸生下臣欺上",
        ],
      },
      {
        title: "推四郭固法",
        lines: [
          "經曰四郭固者文昌將囚大乙宫至大將參將又相闗或客目臨之或客大小將相闗皆四郭固也主人勝固者憑勝不利先起四郭之固嵗計遇之主簒廢之禍利以修徳禳之也",
        ],
      },
      {
        title: "郭杜法",
        lines: [
          "經曰四郭杜者為客參將與文昌將并主大將與客大將并兼之掩迫關格提挾以出兵為閉杜不通及謀諸事不成嵗計遇之無大祸也",
        ],
      },
      {
        title: "推執提法",
        lines: [
          "經曰執提者為開生二門合衝皆為不利名為執提對為提格嵗計遇之不可舉事　所謂開生二門合衝者假令開門為直事不可與開門合衝生門為直事不可與生門合衝大凶　伍子胥曰三門皆不可與太乙相衝",
        ],
      },
      {
        title: "推提挾法",
        lines: [
          "李淳風云客主兩将或一将而共太乙挟客主目或大小將扵正宫者為提挟若客主二目臨問神客主二將共太乙挟二目扵間神謂之挟閉主人雖見提挟而在内猶可戰　自一至四為内宫　若囚死在陽絶氣者雖在外亦凶　客雖提挾而在外猶可戰　自九至六為外宫　若在囚死及陽絶之地者雖在内亦凶嵗計遇提挟凶客主有内外迫者不利先起張良云",
          "客目大將參將挟主目客勝挟太乙先勝後敗主計目囚迫太乙客勝",
        ],
      },
    ],
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
    documents: [
      {
        title: "推陰陽和不和（全段）",
        lines: [
          "張良經曰隂陽和不和者謂太乙及上下二目就筭數以相配下目立正宫為陽立間神為隂立陽筭得竒為重陽立隂筭得偶為重隂則不和上目所臨陽宫筭得重陽為重臨正二宫筭得竒也臨隂宫筭得隂為重隂為臨間神筭得偶也若在陽筭得偶隂筭得竒為隂陽和和則吉筭十一十三十七十九三十一三十三三十七三十九為陽數目臨為重陽筭中隂陽若筭得二十二二十四二十六二十八為隂皆不和也太乙在陽宫筭得竒者為重陽之數八三四九為陽宫太乙隂宫筭得偶者為重隂之數二七六一為隂宫皆不和若太乙在隂宫陽竒筭得偶數者為隂陽和也王希明曰三九寅辰為純陽二八巳丑為雜陽二十六未亥為純隂七一戌申為雜隂三十三三十九為重陽二十二二十六為重隂二十四二十八為雜隂十三十九三十一三十七為雜陽皆以次凶尤甚太乙天目在隂位筭得純隂在陽位筭得純陽為内外有謀在純者勝太乙天目在隂位筭得重陽為内有謀若筭得十四十八三十三為上和二十三二十九三十二為次和十二十六二十七三十四三十八為下和若太乙天目立隂陽位而筭陽多者利為客隂多者利為主更須考其深淺以明勝負也",
        ],
        note: "四庫全書本原文無句讀，此為維基文庫逐字轉錄（未加標點）。上和/次和/下和三表即在本段之末。",
      },
    ],
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
    documents: [
      {
        title: "十六神「主…事」释义逐条（本仓 `src/lib/taiyi/data.ts:14-31`）",
        lines: [
          "子 地主（建子之月）：阳气初发，万物阴生。主动摇言语事。",
          "丑 阳德（建丑之月）：二阳用事，布育万物。主施恩育物事。",
          "艮 和德（春冬将交）：阴阳气合，群物方生。主和集成就事。",
          "寅 吕申（建寅之月）：阳育大申，草木甲拆。主运用主宰事。",
          "卯 高丛（建卯之月）：万物皆出，自地丛生。主发挥事。",
          "辰 太阳（建辰之月）：雷出震势，阳气大盛。主危会兵革事。",
          "巽 大炅（春夏将交）：阳气炎皓。主申命号令事。",
          "巳 大神（建巳之月）：少阴用事，阴阳不测。主毁拆破废事。",
          "午 大威（建午之月）：阳附阴生，刑暴始行。主光明威烈事。",
          "未 天道（建未之月）：火能生土，土王于未。主阴私事。",
          "坤 大武（夏秋将交）：阴气施令，杀伤万物。主刑罚事。",
          "申 武德（建申之月）：万物欲死，荞麦将生。主传送迁移事。",
          "酉 太簇（建酉之月）：万物皆成，有大品簇。主更易肃杀事。",
          "戌 阴主（建戌之月）：阳气不长，阴气用事。主危期兵丧事。",
          "乾 阴德（秋冬将交）：阴前生阳，大有其情。主命令事。",
          "亥 大义（建亥之月）：万物怀垢，群阳欲尽。主计谋废弃事。",
        ],
        note: "十六神顺行次序（地盘）：子 丑 艮 寅 卯 辰 巽 巳 午 未 坤 申 酉 戌 乾 亥（`data.ts:8` 注释）。`month` 字段依《太乙金鏡式經》卷二·推十六神所主法；**「主…事」一类释义为本仓/通行的现代增释，无逐字出处**，不得当作古籍原文引用。",
      },
      {
        title: "格局白话判词（本仓 `src/lib/taiyi/data.ts:80-92` 的 `meaning`，现代增释）",
        lines: [
          "掩：遮掩袭击，君弱臣强，君主被蒙蔽，身边有奸佞。掩主大将，主人算和吉、不和凶。",
          "击：臣凌君、卑凌尊、下凌上僭，将相相伐；外击主诸侯臣子生逆、外国侵伐，内击主近臣同姓亲王后妃废弑之祸。辰击灾急，宫击灾缓。",
          "迫：侵逼胁持、上下相凌。宫迫灾微缓，辰迫灾急疾；外迫明迫自外来，内迫暗迫自内起。岁计遇迫，人君慎之。",
          "囚：囚禁困守，篡戮之义。诸将与太乙同宫，近大将谋在同类、近参将谋在内。对上不利，易有奔窜败亡之变。",
          "关：关格不通，将相疑忌而尚不及于君。四邻不睦、同辈相争、消息闭塞。",
          "格：格易变政，以下犯上，外部力量直接挑战核心权威；若格太乙者盗侮其君。",
          "对：大臣怀二心，君主疏远良将，下欺上瞒，内部离心。",
          "四郭固：四塞不通、坚壁固守之象。岁计遇之主篡废之祸，宜修德政、纳良谏以禳之。",
          "四郭杜：关梁闭杜、四塞不通，出兵不利，谋诸事不成。",
          "提挟：受人挟持、情非所愿而逆理行事。二目与大将挟太乙则政由大臣、臣下专权；主在内、客在外者犹可战。",
          "杜塞：将领与统帅失去联系，被封闭孤立。不宜主动出击，只宜固守。",
        ],
        note: "各条 `rule`（`data.ts:81-91`）照引卷二/卷三原文条目；而此处的白话 `meaning` 判词（如「簒废之祸，宜修德政」）为本仓现代增释，非古籍原文。",
      },
    ],
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
    documents: [
      {
        title: "二十八宿黄道经度（《二十八宿黄道经纬度钤》逐宿全表）",
        lines: [
          "斗初宮五度五十分　＝　5°50′",
          "牛初宮二十九度三十七分　＝　29°37′",
          "女一宮七度二十三分　＝　7°23′",
          "虛一宮十九度一分　＝　19°01′",
          "危一宮二十九度　＝　29°00′",
          "室二宮十九度七分　＝　19°07′",
          "壁三宮四度四十八分　＝　4°48′",
          "奎三宮十七度五十四分　＝　17°54′",
          "婁三宮二十九度三十三分　＝　29°33′",
          "胃四宮十二度三十三分　＝　12°33′",
          "昴四宮二十四度四十八分　＝　24°48′",
          "畢五宮四度三分　＝　4°03′",
          "參五宮十八度一分　＝　18°01′",
          "觜五宮十九度二十二分　＝　19°22′",
          "井六宮零度五十五分　＝　0°55′",
          "鬼七宮一度二十分　＝　1°20′",
          "柳七宮五度五十六分　＝　5°56′",
          "星七宮二十二度五十六分　＝　22°56′",
          "張八宮一度十九分　＝　1°19′",
          "翼八宮十九度二十三分　＝　19°23′",
          "軫九宮六度二十三分　＝　6°23′",
          "角九宮十九度二十六分　＝　19°26′",
          "亢十宮零度三分　＝　0°03′",
          "氐十宮十度四十一分　＝　10°41′",
          "房十宮二十八度三十一分　＝　28°31′",
          "心十一宮三度二十一分　＝　3°21′",
          "尾十一宮十度五十四分　＝　10°54′",
          "箕十一宮二十六度五十分　＝　26°50′",
        ],
        note:
          "逐值取自本仓 `src/lib/qizheng/chart.ts` 的 `MANSION_TABLE_QING`（即《钤》原表逐值）；原文以「宿名＋宫次＋度分」体例列出黄道经度（黄道纬度本仓未用，从略），此处照该体例转写、中国数字按原表，并附现代读数。宫次自「初宮」起（初宮 0°＝星纪初＝冬至点＝回归黄经 270°），十二宫次依序为星纪/玄枵/娵訾/降娄/大梁/实沈/鹑首/鹑火/鹑尾/寿星/大火/析木。序为「参前觜后」旧测口径。",
      },
    ],
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
    documents: [
      {
        title: "《革象新書》卷二·月有九行（羅㬋 / 計都 原段）",
        lines: [
          "月行不由黄道亦不由赤道乃出入黄道之内外也北有紫㣲垣帝座居之故北曰内南曰外所謂九行者止是一道其道與黄道相交如赤道然黄赤道兩環相逺處二十三度九十分月道之逺於黄道處止距六度二分而已月道與黄道相交處在二交之始强名曰羅㬋交之中强名曰計都自交初至於交中月在黄道外名曰陽厯乃背羅向計之處也自交中至於交初月在黄道内名曰陰厯乃背計向羅之處也月道比水路日道比旱路羅計比橋羅計漸移是猶橋道年年改異亦太陽嵗差捲絘之理也",
        ],
      },
      {
        title: "《革象新書》卷二·日月盈縮（月孛 原段）",
        lines: [
          "李淳風有推步月孛法謂六十二日行七度六十二年七周天所謂孛者乃彗星之一種光芒偏掃者則謂之彗光芒四出如圓暈者乃謂之孛然孛以月為名者葢有説焉孛之所在太陰所行最遲太陰在孛星對衝處則所行最疾孛星不常見止以太陰所行最遲處測之",
        ],
        note: "末句后原文接四庫館臣案語「案月行遲疾古以規法旋轉順逆明其故……孛非星也以彗孛之孛附㑹尤謬」，即赵友钦已驳「月孛＝彗孛」之说。",
      },
    ],
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
    documents: [
      {
        title: "定元符头表（3meta `lib/data/constants.js:17-19`；取值逻辑 `lib/qimen/calculator.js:15-21`）",
        lines: [
          "上元（SHANGYUAN）：甲子 乙丑 丙寅 丁卯 戊辰 己巳 庚午 辛未 壬申 癸酉",
          "　　　　　　　　　甲午 乙未 丙申 丁酉 戊戌 己酉 庚戌 辛亥 壬子 癸丑",
          "中元（ZHONGYUAN）：己巳 庚午 辛未 壬申 癸酉 甲申 乙酉 丙戌 丁亥 戊子",
          "　　　　　　　　　己亥 庚子 辛丑 壬寅 癸卯 甲寅 乙卯 丙辰 丁巳 戊午",
          "下元（XIAYUAN）：甲戌 乙亥 丙子 丁丑 戊寅 己丑 庚寅 辛卯 壬辰 癸巳",
          "　　　　　　　　　甲辰 乙巳 丙午 丁未 戊申 己未 庚申 辛酉 壬戌 癸亥",
          "getYuan（calculator.js:15-21）逐字：",
          ":16  if (['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己卯', '庚辰', '辛巳', '壬午', '癸未', '甲午', '乙未', '丙申', '丁酉', '戊戌', '己酉', '庚戌', '辛亥', '壬子', '癸丑'].includes(riGanZhi))",
          ":17      return '上元';",
          ":18  if (['己巳', '庚午', '辛未', '壬申', '癸酉', '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己亥', '庚子', '辛丑', '壬寅', '癸卯', '甲寅', '乙卯', '丙辰', '丁巳', '戊午'].includes(riGanZhi))",
          ":19      return '中元';",
          ":20  return '下元';",
        ],
        note: "行号对应本仓安装的 3meta@2.6.0。符头即「三奇六仪」戊己庚辛壬癸所配之甲旬首：上元取甲子/己卯/甲午/己酉四符头及同旬干支，中元取己巳/甲申/己亥/甲寅四符头及同旬，其余归下元。`constants.js` 的 SHANGYUAN/ZHONGYUAN/XIAYUAN 三个常量与 getYuan 的内联表内容一致（前者按六十甲子序排，后者按四符头分组）。",
      },
      {
        title: "阴阳遁节气局数表（结构 + 全表；3meta `lib/data/constants.js:21-40`）",
        lines: [
          "结构：{ 节气: [上元局数, 中元局数, 下元局数] }；阳遁查 YANGDUN_JIEQI，阴遁查 YINDUN_JIEQI（calculator.js:24-25）",
          "阳遁 YANGDUN_JIEQI：",
          "　冬至: [1, 7, 4]　惊蛰: [1, 7, 4]",
          "　小寒: [2, 8, 5]",
          "　大寒: [3, 9, 6]　春分: [3, 9, 6]",
          "　芒种: [6, 3, 9]",
          "　谷雨: [5, 2, 8]　小满: [5, 2, 8]",
          "　立春: [8, 5, 2]",
          "　立夏: [4, 1, 7]　清明: [4, 1, 7]",
          "　雨水: [9, 6, 3]",
          "阴遁 YINDUN_JIEQI：",
          "　夏至: [9, 3, 6]　白露: [9, 3, 6]",
          "　小暑: [8, 2, 5]",
          "　秋分: [7, 1, 4]　大暑: [7, 1, 4]",
          "　立秋: [2, 5, 8]",
          "　霜降: [5, 8, 2]　小雪: [5, 8, 2]",
          "　大雪: [4, 7, 1]",
          "　处暑: [1, 4, 7]",
          "　立冬: [6, 9, 3]　寒露: [6, 9, 3]",
        ],
        note: "全表即上述 24 个键（阴阳各 12 键，其中数键共用同一数组），完整体位于 `lib/data/constants.js:21-40`，不经任何浓缩——本页列出即全表。取局逐字见 `lib/qimen/calculator.js:23-33` getJuShu：`const table = isYangdun ? YANGDUN_JIEQI : YINDUN_JIEQI; const row = table[jieqi];` 后 `yuan === '上元' ? row[0] : yuan === '中元' ? row[1] : row[2]`。",
      },
    ],
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
    documents: [
      {
        title: "3meta getYuan（`lib/qimen/calculator.js:15-21`）原码逐字",
        lines: [
          ":15  const getYuan = (riGanZhi) => {",
          ":16      if (['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己卯', '庚辰', '辛巳', '壬午', '癸未', '甲午', '乙未', '丙申', '丁酉', '戊戌', '己酉', '庚戌', '辛亥', '壬子', '癸丑'].includes(riGanZhi))",
          ":17          return '上元';",
          ":18      if (['己巳', '庚午', '辛未', '壬申', '癸酉', '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己亥', '庚子', '辛丑', '壬寅', '癸卯', '甲寅', '乙卯', '丙辰', '丁巳', '戊午'].includes(riGanZhi))",
          ":19          return '中元';",
          ":20      return '下元';",
          ":21  };",
        ],
        note: "行号对应本仓安装的 3meta@2.6.0。",
      },
      {
        title: "taobi 拆补法 SPLIT（`lib/pojo/taobi/TheArtOfBecomingInvisible.js:160-171`）原码逐字",
        lines: [
          ":160     * 均分法",
          ":161     * 按节气时长完全均分计算",
          ":162     */",
          ":163    const AVERAGE = ~~(this.#longitude / 5) % 3;",
          ":164    /**",
          ":165     * 拆补法",
          ":166     * 遵循六十甲子循环",
          ":167     * 子午卯酉为上元",
          ":168     * 寅申巳亥为中元",
          ":169     * 辰戌丑未为下元",
          ":170     */",
          ":171    const SPLIT = ~~(this.date.index / 5) % 3;",
        ],
        note: "行号对应本仓安装的 taobi@0.4.5（MPL-2.0）。",
      },
      {
        title: "「同一规则」的逐步换算",
        lines: [
          "taobi：`SPLIT = ~~(date.index / 5) % 3`；`date.index` 为六十甲子序（0…59），每 5 位为一「五日一元」的符头组，`% 3` 得 0/1/2。",
          "对照：index 0 甲子 → 0（上元）；5 己巳 → 1（中元）；10 甲戌 → 2（下元）；15 己卯 → 0；20 甲申 → 1；25 己丑 → 2——与 3meta getYuan 的上/中/下元归属逐一相同。",
          "taobi 注释所述「子午卯酉为上元／寅申巳亥为中元／辰戌丑未为下元」，正是 3meta 表内 甲子己卯甲午己酉／己巳甲申己亥甲寅／甲戌己丑甲辰己未 四符头分组的地支表述。",
        ],
        note: "两式均以「五日一元」为基准；故 taobi 的拆补局数恒等于 3meta 默认口径（符头定元）。",
      },
    ],
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
    documents: [
      {
        title: "遁甲起例·拆局補局之法",
        lines: [
          "五日一元，遇甲己日为气交，而非甲己则以超接之，即拆局补局之法。假如庚寅大雪节，自己卯至庚寅已超十二日，是过旬也，余无再造之理，至此合用闰。闰者，何也？自甲午至戊申十五日重复大雪局奇，惟十七日乙巳方用冬至节上局奇，是谓之接也。自此以后而用接闰之法矣。",
        ],
      },
      {
        title: "論超接之法",
        lines: [
          "超者，超过也。神者，日辰也。接者，承接也。气者，诸节也。节气未至而日辰先到，则复节气为主而超越用未来之节气，此之谓超。又有节气已至而日辰未到，则伏辰为主而待日辰至方接承节。盖其气来则日辰未至，而奇星常用于前节，此之谓接也。如丙午年四月十三日壬申交立夏节，然四月初五日甲子日。甲己是四仲日，已在立夏前九日矣，则合超，超先于甲子日，下用立夏上局奇，己巳后用甲局，此乃先得奇后得节，凡作用取效为速。",
        ],
      },
      {
        title: "置閏法",
        lines: [
          "置闰之法，在芒种、大雪二节之后，冬至、夏至二至之前。他节虽超至十日，不可置闰，然他节亦无至八日九日十日者。",
          "假如康熙五十六年五月十三日丙寅夜子初二刻交夏至节，而十一日甲子即为夏至符头，已超三日，至十一月二十日庚午寅正时节交冬至节，去符头甲午日共超七日。至五十七年五月二十四日壬申卯初二度交夏至节，十六日即为甲子上元，乃超过九日矣，宜先于芒种节上置闰。盖五月初一己酉即为芒种上局，初六日为芒种中局，十一日为芒种下局。至十六日为芒种上中下三局已足矣。自十六甲子至二十四壬申，已超九日，为期大远。故十六日甲子不作夏至上局，而为芒种闰奇上局，二十一日己巳作芒种闰奇中局，二十六日甲戌作芒种闰奇下局。至六月初一日戊寅闰奇方终，六月初二日己卯始得为夏至上局。斯乃谓之接气。直至康熙五十八年六月二十三日立秋，而甲子符头恰当日，是为正授，本日即是阴遁二局。上元至七月初九日庚辰处暑即超一日矣。凡闰奇，三候一终即为接气，接气乃换正授，正授渐移乃换超局，超遇九日十日或十一日则仍置闰。",
        ],
      },
    ],
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
    documents: [
      {
        title: "宫制列表（celestine `dist/index.js` 原码行）",
        lines: [
          ":7251-7252  function getSupportedHouseSystems() {",
          ":7252    return [\"equal\", \"whole-sign\", \"porphyry\", \"placidus\", \"koch\", \"regiomontanus\", \"campanus\"];",
          ":7158-7167  function getAvailableHouseSystems(latitude) { const systems = [\"placidus\", \"koch\", \"equal\", \"whole-sign\", \"porphyry\", \"regiomontanus\", \"campanus\"]; return systems.filter((system) => isHouseSystemAvailable(system, latitude)); }",
          ":7254-7265  getHouseSystemName：equal=\"Equal\" / whole-sign=\"Whole Sign\" / porphyry=\"Porphyry\" / placidus=\"Placidus\" / koch=\"Koch\" / regiomontanus=\"Regiomontanus\" / campanus=\"Campanus\"",
          ":7141-7156  function isHouseSystemAvailable(system, latitude)：placidus、koch 需 |latitude| < MAX_LATITUDE_PLACIDUS；equal、whole-sign、porphyry、regiomontanus、campanus 需 |latitude| < MAX_ABSOLUTE_LATITUDE",
          ":7174  function getFallbackHouseSystem：回退序 [\"porphyry\", \"equal\", \"whole-sign\"]，最终兜底 \"equal\"",
          ":7280-7284  var MAX_LATITUDE_PLACIDUS2 = 66; var MAX_LATITUDE_ANY = 89.9; var DEFAULT_HOUSE_SYSTEM = \"placidus\"; var FALLBACK_HOUSE_SYSTEM = \"porphyry\"; var POLAR_FALLBACK_HOUSE_SYSTEM = \"whole-sign\";",
          ":7357  var LATITUDE_SENSITIVE_SYSTEMS = [\"placidus\", \"koch\"];",
          ":7184  function calculateHouses(location, lst, julianCenturies, system = \"placidus\")（各宫制分别调用 equalHouses / wholeSignHouses / porphyryHouses / placidusHouses / kochHouses / regiomontanusHouses / campanusHouses）",
        ],
        note: "行号为本仓安装的 `celestine@0.2.1` dist/index.js 实际行号（对应源文件 src/houses/*.ts、src/chart/constants.ts）。本仓默认取 Placidus；高纬绕回退见上表 66° 阈值与 fallback 序。",
      },
      {
        title: "相位容许度（orb）表（celestine `dist/index.js:82-100`，`DEFAULT_ORBS` 原值）",
        lines: [
          "// Major aspects - wider orbs",
          "conjunction（合）: 8",
          "opposition（冲）: 8",
          "trine（三分）: 8",
          "square（刑）: 7",
          "sextile（六分）: 6",
          "// Minor aspects - tighter orbs",
          "semi-sextile（半六分）: 2",
          "semi-square（半刑）: 2",
          "quintile（五分）: 2",
          "sesquiquadrate（倍半刑）: 2",
          "biquintile（倍五分）: 2",
          "quincunx（十二分之五／补十二）: 3",
          "// Kepler aspects - very tight orbs (1-2°)",
          "septile（七分）: 1",
          "novile（九分）: 1",
          "decile（十分）: 1",
          ":101-107  MAJOR_ASPECTS = [\"conjunction\", \"sextile\", \"square\", \"trine\", \"opposition\"]",
        ],
        note: "行号为本仓安装的 `celestine@0.2.1`。`:359-364` getOrb：若 `config.orbs[aspectType]` 有值则覆盖，否则回退 `DEFAULT_ORBS[aspectType]`；`:366-376` calculateStrength 以 `100*(1 − deviation/orb)` 折 0-100%。",
      },
    ],
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
    documents: [
      {
        title: "celestine dist/index.js · 福点与精神点原码",
        lines: [
          ":7529  function calculatePartOfFortune(sunLon, moonLon, ascendant, isDayChart) {",
          ":7530-7535  let pof; if (isDayChart) { pof = ascendant + moonLon - sunLon; } else { pof = ascendant + sunLon - moonLon; }",
          ":7540  function getPartOfFortune(jd, ascendant, options = {}) {",
          ":7571-7572  function calculatePartOfSpirit(sunLon, moonLon, ascendant, isDayChart) { return calculatePartOfFortune(sunLon, moonLon, ascendant, !isDayChart); }",
          ":8682  const formula = isDaytime ? \"ASC + Moon - Sun\" : \"ASC + Sun - Moon\";",
          ":8693  const formula = isDaytime ? \"ASC + Sun - Moon\" : \"ASC + Moon - Sun\";",
        ],
        note: "行号为本仓安装的 `celestine@0.2.1` dist/index.js 实际行号（对应源文件 src/ephemeris/lots.ts）。",
      },
    ],
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
    documents: [
      {
        title: "轨道要素字段序（`astrolog.h:2240-2246`，原码逐字）",
        lines: [
          ":2240  real ma0, ma1, ma2;  // Mean anomaly.",
          ":2241  real ec0, ec1, ec2;  // Eccentricity.",
          ":2242  real sma;            // Semi-major axis.",
          ":2243  real ap0, ap1, ap2;  // Argument of perihelion.",
          ":2244  real an0, an1, an2;  // Ascending node.",
          ":2245  real in0, in1, in2;  // Inclination.",
          ":2246  } OE;",
          "matrix.cpp:507  real ReadThree(real r0, real r1, real r2)  // = r0 + r1*T + r2*T*T（RFromD 后）",
        ],
        note: "故每组三数依次为「常数项 / 世纪一次项 / 世纪二次项」，T 为儒略世纪数。历元：`calc.cpp:1270  is.T = (is.T - 2415020.5) / 36525.0;`（自 1900-01-00.5 起算，即 J1900.0）。",
      },
      {
        title: "`OE rgoe[oVes+cUran-2]` 全表（`matrix.cpp:98-138`，逐值照录）",
        lines: [
          "Earth/Sun（:99-100）：ma {358.4758, 35999.0498, −.0002}；ec {.01675, −.4E-4, 0}；sma 1；ap {101.2208, 1.7192, .00045}；an {0, 0, 0}；in {0, 0, 0}",
          "Cupido（:130）：ma {104.5959, 138.5369, 0}；ec {0, 0, 0}；sma 40.99837；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
          "Hades（:131）：ma {337.4517, 101.2176, 0}；ec {0, 0, 0}；sma 50.667443；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
          "Zeus（:132）：ma {104.0904, 80.4057, 0}；ec {0, 0, 0}；sma 59.214362；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
          "Kronos（:133）：ma {17.7346, 70.3863, 0}；ec {0, 0, 0}；sma 64.816896；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
          "Apollon（:134）：ma {138.0354, 62.5, 0}；ec {0, 0, 0}；sma 70.361652；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
          "Admetos（:135）：ma {−8.678, 58.3468, 0}；ec {0, 0, 0}；sma 73.736476；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
          "Vulkanus（:136）：ma {55.9826, 54.2986, 0}；ec {0, 0, 0}；sma 77.445895；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
          "Poseidon（:137）：ma {165.3595, 48.6486, 0}；ec {0, 0, 0}；sma 83.493733；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
          "（同表并含 Mercury/ Venus/ Mars/ Jupiter/ Saturn/ Uranus/ Neptune/ Pluto/ Chiron/ Ceres/ Pallas/ Juno/ Vesta，本仓只取上列 1 真实体 + 8 虚星；表体位于 matrix.cpp:98-138。）",
        ],
        note: "八虚星均为 sma 等差式递增（40.99837→50.667443→59.214362→64.816896→70.361652→73.736476→77.445895→83.493733 AU），离心率、近日点、升交点、倾角全为 0——即 Astrolog 把它们当作规则命名轨道上的假想体。为逐字取用，行号对应 `CruiserOne/Astrolog` 仓库 master 分支 matrix.cpp。",
      },
      {
        title: "高斯常数与解算流程（`matrix.cpp:563-…` `ComputePlanets()`，原码逐字）",
        lines: [
          ":575  poe = &rgoe[IoeFromObj(ind)];",
          ":577  EA = M = ModRad(ReadThree(poe->ma0, poe->ma1, poe->ma2));",
          ":578  E = DFromR(ReadThree(poe->ec0, poe->ec1, poe->ec2));",
          ":579-580  for (i = 1; i <= 5; i++) EA = M+E*RSin(EA);  // Solve Kepler's equation",
          ":581  AU = poe->sma;                                    // Semi-major axis",
          ":582-583  E1 = 0.01720209/(pow(AU, 1.5)*(1.0-E*RCos(EA)));  // 高斯引力常数 GAUSS_K = 0.01720209",
          ":584-585  XW = -AU*E1*RSin(EA);  YW = AU*E1*pow(1.0-E*E,0.5)*RCos(EA);  // 近日点坐标系",
          ":586  AP = ReadThree(poe->ap0, poe->ap1, poe->ap2);",
          ":587  AN = ReadThree(poe->an0, poe->an1, poe->an2);",
          ":588  _IN = ReadThree(poe->in0, poe->in1, poe->in2);  // Calculate inclination",
          ":590  RecToSph2(AP, AN, _IN, &X, &Y, &G);  // 轨道面旋转（matrix.cpp:516 定义）",
          ":595  RecToSph2(AP, AN, _IN, &X, &Y, &G);  // 位置坐标再旋转 → 地心黄经另由 matrix.cpp:637-638 求日变化、:640 施光行差",
          ":640  aber = 0.0057756 * RLength3(XS, YS, ZS) * ret[i];  // Aberration",
        ],
        note: "0.01720209 即高斯引力常数 GAUSS_K（弧度/日，AU^1.5）；循环 5 次解 Kepler 方程 EA = M + E·sin(EA)，与注释「Looping 10 times is arbitrary…」无关（那是宫制 CuspPlacidus 的迭代）。行号为 `CruiserOne/Astrolog` master 分支 matrix.cpp。",
      },
    ],
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
    documents: [
      {
        title: "Astrolog matrix.cpp:640 与 calc.cpp:937（原码行）",
        lines: [
          "matrix.cpp:640  aber = 0.0057756 * RLength3(XS, YS, ZS) * ret[i];  // Aberration",
          "calc.cpp:937  planet[ind] = Mod(DFromR(ang) - aber + is.rSid);",
          "matrix.cpp:637-638  ret[i] = DFromR((XS*(helioy[i]-helioy[ind])-YS*(heliox[i]-heliox[ind])) /",
          "               (XS*XS + YS*YS));",
        ],
        note: "取自 CruiserOne/Astrolog 仓库（GPL-2.0-or-later）；0.0057756＝1 AU 的光行时（天/AU），ret[i] 为该天体地心黄经的日变化。",
      },
    ],
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
    documents: [
      {
        title: "24 符文名与字形（runes-data.js 逐条，传统次序）",
        lines: [
          "Fehu ᚠ／Uruz ᚢ／Thurisaz ᚦ／Ansuz ᚨ／Raidho ᚱ／Kaunan ᚲ／Gebo ᚷ／Wunjo ᚹ",
          "Hagalaz ᚺ／Nauthiz ᚾ／Isa ᛁ／Jera ᛃ／Eihwaz ᛇ／Perthro ᛈ／Algiz ᛉ／Sowilo ᛊ",
          "Tiwaz ᛏ／Berkano ᛒ／Ehwaz ᛖ／Mannaz ᛗ／Laguz ᛚ／Ingwaz ᛜ／Dagaz ᛞ／Othala ᛟ",
        ],
      },
      {
        title: "三 aettir 与来源自述（runes-data.js 头部）",
        lines: [
          "// Rune data -- the 24 runes of the Elder Futhark, in traditional order.",
          "// The names, sounds and division into three aettir (families of eight) are",
          "// the traditional ones. The keywords, meanings and advice below are original,",
          "// concise wording written for this app.",
          "{ name: \"Freyr's aett\", theme: \"Life, resources and human nature\" },",
          "{ name: \"Heimdall's aett\", theme: \"Forces of fate, change and the natural world\" },",
          "{ name: \"Tyr's aett\", theme: \"Society, spirit and the wider cycle\" },",
        ],
        note: "上游自述：符文名、读音与三 aett 划分为传统；关键词/牌义/建议为其自撰（「original, concise wording written for this app」），非古籍原文。",
      },
    ],
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
    documents: [
      {
        title: "patterns.js · PHI 常量与原码",
        lines: [
          ":16  const PHI = (1 + Math.sqrt(5)) / 2;",
          ":93-94  // Triangular lattice of circle centers, keeping everything within \"rings\"",
          "        const lattice = (rings) => {",
          ":101    if (Math.hypot(x, y) <= rings + 1e-9) pts.push([x, y]);",
          ":204    \"The Seed of Life continued outward on a triangular lattice. Two rings give the classic nineteen-circle flower carved on the Osirion at Abydos; keep going and the rosettes tile the plane forever.\"",
        ],
      },
    ],
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
    documents: [
      {
        title: "大阿卡纳 22 张（牌名 `name.zh`，`dist/data/major-arcana.js`）",
        lines: [
          "愚者(:6)／魔術師(:128)／女祭司(:250)／女皇(:372)／皇帝(:494)／教皇(:616)／戀人(:738)／戰車(:860)／力量(:982)／隱士(:1104)",
          "命運之輪(:1226)／正義(:1348)／吊人(:1470)／死神(:1592)／節制(:1714)／惡魔(:1836)／高塔(:1958)／星星(:2080)／月亮(:2202)／太陽(:2324)",
          "審判(:2446)／世界(:2568)",
          "每张牌块字段：id / name{en,zh} / arcana:\"major\" / suit:null / number / description / coreKeyword / meaning{upright,reversed} / readingAspects / contextualMeanings",
        ],
        note: "名称逐字取自该包 `name.zh`（繁体照录，不作规范化）；`number` 取 0…21（愚者 0、世界 21）。行号为本仓安装的 `@cometpisces/tarot-kit@0.2.0`。",
      },
      {
        title: "小阿卡纳 4 花色 × 14 张（`dist/data/{wands,cups,swords,pentacles}.js`）",
        lines: [
          "權杖（wands）：權杖一(:6) 權杖二(:128) 權杖三(:250) 權杖四(:372) 權杖五(:494) 權杖六(:616) 權杖七(:738) 權杖八(:860) 權杖九(:982) 權杖十(:1104) 權杖侍者(:1226) 權杖騎士(:1348) 權杖王后(:1470) 權杖國王(:1592)",
          "聖杯（cups）：聖杯一 … 聖杯國王（14 名同构，行号同 wands 文件）",
          "寶劍（swords）：寶劍一 … 寶劍國王（14 名同构，行号同 wands 文件）",
          "錢幣（pentacles）：錢幣一 … 錢幣國王（14 名同构，行号同 wands 文件）",
          "78 = 22 大阿卡纳 + 4 × 14 小阿卡纳（`dist/data/cards.js`：`export const cards = [...majorArcana, ...minorArcana];`；`dist/data/minor-arcana.js`：`cups/pentacles/swords/wands` 四组串联）",
        ],
        note: "花色名照该包中文：權杖 / 聖杯 / 寶劍 / 錢幣——其中 `pentacles` 该包中文作「錢幣」（非「星幣」）。1–10 作汉数字，宫廷牌作「侍者／騎士／王后／國王」（对应 Page/Knight/Queen/King）。",
      },
      {
        title: "正逆位取用方式（`dist/helpers/draw.js:22-25`、`dist/types/card.d.ts:5-8,34-37`、`dist/types/common.d.ts:1`）",
        lines: [
          ":22-25  export const getCardMeaning = (drawn, lang = \"en\") => { return drawn.orientation === \"upright\" ? drawn.card.meaning.upright[lang] : drawn.card.meaning.reversed[lang]; };",
          ":5-8   export interface TarotCardMeaning { upright: LocalizedText; reversed: LocalizedText; }",
          ":34-37  export interface DrawnCard { card: TarotCard; orientation: CardOrientation; }",
          ":1   export type SupportedLanguage = \"en\" | \"zh\";",
          "本仓 `src/lib/tarot/reading.ts:1,21`：name: card.name.zh ?? card.name.en；keyword: card.coreKeyword.zh ?? card.coreKeyword.en；meaning: getCardMeaning({ card, orientation: reversed ? \"reversed\" : \"upright\" }, \"zh\")",
        ],
        note: "正逆位即由 `orientation` 择 `meaning.upright` / `meaning.reversed`，中文取 `zh` 字段；抽出方向为 50% 概率（`draw.js:5,19`），本仓以出生资料作确定性伪随机以保证可复现。",
      },
    ],
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
    documents: [
      {
        title: "十干四化表（`lib/data/heavenlyStems.js:29-88`；顺序【禄，权，科，忌】）",
        lines: [
          "甲：廉贞 破军 武曲 太阳　（:34  mutagen: ['lianzhenMaj', 'pojunMaj', 'wuquMaj', 'taiyangMaj']）",
          "乙：天机 天梁 紫微 太阴　（:40  ['tianjiMaj', 'tianliangMaj', 'ziweiMaj', 'taiyinMaj']）",
          "丙：天同 天机 文昌 廉贞　（:46  ['tiantongMaj', 'tianjiMaj', 'wenchangMin', 'lianzhenMaj']）",
          "丁：太阴 天同 天机 巨门　（:52  ['taiyinMaj', 'tiantongMaj', 'tianjiMaj', 'jumenMaj']）",
          "戊：贪狼 太阴 右弼 天机　（:57  ['tanlangMaj', 'taiyinMaj', 'youbiMin', 'tianjiMaj']）",
          "己：武曲 贪狼 天梁 文曲　（:62  ['wuquMaj', 'tanlangMaj', 'tianliangMaj', 'wenquMin']）",
          "庚：太阳 武曲 太阴 天同　（:68  ['taiyangMaj', 'wuquMaj', 'taiyinMaj', 'tiantongMaj']）",
          "辛：巨门 太阳 文曲 文昌　（:74  ['jumenMaj', 'taiyangMaj', 'wenquMin', 'wenchangMin']）",
          "壬：天梁 紫微 左辅 武曲　（:80  ['tianliangMaj', 'ziweiMaj', 'zuofuMin', 'wuquMaj']）",
          "癸：破军 巨门 太阴 贪狼　（:86  ['pojunMaj', 'jumenMaj', 'taiyinMaj', 'tanlangMaj']）",
          "顺序常量：`lib/data/stars.js:5`  export const MUTAGEN = ['sihuaLu', 'sihuaQuan', 'sihuaKe', 'sihuaJi'];",
        ],
        note: "星名 id→中文取自 `lib/i18n/locales/zh-CN/star.js`（如 lianzhenMaj=廉贞、pojunMaj=破军）。`heavenlyStems.js:15-27` 的文件头注释逐干亦列出同一表（甲乙丙丁…癸）。行号为本仓安装的 `iztro@2.6.1`。",
      },
      {
        title: "十二宫（`lib/data/constants.js:50-63` + `lib/i18n/locales/zh-CN/palace.js:4-17`）",
        lines: [
          "顺序（constants.js:51-62）：soulPalace / parentsPalace / spiritPalace / propertyPalace / careerPalace / friendsPalace / surfacePalace / healthPalace / wealthPalace / childrenPalace / spousePalace / siblingsPalace",
          "中文（palace.js:4-17）：命宫 / 父母 / 福德 / 田宅 / 官禄 / 仆役 / 迁移 / 疾厄 / 财帛 / 子女 / 夫妻 / 兄弟",
          "另有：身宫（bodyPalace）、来因（originalPalace）（palace.js:5,17）",
        ],
        note: "两表按同一宫位索引一一对应；行号为本仓安装的 `iztro@2.6.1`。",
      },
      {
        title: "十四主星与辅曜名单（`lib/i18n/locales/zh-CN/star.js:4-31`）",
        lines: [
          "十四主星（:4-17）：紫微 天机 太阳 武曲 天同 廉贞 天府 太阴 贪狼 巨门 天相 天梁 七杀 破军",
          "主辅十四曜（:18-31）：左辅 右弼 文昌 文曲 禄存 天马 擎羊 陀罗 火星 铃星 天魁 天钺 地空 地劫",
          "（:32-166 为其余杂曜、长生十二神、博士十二神、岁前/将前诸神与运限星，本仓按库直接取用）",
        ],
        note: "id↔中文对照即该文件；本仓不改该库。",
      },
    ],
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
    documents: [
      {
        title: "《渊海子平》· 论五行生剋制化",
        lines: [
          "金旺得火，方成器皿；火旺得水，方成相济；水旺得土，方成池沼；土旺得木，方能疏通；木旺得金，方成栋樑。",
          "强金得水，方挫其锋；强水得木，方泄其势；强木得火，方化其顽；强火得土，方止其燄；强土得金，方制其害。",
        ],
        note: "源文件：八字 - 渊海子平.txt（原项目语料摘录，本仓未逐字校对）。本摘录无 editorial（全部照语料转录）。",
      },
      {
        title: "《渊海子平》· 论日为主、论月令",
        lines: [
          "取日干为主，以年为根，以月为苗，以日为花，以时为果；以生旺死绝休囚制化，决人生休咎。",
          "以日为主，年为本，月为提纲，时为辅佐。大要看日加临于甚度，或身旺、身弱；又看地支有何格局，金木水火土之数；后看月令中何者旺，又看岁运有何旺。",
        ],
        note: "源文件：八字 - 渊海子平.txt。本摘录无 editorial。",
      },
      {
        title: "《渊海子平》· 论大运",
        lines: [
          "子平之法，大运看支，岁君看干，交运同接木。月令者，天元也，今运就月上起；月之用神，则知其格。",
          "此乃死法譬喻，须随格局喜忌推之，不可执一；妙在识其通变。大运不宜与太岁相剋、相冲者凶，更刑、冲、相剋者亦忌；岁运相生者吉。",
        ],
        note: "源文件：八字 - 渊海子平.txt。本摘录无 editorial。",
      },
      {
        title: "《渊海子平》· 论正财",
        lines: [
          "故财要得时，不要财多。若财多则自家日主有力，可以胜任。力不任财，祸患百出；或中年、末年复临父母之乡，或三合可以助我者，则勃然而兴。",
          "财多生官，要须身健。财多盗气，本自身柔；又云正财者喜身旺、印綬，忌官星、忌倒食、忌身弱、比肩劫财。",
        ],
        note: "源文件：八字 - 渊海子平.txt。本摘录无 editorial。",
      },
      {
        title: "《渊海子平》· 正官论、论七杀",
        lines: [
          "大抵要行官旺乡，月令是也。月令者，提纲也。看命先看提纲，方看其馀。正官乃贵气之物，大忌刑冲破害；又曰喜身旺、印綬。",
          "七杀者，亦名偏官，喜身旺合杀、喜制伏、喜阳刃；忌身弱、忌见财，生忌无制。七杀不可便言凶。",
          "【editorial·本仓现代编者按，非原文，禁止挂书名引用】七杀的吉凶还须看身旺身弱、制伏与岁运的配合。",
        ],
        note: "源文件：八字 - 渊海子平.txt。末一行为 `editorial`（本仓现代说明），非古籍原文。",
      },
      {
        title: "《渊海子平》· 论伤官",
        lines: [
          "伤官务要伤尽；伤之不尽，官来乘旺，其祸不可胜言。伤官见官，为祸百端。",
          "伤官者，我生彼之谓也，亦名盗气。若伤官不尽，四柱有官星露，岁运若见官星；如遇伤官者，须见其财为妙，是财能生官也。",
        ],
        note: "源文件：八字 - 渊海子平.txt。本摘录无 editorial。",
      },
      {
        title: "《渊海子平》· 论食神",
        lines: [
          "食神者，生我财神之谓也。恒不喜见官星，忌倒食，恐伤其食神；喜财神相生。却喜身旺，不喜印綬，亦恐伤其食神也；如运得地，方可发福。",
          "食神有气胜财官，先要他强旺本干；若是反伤来夺食，忙忙辛苦祸千般。",
        ],
        note: "源文件：八字 - 渊海子平.txt。本摘录无 editorial。",
      },
      {
        title: "《渊海子平》· 论印綬",
        lines: [
          "所谓印？生我者，即印綬也。印綬畏财，财能反伤我；喜官星生印，忌财旺破印。",
          "大凡月与时上见者为妙，而月上最为紧要。如带印綬，须带官星，谓之官印两全；若用官不显，用印綬为妙。",
        ],
        note: "源文件：八字 - 渊海子平.txt。本摘录无 editorial。",
      },
      {
        title: "《渊海子平》· 论阳刃",
        lines: [
          "如命中有刃，不可便言凶，大率与七杀相似。喜偏官七杀，喜印綬；大要身旺，运行身旺之乡；不要见伤官、刃旺运。",
          "若命有刃无杀，岁运逢杀旺之乡，乃转生而反成厚福；如伤官财旺，身弱杀旺，最可忌也。",
        ],
        note: "源文件：八字 - 渊海子平.txt。本摘录无 editorial。",
      },
      {
        title: "《三命通会》· 论五行旺相休囚死并寄生十二宫",
        lines: [
          "盛德乘时曰旺。如春木旺，旺则生火，火乃木之子，子乘父业，故火相；木用水生，生我者父母，今子嗣得时，而生我者当知退矣，故水休。",
          "夏火旺，火生土则土相；秋金旺，金生水则水相；冬水旺，水生木则木相。四时之序，节满即谢，五行之性，功成必复。",
        ],
        note: "源文件：八字 - 三命通会.txt。本摘录无 editorial。",
      },
      {
        title: "《三命通会》· 论大运",
        lines: [
          "探命之说先以三元、四柱、五行、生死、格局致合以定根基，然后考究运气，协而从之以定平生之吉凶。阳男阴女，大运以生日后未来节气日时为数，顺而行之；阴男阳女，以生日前过去节气日时为数，逆而行之。",
          "凡行运，在干兼用地支之神，在支则弃天干之物。用神者欲运生之；弱欲运引进旺乡；官欲运生，不欲运伤；财欲运扶，不欲运劫。",
        ],
        note: "源文件：八字 - 三命通会.txt。本摘录无 editorial。",
      },
      {
        title: "《三命通会》· 论太岁",
        lines: [
          "其逐年太岁游行十二宫，定一年之祸福，为四时之吉凶。盖太岁如君也，大运如臣也；如君臣和悦，其年则吉，若值刑战，其年则凶。",
          "【editorial·本仓现代编者按，非原文，禁止挂书名引用】若五行有救、四柱有情，仍须结合原局与行运详审，不可只凭流年一字作断。",
        ],
        note: "源文件：八字 - 三命通会.txt。末一行为 `editorial`（本仓现代说明），非古籍原文。",
      },
    ],
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
    documents: [
      {
        title: "taibu-core types.d.ts · 课体字段原码",
        lines: [
          "/** 课体信息 */",
          "export interface KetiInfo {",
          "    /** 取传课体（贼克/比用/涉害/遥克/昴星/伏吟/返吟/别责/八专） */",
          "    method: string;",
          "    /** 细分课体名（蒿失/弹射/元首/重审等） */",
          "    subTypes: string[];",
          "    /** 第二维度课体（三交/六仪/铸印等） */",
          "    extraTypes: string[];",
          "}",
        ],
        note: "取自本仓安装的 `taibu-core@3.5.0` dist/domains/daliuren/types.d.ts:105-113。",
      },
    ],
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
    documents: [
      {
        title: "維基文庫《皇極經世》卷十三 · 元會運世與世首原文（逐字照錄）",
        lines: [
          "「易之生數一十二萬九千六百，為四千三百二十。此消長之大數，演三十年之辰數，即其數也。歲三百六十日，得四千三百二十辰，以三十乘之，得其數矣。凡甲子、甲午為世首，此為經世之數，始于日甲、月子、星甲、辰子。又云：此經世日甲之數，月子、星甲、辰子從之也。」",
          "同卷：「三百六十變為十二萬九千六百，十二萬九千六百變為一百六十七億九千六百一十六萬，……以三百六十為時，以一十二萬九千六百為日，以一百六十七億九千六百一十六萬為月，以二萬八千二百一十一兆九百九十萬七千四百五十六億為年，則大小運之數立矣。」",
          "同卷：「十二萬九千六百分而為十二，以當一日十二時之數，而進退六日矣。三百六十以當一時之數，隨小運之進退，以當晝夜之時也。」",
        ],
        note:
          "來源：https://zh.wikisource.org/wiki/皇極經世/卷十三 （維基文庫標點排版本，非四庫影本行款）。此段給出：生數 129600、四千三百二十世、三十年之辰數、歲三百六十日 × 四千三百二十辰 × 三十 = 129600，以及「凡甲子、甲午為世首」；並有 12 / 30 / 12 / 30 的分層（分而為十二、分而為三十）。四庫本與它本文字略異：《皇極經世書 (四庫全書本)/卷13》作「……為四千三百二十比消長之大數」，《性理大全書 (四庫全書本)/卷12》引作「……總為四千三百二十世，此消長之大數」——差異出自維基文庫 OCR／傳抄。**「十二會」以十二支為名（子丑寅…）未見於此段原文，屬通行說法。**",
      },
      {
        title: "元会运世构造（邵雍《皇极经世书》「元会运世」之说）",
        lines: [
          "1 元 = 12 会 = 360 运 = 4320 世 = 129600 年",
          "1 会 = 30 运 = 10800 年；1 运 = 12 世 = 360 年；1 世 = 30 年",
          "十二会以十二支为名：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥（本仓 `chronology.ts:138` 即按 `hui` 序号取 `EARTHLY_BRANCHES`）",
          "进制要目：「凡甲子、甲午為世首」——世首只在甲子、甲午两旬循环（维基文库《皇极经世》卷十三原文，见上一条）。",
          "邵伯温（邵雍之子）述一元之数：「……此《皇极经世》一元之数也。一元象一年，十二会，象十二月，三百六十运，象三百六十日，四千三百二十世，象四千三百二十时也。盖一年有十二月，三百六十日，四千三百二十时故也。《经世》一元，十二会，三百六十运，四千三百二十世，一世三十年，是为十二万九千六百年，是为《皇极经世》一元之数。……其法皆十二、三十相乘，十二、三十，日月之数也。」",
        ],
        note:
          "依据：邵雍《皇极经世书》卷十三原文（公共领域，见上一条逐字引文）给出 129600 生数与「四千三百二十世／三十年之辰數／甲子甲午為世首」；总数与进位另见上游 `src/evidence.ts` 的 `cycle-hierarchy`（自标 PRIMARY_EXPLICIT）。「一元十二会、一会三十运、一运十二世、一世三十年」这一分层，另见**邵伯温述一元之数**（上引，公共领域；**本仓系二手引文**——转引自维基百科《皇极经世》条目所引邵伯温语，未直取原书刻本，故请按二手对待）。129600 年这一总数同时见本仓 `chronology.ts:142` 的 disclaimer。",
      },
      {
        title: "本仓纪元锚点与常数（`src/lib/huangji/chronology.ts:18-29`，逐行照录）",
        lines: [
          ":18  export const YEARS_PER_SHI = 30;",
          ":19  export const SHI_PER_YUN = 12;",
          ":20  export const YUN_PER_HUI = 30;",
          ":21  export const HUI_PER_YUAN = 12;",
          ":22  export const YEARS_PER_YUN = YEARS_PER_SHI * SHI_PER_YUN;          // = 360",
          ":23  export const YEARS_PER_HUI = YEARS_PER_YUN * YUN_PER_HUI;          // = 10800",
          ":24  export const YEARS_PER_YUAN = YEARS_PER_HUI * HUI_PER_YUAN;        // = 129600",
          ":26  /** 第一元第一年：公元前 67017 年（由传世本历史锚点反推）。 */",
          ":27  export const EPOCH_BCE_YEAR = 67_017;",
          ":28  /** 天文纪年（公元前 1 年为 0）。 */",
          ":29  export const EPOCH_ASTRONOMICAL_YEAR = 1 - EPOCH_BCE_YEAR;         // = -67016",
          ":142  disclaimer: \"研究性纪年换算：一元 = 12 会 = 360 运 = 4320 世 = 129600 年，纪元取公元前 67017 年为甲子（由传世本历史锚点反推），无公元 0 年。…\"",
        ],
        note: "行号为本仓 `src/lib/huangji/chronology.ts`；注释 @:22-@:24 的等值数（360 / 10800 / 129600）为该三行乘式的算术结果。",
      },
      {
        title: "本仓：公历年 → 元会运世 逐步换算（`src/lib/huangji/chronology.ts:103-144`）",
        lines: [
          ":104-106  天文年 = (BCE ? 1 − 年份 : 年份)；offset = 天文年 − EPOCH_ASTRONOMICAL_YEAR；ordinalFromEpoch = offset + 1",
          ":111-113  yuanZeroBased = floor(offset / YEARS_PER_YUAN)；yearInYuan = offset mod YEARS_PER_YUAN；yuan.number = yuanZeroBased + 1",
          ":115-116  huiZeroBased = floor(yearInYuan / YEARS_PER_HUI)；yearInHui = yearInYuan mod YEARS_PER_HUI；hui.number = huiZeroBased + 1",
          ":118-120  yunZeroBased = floor(yearInYuan / YEARS_PER_YUN)；yun.numberWithinHui = floor(yearInHui / YEARS_PER_YUN) + 1；yearInYun = yearInYuan mod YEARS_PER_YUN",
          ":122-125  shiZeroBased = floor(yearInYuan / YEARS_PER_SHI)；shi.numberWithinYun = floor(yearInYun / YEARS_PER_SHI) + 1；yearInShi = yearInYuan mod YEARS_PER_SHI",
          ":127-129  干支年：sexagenaryIndex = offset mod 60；stem = HEAVENLY_STEMS[index]；branch = EARTHLY_BRANCHES[index]",
          ":137  yuan.stem = HEAVENLY_STEMS[yuanNumber − 1]",
          ":138  hui.branch = EARTHLY_BRANCHES[huiZeroBased]",
          ":139  yun.stem = HEAVENLY_STEMS[yunZeroBased]",
          ":140  shi.branch = EARTHLY_BRANCHES[shiZeroBased]",
          ":137-140  yuan.year = yearInYuan + 1；hui.year = yearInHui + 1；yun.year = yearInYun + 1；shi.year = yearInShi + 1",
        ],
        note: "干支标签约定「元、运循十干；会、世循十二支」出自上游 `src/evidence.ts` 的 `coordinate-labels`（自标 PRIMARY_DERIVED：「由原书连续标题及尧时坐标归纳」）。以上每一步均照本仓代码转写，行号为 `src/lib/huangji/chronology.ts`。",
      },
      {
        title: "上游原件（Ryanlyly-ai/huangji-jingshi, MIT, main 分支）",
        lines: [
          "src/constants.ts  YEARS_PER_SHI = 30；SHI_PER_YUN = 12；YUN_PER_HUI = 30；HUI_PER_YUAN = 12；EPOCH_BCE_YEAR = 67_017；EPOCH_ASTRONOMICAL_YEAR = 1 - EPOCH_BCE_YEAR",
          "https://raw.githubusercontent.com/Ryanlyly-ai/huangji-jingshi/main/src/constants.ts",
          "src/chronology.ts  calculateHuangji() 的 offset / yuan / hui / yun / shi / sexagenaryIndex 逐步与本仓一致（元标名作 calculateHuangji，本仓导出名作 calculateHuangjiChronology）",
          "https://raw.githubusercontent.com/Ryanlyly-ai/huangji-jingshi/main/src/chronology.ts",
          "src/evidence.ts  cycle-hierarchy（PRIMARY_EXPLICIT）／shi-heads（PRIMARY_EXPLICIT）／epoch-bce-67017（PRIMARY_DERIVED）／coordinate-labels（PRIMARY_DERIVED）",
          "https://raw.githubusercontent.com/Ryanlyly-ai/huangji-jingshi/main/src/evidence.ts",
        ],
        note: "上游 `epoch-bce-67017` 条目自注（逐字）：「由第 2232 世甲午对应公元前 87 年及第 2253 世甲子对应公元 544 年独立反推。」",
      },
    ],
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
    documents: [
      {
        title: "内容模块清单（本仓 `src/lib/fourth-way/content.ts:29-150`，共 12 节）",
        lines: [
          "laws 宇宙法则总纲：三律 + 七律；九型图内三角 3-6-9 对应三律、外圈 1-4-2-8-5-7 对应七律",
          "law-of-three 三律：主动力（肯定/阳）、被动力（否定/阴）、中和力（第三力）",
          "law-of-seven 七律：八度 Do–Re–Mi–Fa–Sol–La–Si；断点 Mi→Fa、Si→Do；1/7 = 0.142857… → 1-4-2-8-5-7",
          "ray 创造之光「法则数量」：绝对者→一切世界→一切太阳→我们的太阳→一切行星→地球→月球；法则数 1→3→6→12→24→48→96",
          "octaves 八度与氢表：H6 起逐级加倍至 H3072；三个食物八度（普通食物/空气/印象）",
          "centers 中心：理智/情感/运动/本能/性；另高等情感、高等理智；各中心分主动/被动/中和",
          "many-i 人是一台机器与诸多「我」；本质（essence）/个性（personality）",
          "four-ways 三条传统之道（Fakir 苦行僧/Monk 僧侣/Yogi 瑜伽士）与第四道",
          "man-seven 人的七个类型（Man No.1–7）",
          "practice 自我观察与记住自己（self-remembering）",
          "bodies 人的四个身体（肉体/自然体/精神体/因果体）",
          "sources 文献线索（邬斯宾斯基《探索奇迹》、葛吉夫《别西卜讲给孙子的故事》《与奇人相遇》）",
        ],
        note: "每节含 `id/title/summary/points`；本模块只作知识条目展示，无计算逻辑。",
      },
      {
        title: "法则数序列与氢表（本仓 `content.ts:66, 75-76`，逐句照录）",
        lines: [
          ":66  「每一层所受的法则数递增：1 → 3 → 6 → 12 → 24 → 48 → 96。」",
          ":75  「同一「氢」可在不同尺度上出现；氢表从 H6 起逐级加倍，一直到 H3072，表示由高到低的密度。」",
          ":76  「人有三个食物八度：普通食物、空气、印象（impressions）。」",
          "（H 表「逐级加倍」的算术展开：H6 → H12 → H24 → H48 → H96 → H192 → H384 → H768 → H1536 → H3072——系对该句的算术展开，原文未另列逐项。）",
        ],
        note: "以上为本仓整理（非算法、无逐字古籍出处）；H 值数列由「逐级加倍」一句直接展开。",
      },
      {
        title: "人的七个类型 Man No.1–7（本仓 `content.ts:114-118`，逐句照录）",
        lines: [
          ":115  「No.1 身体/本能型、No.2 情感型、No.3 理智型——都是「睡着的」普通人，只是主导中心不同。」",
          ":116  「No.4（已形成磁心、有持久目标并在「学校」中工作）、No.5、No.6 是发展中的层次，内在逐渐趋于统一。」",
          ":117  「No.7 是「没有引号的人」：拥有持久而统一的「我」，不再受制于小我的轮替。」",
        ],
        note: "通行说法整理，本仓无逐字古籍出处。",
      },
    ],
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
    documents: [
      {
        title: "感情线权重 `RELATIONSHIP_WEIGHTS`（本仓 `src/lib/qimen/kline.ts:51-72`，逐值）",
        lines: [
          "samePalace 乙庚同宫: 14",
          "branchPair 乙庚宫地支相合: 5",
          "branchClash 乙庚宫地支相冲: −6",
          "voidness 宫位空亡: −4",
          "gatePressure 门迫: −3",
          "postHorse 驿马: 2",
          "wuBuYuShi 五不遇时: −2",
          "outletSamePalace 值使宫与乙庚宫同宫: 4",
          "outletRelationFactor 值使与乙庚宫的五行关系折算系数: 0.55",
          "outletStructureFactor 值使宫格局对出口可执行性的折算系数: 0.6",
        ],
        note: "本仓代码注释自述（kline.ts:37-50）：「These are product heuristics, not quantities taken from any canonical text」——即**本仓自撰启发式**，并按 `samePalace > branchPair/branchClash > minor signals` 的相对序调参。",
      },
      {
        title: "分时口径权重 `relationshipProfiles`（本仓 `kline.ts:107-112`，逐值）",
        lines: [
          "double-hour（时辰）：axis 1.3 / outlet 1.25 / context 0.8",
          "day（日）：axis 1.15 / outlet 1.1 / context 0.95",
          "month（月）：axis 0.9 / outlet 0.95 / context 1.25",
          "year（年）：axis 0.7 / outlet 0.8 / context 1.4",
        ],
        note: "axis/context/outlet 分别缩放「乙庚主轴」「宫位格局背景」「值使出口」三类权重。",
      },
      {
        title: "阶段分 `STAGE_SCORE`（本仓 `src/lib/research/trend.ts:15-28`，逐值）",
        lines: [
          "帝旺 3；临官 2；长生 2；冠带 1；养 1；沐浴 0；胎 0；衰 −1；墓 −2；病 −2；死 −3；绝 −3",
          "人生线总分（trend.ts:50-58）：STAGE_SCORE[大运 diShi] + STAGE_SCORE[流年 diShi]，再按下列词表逐词 +1/−1，最后 clamp(−8, 8)",
          "SUPPORT_TERMS（trend.ts:30）= 天乙贵人 / 太极贵人 / 福星贵人 / 文昌 / 天喜 / 红鸾 / 三合 / 六合",
          "REVIEW_TERMS（trend.ts:31）= 六冲 / 相刑 / 相害 / 冲太岁 / 刑太岁 / 害太岁 / 破太岁 / 白虎 / 劫煞 / 灾煞 / 亡神",
        ],
        note: "十二长生的分值序列为本仓所定（不是古籍给出的数值）。",
      },
      {
        title: "线型权重与关键点判据（本仓 `kline.ts:127-157,318-329,343-353`；`trend.ts:60-68,131`）",
        lines: [
          "gateSignal（kline.ts:127）：休门/生门/开门 +3；死门/惊门/伤门/杜门 −3；余 0",
          "deitySignal（kline.ts:128）：六合/太阴/九地 +2；白虎/玄武/腾蛇 −2；余 0",
          "starSignal（kline.ts:129）：天心/天辅/天任/天英 +2；天芮/天柱/天禽 −2；余 0",
          "palaceRelation（kline.ts:131-138，五行）：同气 +2；相生 +5；相克 −5；否则 0",
          "palaceStructureSignal（kline.ts:140-157）：旺相 +2；囚死 −2；入墓 −2；六仪击刑 −3；吉格 +min(2, n)；凶格 −min(2, n)；十干克应有生合 +1 / 有克刑 −1",
          "phaseFor(delta)（kline.ts:318-319）：delta ≥ 4 → 上行；delta ≤ −4 → 下行；否则 震荡",
          "K 线 candle（kline.ts:343-353）：分数初值 50；range = clamp(round(4 + |delta|×0.45 + evidence.length×0.35), 4, 12)；high = clamp(max(open, close) + ⌈range/2⌉)；low = clamp(min(open, close) − ⌊range/2⌋)",
          "keyPointReason（kline.ts:328-329）：index 0 → 序列起点；末点 → 序列终点；|delta| ≥ 8 → 分数跃迁；score ≥ 70 → 进入高位区间；score ≤ 30 → 进入低位区间",
          "人生线 candle（trend.ts:60-68）：close = clamp(50 + score×5, 12, 88)；open = 上一 close；high = clamp(max(open, close) + 3 + 支持数×2, 0, 100)；low = clamp(min(open, close) − 3 − 待核数×2, 0, 100)",
          "人生线 keyPoint（trend.ts:131）：index 0 → 起运序列起点；末点 → 当前资料终点；|delta| ≥ 8 → 结构跃迁；score ≥ 70 → 高位区间；score ≤ 30 → 低位区间",
        ],
        note: "以上全部为**本仓自撰启发式**（门/神/星的吉凶分值、五行生克分、关键点阈值、candle 区间公式），不是古籍算法；同一输入恒得同一分数与蜡烛几何。",
      },
    ],
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
    documents: [
      {
        title: "hd-chart-engine dist/index.js · 天轮与门宽原码",
        lines: [
          ":61-66  var WHEEL_START = 223.25; var GATE_WIDTH = 5.625; var LINE_WIDTH = GATE_WIDTH / 6; var COLOR_WIDTH = LINE_WIDTH / 6; var TONE_WIDTH = COLOR_WIDTH / 6; var BASE_WIDTH = TONE_WIDTH / 5;",
          ":137-138  const offset = (lon - WHEEL_START + 360) % 360; const wheelIndex = Math.floor(offset / GATE_WIDTH);",
          ":155  const targetLon = ((pSunLon - 88) % 360 + 360) % 360;",
        ],
        note: "取自 npm `hd-chart-engine@0.1.1` 的 dist 打包行号。门宽为 5.625°（360/64）；固定起点 223.25°＝13°15′ 天蝎（黄经）。",
      },
    ],
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
    documents: [
      {
        title: "聚合字段（本仓 `src/lib/combined/serializer.ts:26-43`）",
        lines: [
          "JSON 顶层（:37-42）：{ format: \"meta-llm-combined-v1\", note: \"三盘联合阶段一仅做聚合，不包含程序断语。\", timeBasis, input, charts: { qimen, bazi, ziwei } }",
          "charts 每项类型（:3-7）：{ format: string; payload: unknown; structuredText?: string }",
          "即聚合**三盘的既有结果对象**（奇门/八字/紫微各自的 payload 与 structuredText），不新增派生量。",
        ],
        note: "行号为本仓 `src/lib/combined/serializer.ts`。",
      },
      {
        title: "分时口径（本仓 `serializer.ts:15-24`；`chart-times.ts:11-25`）",
        lines: [
          "默认（未勾选）：{ combined: datetime }——三盘共用同一出生时间",
          "勾选 splitChartTimes 且给出 questionDatetime：{ note: \"奇门用问事起局时间，八字/紫微用出生时间。\", qimen: questionDatetime, bazi_ziwei: datetime }",
          "resolveQimenDatetime（chart-times.ts:11-12）：input.splitChartTimes && input.questionDatetime ? input.questionDatetime : input.datetime",
          "toQimenProfileInput（chart-times.ts:21-25）：奇门改用问事时间时返回 { ...input, calendarMode: \"solar\", datetime: qimenDatetime, lunar: undefined }，否则同源返回原对象",
        ],
        note: "界面上的真太阳时/平太阳时口径在 profile 归一化层处理（非本文件）；此处只区分「出生时间」与「问事起局时间」两个口径。",
      },
      {
        title: "「不产出自动断语」的边界（本仓 `serializer.ts:39` 与 `:61-77`）",
        lines: [
          ":39  note: \"三盘联合阶段一仅做聚合，不包含程序断语。\"",
          ":61-77  serializeCombinedToStructuredText 输出：输入总览（时间 / 时区 / 解析后的本地时间）＋ \"### 奇门\" / \"### 八字\" / \"### 紫微\" 三段各自的原 structuredText（未生成时写「未生成」）",
          ":55-59  分时口径在文本载荷里显式写出：\"时间口径: …\"、\"问事起局时间(奇门): …\"、\"出生时间(八字/紫微): …\"",
        ],
        note: "即三盘只被**并列**（原样嵌入 + 时间口径说明），聚合过程本身不合成任何吉凶判词或加权分数；断语只可能来自下游模型，且受此边界约束。",
      },
    ],
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
  daliuren: "大六壬",
  shared: "通用（许可与自撰声明）",
};
