/**
 * 「出处与原文」材料本体（逐字原文 / 整张数值表 / 源码行）——combined。
 *
 * 由 `src/lib/provenance/registry.ts` 拆出：首屏不再打包这些长材料，
 * 只有读者真正需要时（面板内展开「出处与原文」、或打开「资料库」抽屉）才通过
 * `materials/manifest.ts` 的 `import()` 按体系载入。
 *
 * 键为条目 id，与 registry 中同名条目一一对应；逐字抄录与核对纪律见 registry 文件头。
 */
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "combined-aggregate": [
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
};
