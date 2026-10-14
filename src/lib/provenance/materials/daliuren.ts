/**
 * 「出处与原文」材料本体（逐字原文 / 整张数值表 / 源码行）——daliuren。
 *
 * 由 `src/lib/provenance/registry.ts` 拆出：首屏不再打包这些长材料，
 * 只有读者真正需要时（面板内展开「出处与原文」、或打开「资料库」抽屉）才通过
 * `materials/manifest.ts` 的 `import()` 按体系载入。
 *
 * 键为条目 id，与 registry 中同名条目一一对应；逐字抄录与核对纪律见 registry 文件头。
 */
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "daliuren-upstream": [
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
};
