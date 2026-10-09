/**
 * 三盘联合的独立时间。
 *
 * 四柱/紫微是「出生时间」的产物，奇门是「问事起局时间」的产物；三盘联合把两者
 * 摆在一起看时，这个区别是真实的。默认仍然三盘共用同一时间（改动前行为不变），
 * 只有显式勾选 `splitChartTimes` 并给出 `questionDatetime` 后，奇门才单独用问事时间。
 */
import type { ProfileInput } from "@/lib/profile/types";

/** 奇门盘应使用的时间：勾选且给值时为问事时间，否则沿用出生时间。 */
export const resolveQimenDatetime = (input: ProfileInput): string =>
  input.splitChartTimes && input.questionDatetime ? input.questionDatetime : input.datetime;

/**
 * 若奇门要用与出生时间不同的时间，返回一份「公历、只换时间」的输入副本。
 *
 * 问事时间是公历输入，因此这里把 `calendarMode` 固定为公历并清掉 `lunar`，
 * 否则 `normalizeProfileInput` 会按农历去转换、把 `datetime` 忽略掉。同源时返回
 * 原对象，调用方可以据此跳过重复归一化。
 */
export const toQimenProfileInput = (input: ProfileInput): ProfileInput => {
  const qimenDatetime = resolveQimenDatetime(input);
  if (qimenDatetime === input.datetime) return input;
  return { ...input, calendarMode: "solar", datetime: qimenDatetime, lunar: undefined };
};
