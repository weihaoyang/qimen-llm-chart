/**
 * 「出处与原文」材料本体（逐字原文 / 整张数值表 / 源码行）——ziwei。
 *
 * 由 `src/lib/provenance/registry.ts` 拆出：首屏不再打包这些长材料，
 * 只有读者真正需要时（面板内展开「出处与原文」、或打开「资料库」抽屉）才通过
 * `materials/manifest.ts` 的 `import()` 按体系载入。
 *
 * 键为条目 id，与 registry 中同名条目一一对应；逐字抄录与核对纪律见 registry 文件头。
 */
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "ziwei-iztro": [
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
};
