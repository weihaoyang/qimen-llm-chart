export type QimenDunType = "auto" | "yang" | "yin";
export type QimenJuNumber = "auto" | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type QimenYearDivide = "exact" | "normal";
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
export const SUPPORTED_QIMEN_JU_METHODS = ["默认", "拆补", "茅山"] as const;

export const UNSUPPORTED_QIMEN_METHODS = ["置闰", "飞盘"] as const;

export const DEFAULT_QIMEN_SETTINGS: QimenSettings = {
  method: "default",
  solarTerm: "auto",
  dunType: "auto",
  juNumber: "auto",
  yearDivide: "exact",
};
