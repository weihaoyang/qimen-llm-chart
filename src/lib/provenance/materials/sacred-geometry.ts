/**
 * 「出处与原文」材料本体（逐字原文 / 整张数值表 / 源码行）——sacred-geometry。
 *
 * 由 `src/lib/provenance/registry.ts` 拆出：首屏不再打包这些长材料，
 * 只有读者真正需要时（面板内展开「出处与原文」、或打开「资料库」抽屉）才通过
 * `materials/manifest.ts` 的 `import()` 按体系载入。
 *
 * 键为条目 id，与 registry 中同名条目一一对应；逐字抄录与核对纪律见 registry 文件头。
 */
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "sacred-geometry-source": [
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
};
