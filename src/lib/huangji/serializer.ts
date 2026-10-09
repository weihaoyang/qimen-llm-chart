import type { HuangjiChronology } from "./chronology";

export const serializeHuangjiToStructuredText = (chart: HuangjiChronology) =>
  [
    "皇极经世 · 元会运世（研究性纪年换算）",
    `目标年份：${chart.displayYear}（天文纪年 ${chart.astronomicalYear}）`,
    `距纪元年数序号：${chart.ordinalFromEpoch}（纪元 = 公元前 ${67017} 年甲子，无公元 0 年）`,
    `元：第 ${chart.yuan.number} 元 · ${chart.yuan.stem} · 元内第 ${chart.yuan.year} 年`,
    `会：第 ${chart.hui.number} 会 · ${chart.hui.branch} · 会内第 ${chart.hui.year} 年`,
    `运：第 ${chart.yun.number} 运（会内第 ${chart.yun.numberWithinHui}）· ${chart.yun.stem} · 运内第 ${chart.yun.year} 年`,
    `世：第 ${chart.shi.number} 世（会内第 ${chart.shi.numberWithinHui}，运内第 ${chart.shi.numberWithinYun}）· ${chart.shi.branch} · 世内第 ${chart.shi.year} 年`,
    `年干支：${chart.sexagenaryYear.name}（六十甲子第 ${chart.sexagenaryYear.index}）`,
    `边界：${chart.disclaimer}`,
  ].join("\n");

export const serializeHuangjiToCompactJson = (chart: HuangjiChronology) => JSON.stringify(chart);
