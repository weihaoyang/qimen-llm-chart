import type { AstroChart, AstroPoint } from "./types";

const formatPoint = (point: AstroPoint) =>
  `${point.name}：${point.sign} ${point.degree ?? "—"}°${point.house === null ? " · 宫位未计算" : ` · 第${point.house}宫`}`;

export const serializeAstroToStructuredText = (chart: AstroChart) => [
  "星盘（研究性计算）",
  `出生资料：${chart.input.datetime} / ${chart.input.timeZone}`,
  ...(chart.complete ? [] : ["状态：未提供出生地，行星与相位按地心坐标计算（不依赖出生地）；上升、中天、宫位与阿拉伯点未计算。"]),
  formatPoint(chart.sun),
  formatPoint(chart.moon),
  `${chart.ascendant.name}：${chart.ascendant.sign} ${chart.ascendant.degree ?? "—"}°`,
  ...chart.points.slice(2).map((point) => formatPoint(point)),
  `宫制：${chart.houseSystem}`,
  ...(chart.lots.length
    ? [
        `阿拉伯点（共 ${chart.lots.length} 个；古典／现代占星通行点，非天体）：`,
        ...chart.lots.map(
          (lot) =>
            `- ${lot.name}（${lot.latin}，别称${lot.alias}）：${lot.sign} ${lot.degree}°${lot.house === null ? " · 宫位未计算" : ` · 第${lot.house}宫`}；公式 ${lot.formula}（${lot.sect}盘公式）`,
        ),
      ]
    : ["阿拉伯点：需要上升点（出生地经纬度）方可计算，当前未计算。"]),
  `相位（共 ${chart.aspects.length} 个）：${chart.aspects.map((aspect) => `${aspect.symbol}${aspect.body1}/${aspect.body2} ${aspect.strength}%`).join("、") || "暂无"}`,
  `模式：${chart.patterns.map((pattern) => pattern.type).join("、") || "暂无"}`,
  `边界：${chart.disclaimer}`,
].join("\n");

export const serializeAstroToCompactJson = (chart: AstroChart) => JSON.stringify(chart);
