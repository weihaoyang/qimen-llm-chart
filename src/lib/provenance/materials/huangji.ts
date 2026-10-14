/**
 * 「出处与原文」材料本体（逐字原文 / 整张数值表 / 源码行）——huangji。
 *
 * 由 `src/lib/provenance/registry.ts` 拆出：首屏不再打包这些长材料，
 * 只有读者真正需要时（面板内展开「出处与原文」、或打开「资料库」抽屉）才通过
 * `materials/manifest.ts` 的 `import()` 按体系载入。
 *
 * 键为条目 id，与 registry 中同名条目一一对应；逐字抄录与核对纪律见 registry 文件头。
 */
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "huangji-source": [
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
};
