import type { NormalizedZiweiChart } from "./types";

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

export const serializeZiweiToCompactJson = (chart: NormalizedZiweiChart) =>
  JSON.stringify({
    format: "ziwei-llm-compact-v2",
    note: "事实、结构推导与传统格局分层；legend.chart 与 chart 按索引一一对应，legend.palace 与 palaces 每行按索引一一对应。",
    legend: {
      chart: [
        "输入参数",
        "解析后的本地时间",
        "命盘基本信息",
        "干支",
        "四化",
        "结构化推导（命主/身主/三方四正/空宫/格局）",
      ],
      palace: [
        "宫位名称",
        "是否身宫",
        "宫干",
        "宫支",
        "主星",
        "辅星",
        "杂曜",
        "长生十二神",
        "博士十二神",
        "将前十二神",
        "岁前十二神",
        "大限",
        "小限年龄",
        "空宫与借宫",
        "命宫三方四正",
      ],
    },
    chart: [
      normalizeValue(chart.input.original),
      chart.interpretedDateTime,
      normalizeValue({
        solarDate: chart.raw.solarDate,
        lunarDate: chart.raw.lunarDate,
        chineseDate: chart.raw.chineseDate,
        time: chart.raw.time,
        timeRange: chart.raw.timeRange,
        gender: chart.raw.gender,
        sign: chart.raw.sign,
        zodiac: chart.raw.zodiac,
        soul: chart.raw.soul,
        body: chart.raw.body,
        earthlyBranchOfSoulPalace: chart.raw.earthlyBranchOfSoulPalace,
        earthlyBranchOfBodyPalace: chart.raw.earthlyBranchOfBodyPalace,
        fiveElementsClass: chart.raw.fiveElementsClass,
        mingZhu: chart.raw.mingZhu,
        shenZhu: chart.raw.shenZhu,
        yinYangGender: chart.raw.yinYangGender,
      }),
      normalizeValue(chart.raw.rawDates.chineseDate),
      normalizeValue(chart.raw.mutagens),
      normalizeValue({
        sanFangSiZheng: chart.raw.sanFangSiZheng,
        emptyPalaces: chart.raw.emptyPalaces,
        patterns: chart.raw.patterns,
      }),
    ],
    palaces: chart.raw.palaces.map((palace) => [
      palace.name,
      palace.isBodyPalace,
      palace.heavenlyStem,
      palace.earthlyBranch,
      normalizeValue(palace.majorStars),
      normalizeValue(palace.minorStars),
      normalizeValue(palace.adjectiveStars),
      palace.changsheng12,
      palace.boshi12,
      palace.jiangqian12,
      palace.suiqian12,
      normalizeValue(palace.decadal),
      normalizeValue(palace.ages),
      normalizeValue({
        branchIndex: palace.branchIndex,
        isEmpty: palace.isEmpty,
        oppositePalace: palace.oppositePalace,
        borrowedStars: palace.borrowedStars,
        sanFangSiZheng: palace.sanFangSiZheng,
      }),
    ]),
  });

export const serializeZiweiToStructuredText = (chart: NormalizedZiweiChart) => {
  const overview = [
    "### 总览",
    `输入时间: ${chart.input.original.datetime}`,
    `输入时区: ${chart.input.original.timeZone}`,
    `解析后的本地时间: ${chart.interpretedDateTime}`,
    `阳历: ${chart.raw.solarDate}`,
    `农历: ${chart.raw.lunarDate}`,
    `干支: ${chart.raw.chineseDate}`,
    `性别: ${chart.raw.gender}`,
    `星座: ${chart.raw.sign}`,
    `生肖: ${chart.raw.zodiac}`,
    `命主: ${chart.raw.soul}`,
    `身主: ${chart.raw.body}`,
    `命宫地支: ${chart.raw.earthlyBranchOfSoulPalace}`,
    `身宫地支: ${chart.raw.earthlyBranchOfBodyPalace}`,
    `五行局: ${chart.raw.fiveElementsClass}`,
    `命主 / 身主: ${chart.raw.mingZhu} / ${chart.raw.shenZhu}`,
    `阴阳性别: ${chart.raw.yinYangGender}`,
    `四化: 禄=${chart.raw.mutagens.lu} / 权=${chart.raw.mutagens.quan} / 科=${chart.raw.mutagens.ke} / 忌=${chart.raw.mutagens.ji}`,
    `命宫三方四正: ${chart.raw.sanFangSiZheng.join(" / ")}`,
  ];

  const patternBlock = chart.raw.patterns.length
    ? [
        "### 结构化格局与证据",
        ...chart.raw.patterns.map((item) => `${item.name}【${item.level}】\n证据: ${item.evidence.join("；")}\n说明: ${item.summary}\n来源: ${item.source ?? "未标注"}`),
      ]
    : ["### 结构化格局与证据", "当前未识别到已实现的格局，不能据此推断不存在其他传统格局。"];

  const emptyBlock = chart.raw.emptyPalaces.length
    ? ["### 空宫借宫", ...chart.raw.emptyPalaces.map((item) => `${item.palace} ← 借 ${item.oppositePalace}: ${item.borrowedStars.join(" / ") || "无主星"}`)]
    : ["### 空宫借宫", "当前未发现空宫。"];

  const palaceBlocks = chart.raw.palaces.map((palace) =>
    [
      `### ${palace.name}`,
      `宫位索引: ${palace.index}`,
      `是否身宫: ${palace.isBodyPalace}`,
      `宫干: ${palace.heavenlyStem}`,
      `宫支: ${palace.earthlyBranch}`,
      `主星: ${palace.majorStars.map((item) => item.name).join(" / ") || "无"}`,
      `辅星: ${palace.minorStars.map((item) => item.name).join(" / ") || "无"}`,
      `杂曜: ${palace.adjectiveStars.map((item) => item.name).join(" / ") || "无"}`,
      `长生十二神: ${palace.changsheng12}`,
      `博士十二神: ${palace.boshi12}`,
      `将前十二神: ${palace.jiangqian12}`,
      `岁前十二神: ${palace.suiqian12}`,
      `大限: ${palace.decadal.range[0]}-${palace.decadal.range[1]} (${palace.decadal.heavenlyStem}${palace.decadal.earthlyBranch})`,
      `小限年龄: ${palace.ages.join(" / ")}`,
    ].join("\n"),
  );

  return [...overview, patternBlock.join("\n\n"), emptyBlock.join("\n"), ...palaceBlocks].join("\n\n");
};
