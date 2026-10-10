export type QimenDunType = "auto" | "yang" | "yin";
export type QimenJuNumber = "auto" | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type QimenYearDivide = "exact" | "normal";

/**
 * 用局法。
 *
 * 2026-10 定级（B，撤下）：产线只承认 `"default"` 一种口径。
 * - `"default"` 走的 3meta 主引擎，其定元规则本身就是拆补（符头）法：
 *   `(日干支序 / 5) % 3` 把六十甲子切成 5 日一元，恰等于「最近一个甲/己日为符头、
 *   其支属子午卯酉→上元 / 寅申巳亥→中元 / 辰戌丑未→下元」。
 *   证据：`node_modules/3meta/lib/qimen/calculator.js:16`（`getYuan`：
 *   上元含 甲子…戊辰、己卯…癸未、甲午…戊戌、己酉…癸丑）与
 *   `node_modules/taobi/lib/pojo/taobi/TheArtOfBecomingInvisible.js:171`
 *   （`SPLIT = ~~(this.date.index / 5) % 3`）逐项一致；
 *   采样盘（冬至后/夏至后/闰六月/子时/非子时共 14 例）两法局数全部相同，
 *   见 `./ju-methods.test.ts`。局数再由 `calculator.js:23` 的 `getJuShu(节气, 元, 阴阳遁)` 查表。
 * - `"split"` / `"maoshan"` 曾经由 `./taobi.ts` 适配 `taobi`（MPL-2.0），已撤下：
 *   上游自注 `@check FALSE`（`TheArtOfBecomingInvisible.js:154` 三元、`:325` 八神、
 *   `:202` 中宫寄法、`:69` 干支历），且实测会产出与展示四柱矛盾的盘、在宿主时区变化时
 *   结果不同、并会在常见时刻直接抛错。审计证据与实测表见 `./ju-methods.test.ts`。
 *
 * 这两个历史字面量保留在类型里，只为识别旧设置（localStorage / URL 参数）并把它们
 * 降级到默认口径；它们不会再产出任何跨引擎盘。`QimenMethod` 若被用来分支渲染，
 * 应只把 `"default"` 当作有效值（见 `SUPPORTED_QIMEN_JU_METHODS`）。
 */
export type QimenMethod = "default" | "split" | "maoshan";

export type QimenSettings = {
  method: QimenMethod;
  solarTerm: "auto" | string;
  dunType: QimenDunType;
  juNumber: QimenJuNumber;
  yearDivide: QimenYearDivide;
};

export const QIMEN_SOLAR_TERMS = [
  "冬至",
  "小寒",
  "大寒",
  "立春",
  "雨水",
  "惊蛰",
  "春分",
  "清明",
  "谷雨",
  "立夏",
  "小满",
  "芒种",
  "夏至",
  "小暑",
  "大暑",
  "立秋",
  "处暑",
  "白露",
  "秋分",
  "寒露",
  "霜降",
  "立冬",
  "小雪",
  "大雪",
] as const;

export const SUPPORTED_QIMEN_METHODS = ["节气", "阴阳遁", "局数", "年界"] as const;
/**
 * 可选用局法。只报「默认」：默认口径本身即拆补（符头）定元，
 * 产线没有并列的第二套局法，因此不再提供「拆补 / 茅山」选项。
 */
export const SUPPORTED_QIMEN_JU_METHODS = ["默认"] as const;

/**
 * 明确不支持的局法。撤下的「拆补 / 茅山」并入此列，与「置闰 / 飞盘」同级别：
 * 界面不得把它们渲染成可选口径。
 */
export const UNSUPPORTED_QIMEN_METHODS = ["拆补", "茅山", "置闰", "飞盘"] as const;

export const DEFAULT_QIMEN_SETTINGS: QimenSettings = {
  method: "default",
  solarTerm: "auto",
  dunType: "auto",
  juNumber: "auto",
  yearDivide: "exact",
};
