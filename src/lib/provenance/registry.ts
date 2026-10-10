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
    citation: "本仓 `src/lib/taiyi/data.ts`；month 字段依卷二·推十六神所主法，其余为现代整理",
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
    citation: "npm `3meta`（lib/qimen/calculator.js、lib/qimen/QimenChart.js）",
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
    citation: "3meta `lib/qimen/calculator.js:15-21` getYuan；taobi `lib/pojo/taobi/TheArtOfBecomingInvisible.js:171` SPLIT",
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
    citation: "npm `celestine@0.2.1`",
    license: "MIT",
    url: "https://github.com/Anonyfox/celestine",
    note:
      "宫制沿用 celestine 默认 Placidus（界面与载荷已标注）；高纬约 |φ|>66° 时库内会自动回退，已在宫制说明中提示。本仓未纳入阿拉伯点以外的 lots 与恒星。",
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
    citation: "Astrolog `matrix.cpp`（`rgoe[]` 要素表、`ComputePlanets()`）",
    license: "GPL-2.0-or-later",
    url: "https://github.com/CruiserOne/Astrolog",
    note:
      "元素（平近点角/离心率/半长轴/近日点黄经/升交点/倾角，历元 J1900.0）与「解 Kepler→轨道面旋转→地心黄经」流程照上游；八虚星为 Witte 以来的**名义假想天体**。⚠ 其「原则」归词（家庭/悲伤/创造之火…）与中文名、缩写**均无具体文献出处**，属该体系通行的象征解释，不是计算事实，不得当作占星判据。本仓未采用 Swiss Ephemeris（AGPL）路径。",
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
    citation: "npm `@cometpisces/tarot-kit@0.2.0`",
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
    citation: "npm `iztro`（astro.bySolar / astro.byLunar）",
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
    citation: "npm `lunar-typescript@1.8.6`（MIT）＋ 本仓 `bazi-classics.ts` 摘录 ＋ `structure-audit.ts` 启发式",
    license: "MIT（历法库）；古籍摘录属公共领域",
    note:
      "四柱与十神等由 lunar-typescript 产出。古籍摘录**未经逐字校对**，界面与载荷都要求只能引作「据《书名·篇目》大意」，禁止当逐字原文；`editorial` 为本仓现代编者按，不得挂书名引用。旺衰权重、从格门槛、调候取用为**本仓启发式**，不是古籍固定算法。",
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
    citation: "Ryanlyly-ai/huangji-jingshi `src/chronology.ts`、`src/constants.ts`",
    license: "MIT",
    url: "https://github.com/Ryanlyly-ai/huangji-jingshi",
    note: "忠实移植并改写导出与文档注释，算法与原实现一致。上游为个人项目，本仓宜自持锚点校验。",
  },

  /* ───────────────────────── 第四道 / 阿卡西 / 研究 ───────────────────────── */
  {
    id: "fourth-way-content",
    system: "fourth-way",
    kind: "自撰/近似",
    status: "本仓自撰",
    title: "第四道内容模块（非算法体系）",
    citation: "葛吉夫／邬斯宾斯基体系通行说法整理（无计算逻辑）",
    note: "本模块只作知识条目展示，无可计算量；法则数序列、H6…H3072、Man No.1–7 等属通行说法。",
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
    citation: "本仓 `qimen/kline.ts`、`qimen/trend.ts`；可视化层移植自 `miounet11/life-kline`（Apache-2.0）",
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
    citation: "本仓 `src/lib/combined/serializer.ts`（阶段一）与 `chart-times.ts` 的分时口径",
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
