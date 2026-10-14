import type { ProvenanceEntry, ProvenanceEntryWithMaterials, ProvenanceMaterialSet, ProvenanceSystem } from "../types";

/**
 * 材料本体的按需加载表：体系 → 该体系的 `import()`。
 *
 * 每个加载器都是一个真正的动态 `import()`，打包器会把 `./<system>.ts` 切成独立 chunk，
 * 所以首屏 HTML/JS 里**不含**任何整段原文、整张数值表或源码行。
 * 触发点只有两个：面板内「出处与原文」被展开，或「资料库」抽屉被打开。
 */
export const PROVENANCE_MATERIAL_LOADERS = {
  astro: () => import("./astro").then((module) => module.MATERIALS),
  bazi: () => import("./bazi").then((module) => module.MATERIALS),
  "bazi-tcm": () => import("./bazi-tcm").then((module) => module.MATERIALS),
  combined: () => import("./combined").then((module) => module.MATERIALS),
  daliuren: () => import("./daliuren").then((module) => module.MATERIALS),
  "fourth-way": () => import("./fourth-way").then((module) => module.MATERIALS),
  huangji: () => import("./huangji").then((module) => module.MATERIALS),
  "human-design": () => import("./human-design").then((module) => module.MATERIALS),
  qimen: () => import("./qimen").then((module) => module.MATERIALS),
  qizheng: () => import("./qizheng").then((module) => module.MATERIALS),
  research: () => import("./research").then((module) => module.MATERIALS),
  runes: () => import("./runes").then((module) => module.MATERIALS),
  "sacred-geometry": () => import("./sacred-geometry").then((module) => module.MATERIALS),
  "taiyi-shenshu": () => import("./taiyi-shenshu").then((module) => module.MATERIALS),
  tarot: () => import("./tarot").then((module) => module.MATERIALS),
  uranian: () => import("./uranian").then((module) => module.MATERIALS),
  ziwei: () => import("./ziwei").then((module) => module.MATERIALS),
} satisfies Partial<Record<ProvenanceSystem, () => Promise<ProvenanceMaterialSet>>>;

const EMPTY_MATERIALS: ProvenanceMaterialSet = {};

/** 该体系是否有材料本体：没有的体系展开时不产生请求，也不显示载入状态。 */
export const hasMaterialsForSystem = (system: ProvenanceSystem): boolean =>
  system in PROVENANCE_MATERIAL_LOADERS;

/** 取回某体系的材料本体；该体系没有长材料时返回空集。 */
export const loadMaterialsForSystem = (system: ProvenanceSystem): Promise<ProvenanceMaterialSet> => {
  const load = PROVENANCE_MATERIAL_LOADERS[system as keyof typeof PROVENANCE_MATERIAL_LOADERS];
  return load ? load() : Promise.resolve(EMPTY_MATERIALS);
};

/**
 * 取回全部体系的材料本体（「资料库」用）。
 * 全文检索必须能命中原文本体（例如「前為外迫」只出现在材料里），所以资料库打开时
 * 一次性把材料取回；在此之前只检索条目元数据与短引文。
 */
export const loadAllMaterials = async (): Promise<ProvenanceMaterialSet> => {
  const sets = await Promise.all(Object.values(PROVENANCE_MATERIAL_LOADERS).map((load) => load()));
  return Object.assign({}, ...sets) as ProvenanceMaterialSet;
};

/** 把材料本体并回条目（列表渲染与全文检索都读合并后的条目）。 */
export const mergeMaterials = (
  entry: ProvenanceEntry,
  materials: ProvenanceMaterialSet,
): ProvenanceEntryWithMaterials => {
  const documents = materials[entry.id];
  return documents?.length ? { ...entry, documents } : entry;
};
