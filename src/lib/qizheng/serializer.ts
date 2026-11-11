import type { QizhengChart } from "./chart";

export const serializeQizhengToStructuredText = (chart: QizhengChart) =>
  [
    "七政四余（研究性排盘）",
    `出生资料：${chart.input.civilDateTime} / ${chart.input.timeZone}`,
    `命宫取时：${chart.input.datetime}`,
    `命宫：${chart.mingPalace.branch}宫`,
    `完整性：${chart.complete ? "完整" : "部分排盘"}`,
    `十二宫：${chart.palaces.map((palace) => `${palace.name}(${palace.branch})`).join("、")}`,
    ...chart.stars.map((star) => `${star.kind}·${star.name}：${star.longitude}° · ${star.palaceName}(${star.branch}宫) · 宿${star.mansion} · ${star.dignity}${star.classicalDignity ? ` · 星学大成卷${star.classicalDignity.volume}：${star.classicalDignity.label}` : ""} · ${star.element} · ${star.fortune}${star.note ? ` · ${star.note}` : ""}`),
    `边界：${chart.disclaimer}`,
  ].join("\n");

export const serializeQizhengToCompactJson = (chart: QizhengChart) => JSON.stringify(chart);
