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
};
