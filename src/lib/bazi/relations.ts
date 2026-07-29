export type FiveElement = "木" | "火" | "土" | "金" | "水";
export type YinYang = "阳" | "阴";
export type ElementRelation = "同我" | "生我" | "我生" | "克我" | "我克";
export type TenGod =
  | "比肩"
  | "劫财"
  | "食神"
  | "伤官"
  | "偏财"
  | "正财"
  | "七杀"
  | "正官"
  | "偏印"
  | "正印";
export type TenGodGroup = "比劫" | "食伤" | "财星" | "官杀" | "印星";

type Trait = {
  element: FiveElement;
  yinYang: YinYang;
};

const STEM_TRAITS: Record<string, Trait> = {
  甲: { element: "木", yinYang: "阳" },
  乙: { element: "木", yinYang: "阴" },
  丙: { element: "火", yinYang: "阳" },
  丁: { element: "火", yinYang: "阴" },
  戊: { element: "土", yinYang: "阳" },
  己: { element: "土", yinYang: "阴" },
  庚: { element: "金", yinYang: "阳" },
  辛: { element: "金", yinYang: "阴" },
  壬: { element: "水", yinYang: "阳" },
  癸: { element: "水", yinYang: "阴" },
};

const BRANCH_TRAITS: Record<string, Trait> = {
  子: { element: "水", yinYang: "阳" },
  丑: { element: "土", yinYang: "阴" },
  寅: { element: "木", yinYang: "阳" },
  卯: { element: "木", yinYang: "阴" },
  辰: { element: "土", yinYang: "阳" },
  巳: { element: "火", yinYang: "阴" },
  午: { element: "火", yinYang: "阳" },
  未: { element: "土", yinYang: "阴" },
  申: { element: "金", yinYang: "阳" },
  酉: { element: "金", yinYang: "阴" },
  戌: { element: "土", yinYang: "阳" },
  亥: { element: "水", yinYang: "阴" },
};

const GENERATES: Record<FiveElement, FiveElement> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const CONTROLS: Record<FiveElement, FiveElement> = {
  木: "土",
  火: "金",
  土: "水",
  金: "木",
  水: "火",
};

export const getStemTrait = (stem: string) => STEM_TRAITS[stem] ?? null;

export const getBranchTrait = (branch: string) => BRANCH_TRAITS[branch] ?? null;

export const getElementRelation = (
  dayMasterStem: string,
  targetElement: FiveElement,
): ElementRelation | null => {
  const dayMasterTrait = getStemTrait(dayMasterStem);

  if (!dayMasterTrait) {
    return null;
  }

  const selfElement = dayMasterTrait.element;

  if (selfElement === targetElement) {
    return "同我";
  }

  if (GENERATES[targetElement] === selfElement) {
    return "生我";
  }

  if (GENERATES[selfElement] === targetElement) {
    return "我生";
  }

  if (CONTROLS[targetElement] === selfElement) {
    return "克我";
  }

  if (CONTROLS[selfElement] === targetElement) {
    return "我克";
  }

  return null;
};

export const getTenGod = (dayMasterStem: string, targetStem: string): TenGod | null => {
  const dayMasterTrait = getStemTrait(dayMasterStem);
  const targetTrait = getStemTrait(targetStem);

  if (!dayMasterTrait || !targetTrait) {
    return null;
  }

  const samePolarity = dayMasterTrait.yinYang === targetTrait.yinYang;
  const relation = getElementRelation(dayMasterStem, targetTrait.element);

  if (!relation) {
    return null;
  }

  switch (relation) {
    case "同我":
      return samePolarity ? "比肩" : "劫财";
    case "我生":
      return samePolarity ? "食神" : "伤官";
    case "我克":
      return samePolarity ? "偏财" : "正财";
    case "克我":
      return samePolarity ? "七杀" : "正官";
    case "生我":
      return samePolarity ? "偏印" : "正印";
  }
};

export const getTenGodGroup = (tenGod: string): TenGodGroup | null => {
  switch (tenGod) {
    case "比肩":
    case "劫财":
      return "比劫";
    case "食神":
    case "伤官":
      return "食伤";
    case "偏财":
    case "正财":
      return "财星";
    case "七杀":
    case "正官":
      return "官杀";
    case "偏印":
    case "正印":
      return "印星";
    default:
      return null;
  }
};

export const formatTraitLabel = (trait: Trait | null) =>
  trait ? `${trait.yinYang}${trait.element}` : "未知";
