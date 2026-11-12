/**
 * 「出处与原文」材料本体（逐字原文 / 整张数值表 / 源码行）——runes。
 *
 * 由 `src/lib/provenance/registry.ts` 拆出：首屏不再打包这些长材料，
 * 只有读者真正需要时（面板内展开「出处与原文」、或打开「资料库」抽屉）才通过
 * `materials/manifest.ts` 的 `import()` 按体系载入。
 *
 * 键为条目 id，与 registry 中同名条目一一对应；逐字抄录与核对纪律见 registry 文件头。
 */
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "runes-source": [
    {
      title: "符文诗之间的词义差异",
      lines: [
        "Thurisaz：古英语为刺，挪威与冰岛为巨人。",
        "Ansuz：古英语 Os 诗节与言语相关，词源有争议；挪威 Óss 为河口，冰岛 Óss 为神。",
        "Kaunan：古英语 Cen 为火炬，挪威与冰岛 Kaun 为疮。",
        "Perthro：古英语 Peorth 诗节涉及宴厅游乐，骰杯是后世解释，词源未定。",
        "Algiz：古英语 Eolh-secg 为沼泽中能刺伤人的植物；麋鹿属重建名称，保护属现代占义。",
        "Tiwaz：古英语 Tir 诗节指向守信运行的标志或星，北欧诗节指独臂神。",
        "Ingwaz：古英语诗中是东丹人的 Ing；种子属现代象征。",
      ],
      note: "据 Dickins 1915 编译的三部符文诗及其校注。晚出的古英语和北欧诗各有字母变化，不能把所有释义都称作古弗萨克时代的直接记载。",
    },
    {
      title: "24 符文名与字形（runes-data.js 逐条，现代常见次序）",
      lines: [
        "Fehu ᚠ／Uruz ᚢ／Thurisaz ᚦ／Ansuz ᚨ／Raidho ᚱ／Kaunan ᚲ／Gebo ᚷ／Wunjo ᚹ",
        "Hagalaz ᚺ／Nauthiz ᚾ／Isa ᛁ／Jera ᛃ／Eihwaz ᛇ／Perthro ᛈ／Algiz ᛉ／Sowilo ᛊ",
        "Tiwaz ᛏ／Berkano ᛒ／Ehwaz ᛖ／Mannaz ᛗ／Laguz ᛚ／Ingwaz ᛜ／Dagaz ᛞ／Othala ᛟ",
      ],
    },
    {
      title: "两件铭文的字序对照",
      lines: [
        "Kylver 石刻：第13、14位为 p、ï，第23、24位为 d、o；首字受损。",
        "Vadstena 金饰：第13位为 ï，末两位读作 o、（d）；第14位存疑、末字部分受遮。",
        "本站为 ï、p 和 d、o 的组合，不能当作任何一件铭文的原样抄录。",
      ],
      note: "对照 RuneS 铭文数据库 G 88 与 IK 377,1；字形、转写和重建名不是同一层。https://www.runesdb.de/find/266 https://www.runesdb.de/find/179",
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
      note: "上游将名称、读音和三组划分称为传统；实际原始日耳曼语名称需根据后世证据重建，神名组名与主题为后世沿用。关键词、牌义及建议为上游自撰，非古籍原文。",
    },
    {
      title: "Fehu（ᚠ）在两部符文诗中的释义",
      lines: [
        "古英语符文诗 Feoh：财富能带来慰藉，也需要慷慨分配。",
        "挪威符文诗 Fé：财富可能引起亲族争端。",
      ],
      note: "据 Bruce Dickins 编译的 Runic and Heroic Poems (1915) 两首诗的首节概述。站内正逆位是现代抽取约定。",
    },
  ],
};
