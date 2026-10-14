/**
 * 「出处与原文」材料本体（逐字原文 / 整张数值表 / 源码行）——human-design。
 *
 * 由 `src/lib/provenance/registry.ts` 拆出：首屏不再打包这些长材料，
 * 只有读者真正需要时（面板内展开「出处与原文」、或打开「资料库」抽屉）才通过
 * `materials/manifest.ts` 的 `import()` 按体系载入。
 *
 * 键为条目 id，与 registry 中同名条目一一对应；逐字抄录与核对纪律见 registry 文件头。
 */
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "human-design-source": [
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
};
