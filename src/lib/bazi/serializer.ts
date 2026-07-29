import type { NormalizedBaziChart } from "./types";

const normalizeValue = (value: unknown): unknown => {
  if (value === undefined || value === null || value === "") {
    return "无";
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nextValue]) => [
        key,
        normalizeValue(nextValue),
      ]),
    );
  }

  return value;
};

export const serializeBaziToCompactJson = (chart: NormalizedBaziChart) =>
  JSON.stringify({
    format: "bazi-llm-compact-v1",
    note: "仅提供传统排盘分析材料，不包含程序化结论或自动断语。legend.chart 与 chart 按索引一一对应。",
    legend: {
      chart: [
        "输入参数",
        "解析后的本地时间",
        "公历信息",
        "农历信息",
        "四柱",
        "日主",
        "五行",
        "纳音",
        "天干十神",
        "地支十神",
        "四柱详表",
        "胎元",
        "胎息",
        "命宫",
        "身宫",
        "起运与大运",
      ],
    },
    chart: [
      normalizeValue(chart.input.original),
      chart.interpretedDateTime,
      normalizeValue({
        text: chart.raw.solar,
        fullText: chart.raw.solarFull,
      }),
      normalizeValue({
        text: chart.raw.lunar,
        fullText: chart.raw.lunarFull,
      }),
      normalizeValue(chart.raw.baZi),
      chart.raw.dayMaster,
      normalizeValue(chart.raw.wuXing),
      normalizeValue(chart.raw.naYin),
      normalizeValue(chart.raw.shiShenGan),
      normalizeValue(chart.raw.shiShenZhi),
      normalizeValue(chart.raw.pillars),
      normalizeValue(chart.raw.taiYuan),
      normalizeValue(chart.raw.taiXi),
      normalizeValue(chart.raw.mingGong),
      normalizeValue(chart.raw.shenGong),
      normalizeValue(chart.raw.yun),
    ],
  });

export const serializeBaziToStructuredText = (chart: NormalizedBaziChart) => {
  const lines = [
    "### 总览",
    `输入时间: ${chart.input.original.datetime}`,
    `输入时区: ${chart.input.original.timeZone}`,
    `解析后的本地时间: ${chart.interpretedDateTime}`,
    `公历: ${chart.raw.solar}`,
    `农历: ${chart.raw.lunar}`,
    `四柱: ${chart.raw.baZi.join(" / ")}`,
    `日主: ${chart.raw.dayMaster}`,
    `五行: ${chart.raw.wuXing.join(" / ")}`,
    `纳音: ${chart.raw.naYin.join(" / ")}`,
    `天干十神: ${chart.raw.shiShenGan.join(" / ")}`,
    `地支十神: ${chart.raw.shiShenZhi.join(" / ")}`,
    `胎元: ${chart.raw.taiYuan.pillar} (${chart.raw.taiYuan.naYin})`,
    `胎息: ${chart.raw.taiXi.pillar} (${chart.raw.taiXi.naYin})`,
    `命宫: ${chart.raw.mingGong.pillar} (${chart.raw.mingGong.naYin})`,
    `身宫: ${chart.raw.shenGong.pillar} (${chart.raw.shenGong.naYin})`,
    `起运: ${chart.raw.yun.startSolar} / ${chart.raw.yun.direction}`,
  ];

  const pillarBlocks = chart.raw.pillars.map((pillar) =>
    [
      `### ${pillar.key === "year" ? "年柱" : pillar.key === "month" ? "月柱" : pillar.key === "day" ? "日柱" : "时柱"}`,
      `柱: ${pillar.pillar}`,
      `天干: ${pillar.heavenlyStem}`,
      `地支: ${pillar.earthlyBranch}`,
      `藏干: ${pillar.hiddenStems.join(" / ") || "无"}`,
      `五行: ${pillar.wuXing}`,
      `纳音: ${pillar.naYin}`,
      `天干十神: ${pillar.shiShenGan}`,
      `地支十神: ${pillar.shiShenZhi.join(" / ") || "无"}`,
      `十二长生: ${pillar.diShi}`,
      `旬: ${pillar.xun}`,
      `旬空: ${pillar.xunKong}`,
    ].join("\n"),
  );

  const yunBlock = [
    "### 大运",
    ...chart.raw.yun.daYun.map(
      (item) =>
        `${item.index}. ${item.ganZhi} | ${item.startYear}-${item.endYear} | ${item.startAge}-${item.endAge}岁 | ${item.xun} / ${item.xunKong}`,
    ),
  ].join("\n");

  return [...lines, ...pillarBlocks, yunBlock].join("\n\n");
};
