import type { LiurenChart } from "./chart";

export const serializeLiurenToStructuredText = (chart: LiurenChart) => [
  "大六壬（天地盘互乘 · 四课三传）",
  `四柱：${chart.fourPillars.year} ${chart.fourPillars.month} ${chart.fourPillars.day} ${chart.fourPillars.hour} · 月将 ${chart.yueJiang.name}${chart.yueJiang.zhi} · 占时 ${chart.hourZhi}`,
  `日干支 ${chart.dayGanZhi} · 旬首 ${chart.xunShou} · 旬空 ${chart.kongWang.join("、")} · 驿马 ${chart.yiMa} · 课体 ${chart.keTi}`,
  "",
  "天地盘（地盘 / 天盘 / 天将 / 遁干）：",
  ...chart.plate.map((cell) => `- ${cell.di}宫：天盘 ${cell.tian} · ${cell.jiang} · 遁干 ${cell.dun || "—"} · ${cell.jianChu}`),
  "",
  "四课（上神 / 下神 / 天将 / 六亲 / 遁干）：",
  ...[...chart.lessons].reverse().map((lesson) => `- 第${lesson.index}课：${lesson.upper} 临 ${lesson.lower} · ${lesson.jiang} · ${lesson.liuQin} · 遁干 ${lesson.dunGan || "—"}`),
  "",
  "三传：",
  ...chart.transmissions.map((item) => `- ${item.name}：${item.zhi} · ${item.jiang} · ${item.liuQin} · 遁干 ${item.dunGan || "—"}`),
  "",
  `边界：${chart.disclaimer}`,
].join("\n");

export const serializeLiurenToCompactJson = (chart: LiurenChart) =>
  JSON.stringify({
    format: "qmdj-liuren-v1",
    input: chart.input,
    fourPillars: [chart.fourPillars.year, chart.fourPillars.month, chart.fourPillars.day, chart.fourPillars.hour],
    dayGanZhi: chart.dayGanZhi,
    hourZhi: chart.hourZhi,
    yueJiang: [chart.yueJiang.name, chart.yueJiang.zhi],
    xunShou: chart.xunShou,
    kongWang: chart.kongWang,
    yiMa: chart.yiMa,
    keTi: chart.keTi,
    plate: chart.plate.map((cell) => [cell.di, cell.tian, cell.jiang, cell.dun, cell.jianChu]),
    lessons: chart.lessons.map((lesson) => [lesson.index, lesson.upper, lesson.lower, lesson.jiang, lesson.liuQin, lesson.dunGan]),
    transmissions: chart.transmissions.map((item) => [item.name, item.zhi, item.jiang, item.liuQin, item.dunGan]),
    boundary: "天地盘按月将加时；三传按「日干支＋干上神」查表；天将依昼夜贵人与顺逆。仅研究用，不作预测。",
  });
