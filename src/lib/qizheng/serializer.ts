import type { QizhengChart } from "./chart";

export const serializeQizhengToStructuredText = (chart: QizhengChart) =>
  [
    "七政四余（研究性排盘）",
    `出生资料：${chart.input.civilDateTime} / ${chart.input.timeZone}`,
    `命宫取时：${chart.input.datetime}`,
    `命宫：${chart.mingPalace.branch}宫`,
    chart.bodyDegree
      ? `身度（张果星宗伴月法）：${chart.bodyDegree.mansion}宿起点东行 ${chart.bodyDegree.degreesFromMansionStart.toFixed(4)}° · 度主${chart.bodyDegree.ruler}`
      : "身度未计算：缺少太阴位置。",
    `完整性：${chart.complete ? "完整" : `部分排盘（缺少：${chart.missingStars.join("、")}）`}`,
    `十二宫：${chart.palaces.map((palace) => `${palace.name}(${palace.branch}) · 宫主${palace.ruler}`).join("、")}`,
    ...chart.stars.map((star) => `${star.kind}·${star.name}：${star.longitude}° · ${star.palaceName}(${star.branch}宫) · 宿${star.mansion}${star.mansionComparison ? `（牛宿界对照：${star.mansionComparison.mansion}，${star.mansionComparison.method}）` : ""} · 度主${star.mansionRuler}${star.nodeConventionComparison ? ` · 新法命名对照：${star.nodeConventionComparison.longitude}° · ${star.nodeConventionComparison.palaceName}(${star.nodeConventionComparison.branch}宫) · 宿${star.nodeConventionComparison.mansion}（${star.nodeConventionComparison.method}）` : ""} · ${star.dignity}${star.classicalDignity ? ` · 星学大成卷${star.classicalDignity.volume}${star.classicalDignity.passage ? `〈${star.classicalDignity.passage}〉` : ""}：${star.classicalDignity.label}${star.classicalDignity.alternatives?.map((item) => `；〈${item.passage}〉：${item.label}`).join("") ?? ""}` : ""} · ${star.element} · ${star.fortune}${star.note ? ` · ${star.note}` : ""}`),
    `边界：${chart.disclaimer}`,
  ].join("\n");

export const serializeQizhengToCompactJson = (chart: QizhengChart) => JSON.stringify(chart);
