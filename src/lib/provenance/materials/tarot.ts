/**
 * 「出处与原文」材料本体（逐字原文 / 整张数值表 / 源码行）——tarot。
 *
 * 由 `src/lib/provenance/registry.ts` 拆出：首屏不再打包这些长材料，
 * 只有读者真正需要时（面板内展开「出处与原文」、或打开「资料库」抽屉）才通过
 * `materials/manifest.ts` 的 `import()` 按体系载入。
 *
 * 键为条目 id，与 registry 中同名条目一一对应；逐字抄录与核对纪律见 registry 文件头。
 */
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "tarot-source": [
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
};
