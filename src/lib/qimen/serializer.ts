import type {
  AuspiciousPattern,
  InauspiciousPattern,
  Palace,
  Position,
} from "3meta";
import type { ChartSequenceItem } from "./sequence";
import type { NormalizedQimenChart } from "./types";
import { evaluateQimenPatterns } from "./patterns";

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null || value === "") {
    return "无";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value, null, 0);
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 0);
  }

  return String(value);
};

const formatPatterns = (
  patterns: AuspiciousPattern[] | InauspiciousPattern[] | undefined,
) => {
  if (!patterns || patterns.length === 0) {
    return "[]";
  }

  return JSON.stringify(
    patterns.map((pattern) => ({
      id: pattern.id ?? "无",
      name: pattern.name ?? "无",
      type: pattern.type ?? "无",
      subType: pattern.sub_type ?? "无",
      params: pattern.params ?? {},
      description: pattern.description ?? "无",
      position: pattern.position ?? "无",
    })),
  );
};

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

const joinPillar = (pillar: { stem: string; branch: string }) =>
  `${pillar.stem}${pillar.branch}`;

/**
 * 紧凑载荷逐宫只保留十干克应的五行关系码。`id`/`params`/`description`
 * 都能由同一行的天盘干、地盘干与五行推导，逐宫重复会把序列载荷撑大。
 * 完整描述保留在结构化文本里。
 */
const relationOf = (entry: { relation?: string } | undefined) => entry?.relation ?? "无";

/**
 * 登记格局（`patterns.ts`）的判定结果，供 AI 上下文使用。
 * `3meta` 只给「已成立」的格局；这里补上「未成立」的名单与旺衰分档，
 * 让模型知道哪些经典格局被**正面否掉**、哪些成立且有力。
 */
const summarizeRegisteredPatterns = (chart: NormalizedQimenChart) => {
  const report = evaluateQimenPatterns(chart);
  return {
    registered: report.registered,
    formedCount: report.formed.length,
    failedCount: report.failed.length,
    strengthCounts: report.strengthCounts,
    formed: report.formed.map((check) => ({
      name: check.name,
      kind: check.kind,
      group: check.group,
      strength: check.strength ?? "无",
      positions: check.positions,
      evidence: check.evidence,
    })),
    failed: report.failed.map((check) => check.name),
  };
};

/**
 * 紧凑版登记格局摘要：序列盘按步重复，逐项展开会把 JSON 载荷撑爆
 * （`/api/agent` 对 jsonPayload 有 80k 上限）。这里只留计数、档位与
 * 「成立格局」名+档位，证据与「未成立」名单交给单盘结构化文本。
 */
export const summarizeRegisteredPatternsCompact = (chart: NormalizedQimenChart) => {
  const report = evaluateQimenPatterns(chart);
  return {
    登记: report.registered,
    成立: report.formed.length,
    未成立: report.failed.length,
    档位: report.strengthCounts,
    成立格局: report.formed.map((check) => (check.strength ? `${check.name}(${check.strength})` : check.name)),
  };
};

const formatPalace = (
  palace: Palace,
  hiddenStem: string | undefined,
  selectedPosition: Position | null,
) => {
  const lines = [
    `### 宫位 ${palace.position}`,
    `宫位编号: ${palace.position}`,
    `卦名: ${formatValue(palace.trigram)}`,
    `内外盘: ${formatValue(palace.innerOuter)}`,
    `地盘天干: ${formatValue(palace.earthlyStem)}`,
    `天盘天干: ${formatValue(palace.heavenlyStem)}`,
    `地支: ${formatValue(palace.earthBranch)}`,
    `八门: ${formatValue(palace.gate)}`,
    `九星: ${formatValue(palace.star)}`,
    `八神: ${formatValue(palace.deity)}`,
    `是否值符宫: ${formatValue(Boolean(palace.isZhiFu))}`,
    `是否值使宫: ${formatValue(Boolean(palace.isZhiShi))}`,
    `暗干: ${formatValue(hiddenStem ?? "无")}`,
    `空亡地支: ${formatValue(palace.voidness.voidBranches)}`,
    `本宫地支: ${formatValue(palace.voidness.palaceBranches)}`,
    `本宫空亡地支: ${formatValue(palace.voidness.voidInPalace)}`,
    `是否空亡: ${formatValue(palace.voidness.hasVoidness)}`,
    `是否驿马宫: ${formatValue(Boolean(palace.isPostHorse))}`,
    `门迫关系: ${formatValue(palace.gatePressure)}`,
    `九星旺衰: ${formatValue(palace.status?.star ?? "无")}`,
    `八门旺衰: ${formatValue(palace.status?.gate ?? "无")}`,
    `天盘干十二长生: ${formatValue(palace.growthInfo.heavenlyStem)}`,
    `地盘干十二长生: ${formatValue(palace.growthInfo.earthlyStem)}`,
    `时干十二长生: ${formatValue(palace.growthInfo.timeStem ?? "无")}`,
    `日干十二长生: ${formatValue(palace.growthInfo.dayStem ?? "无")}`,
    `天盘干入墓: ${formatValue(palace.tombInfo.heavenlyStemInTomb)}`,
    `地盘干入墓: ${formatValue(palace.tombInfo.earthlyStemInTomb)}`,
    `时干入墓: ${formatValue(palace.tombInfo.timeStemInTomb ?? false)}`,
    `日干入墓: ${formatValue(palace.tombInfo.dayStemInTomb ?? false)}`,
    `入墓地支: ${formatValue(palace.tombInfo.tombBranch ?? "无")}`,
    `十干克应_天对地: ${formatValue(palace.tenStemResponse.heavenlyToEarthly)}`,
    `十干克应_时对日: ${formatValue(palace.tenStemResponse.timeToDay ?? "无")}`,
    `十干克应_天对日: ${formatValue(palace.tenStemResponse.heavenlyToDay ?? "无")}`,
    `六仪击刑: ${formatValue(palace.liuYiJiXing)}`,
    `吉格列表: ${formatPatterns(palace.auspiciousPatterns)}`,
    `凶格列表: ${formatPatterns(palace.inauspiciousPatterns)}`,
    `当前选中宫: ${formatValue(selectedPosition === palace.position)}`,
  ];

  return lines.join("\n");
};

export const serializeChartToStructuredText = (
  chart: NormalizedQimenChart,
  selectedPosition: Position | null = null,
) => {
  const registeredPatterns = summarizeRegisteredPatterns(chart);
  const overviewLines = [
    "### 总览",
    `输入时间: ${chart.input.datetime}`,
    `输入时区: ${chart.input.timeZone}`,
    `解析后的本地时间: ${chart.interpretedDateTime}`,
    `公历日期: ${formatValue(chart.raw.timeInfo.solarDate)}`,
    `农历日期: ${formatValue(chart.raw.timeInfo.lunarDate)}`,
    `四柱_年: ${joinPillar(chart.raw.fourPillars.year)}`,
    `四柱_月: ${joinPillar(chart.raw.fourPillars.month)}`,
    `四柱_日: ${joinPillar(chart.raw.fourPillars.day)}`,
    `四柱_时: ${joinPillar(chart.raw.fourPillars.hour)}`,
    `节气: ${formatValue(chart.raw.timeInfo.solarTerm ?? "无")}`,
    `旬首: ${formatValue(chart.raw.timeInfo.xunShou)}`,
    `空亡: ${formatValue(chart.raw.timeInfo.voidness)}`,
    `阴阳遁: ${formatValue(chart.raw.ju.type)}`,
    `局数: ${formatValue(chart.raw.ju.number)}`,
    `元: ${formatValue(chart.raw.yuan)}`,
    `值符星: ${formatValue(chart.raw.zhiFu.star)}`,
    `值符宫位: ${formatValue(chart.raw.zhiFu.position)}`,
    `值符天盘干: ${formatValue(chart.raw.zhiFu.heavenlyStem)}`,
    `值使门: ${formatValue(chart.raw.zhiShi.gate)}`,
    `值使宫位: ${formatValue(chart.raw.zhiShi.position)}`,
    `驿马地支: ${formatValue(chart.raw.postHorse.branch)}`,
    `驿马宫位: ${formatValue(chart.raw.postHorse.position)}`,
    `季节: ${formatValue(chart.raw.season)}`,
    `月令五行: ${formatValue(chart.raw.monthElement)}`,
    `五不遇时: ${formatValue(chart.raw.specialPatterns.wuBuYuShi ?? "无")}`,
    `全局吉格列表: ${formatPatterns(chart.raw.specialPatterns.auspiciousPatterns)}`,
    `全局凶格列表: ${formatPatterns(chart.raw.specialPatterns.inauspiciousPatterns)}`,
    `登记格局_统计: 登记 ${registeredPatterns.registered} · 成立 ${registeredPatterns.formedCount}（有力 ${registeredPatterns.strengthCounts.有力} / 中平 ${registeredPatterns.strengthCounts.中平} / 无力 ${registeredPatterns.strengthCounts.无力}）· 未成立 ${registeredPatterns.failedCount}`,
    `登记格局_成立: ${JSON.stringify(registeredPatterns.formed)}`,
    `登记格局_未成立: ${JSON.stringify(registeredPatterns.failed)}`,
  ];

  const palaceBlocks = chart.raw.palaces.map((palace) =>
    formatPalace(palace, chart.hiddenStemsByPalace[palace.position], selectedPosition),
  );

  return [...overviewLines, ...palaceBlocks].join("\n\n");
};

const buildCompactSchema = () => {
  const chartFields = [
    "输入参数",
    "解析后的本地时间",
    "数据版本",
    "时间信息",
    "四柱",
    "局",
    "元",
    "季节",
    "月令五行",
    "值符",
    "值使",
    "驿马",
    "暗干表",
    "全局特殊格局",
    "登记格局判定",
  ];

  const palaceFields = [
    "宫位编号",
    "卦名",
    "内外盘",
    "地盘天干",
    "天盘天干",
    "地支",
    "八门",
    "九星",
    "八神",
    "是否值符宫",
    "是否值使宫",
    "是否驿马宫",
    "暗干",
    "空亡地支",
    "本宫地支",
    "本宫空亡",
    "是否空亡",
    "门迫关系",
    "九星旺衰",
    "八门旺衰",
    "天盘干长生",
    "地盘干长生",
    "时干长生",
    "日干长生",
    "天盘干入墓",
    "地盘干入墓",
    "时干入墓",
    "日干入墓",
    "入墓地支",
    "十干克应_天对地",
    "十干克应_时对日",
    "十干克应_天对日",
    "六仪击刑",
    "击刑类型",
    "击刑说明",
  ];

  return {
    chartFields,
    palaceFields,
  };
};

const buildCompactSections = (chart: NormalizedQimenChart) => {
  const { chartFields, palaceFields } = buildCompactSchema();

  return {
    legend: {
      chart: chartFields,
      palace: palaceFields,
    },
    chart: [
      normalizeValue(chart.input),
      chart.interpretedDateTime,
      normalizeValue(chart.raw.version),
      normalizeValue(chart.raw.timeInfo),
      normalizeValue(chart.raw.fourPillars),
      normalizeValue(chart.raw.ju),
      normalizeValue(chart.raw.yuan),
      normalizeValue(chart.raw.season),
      normalizeValue(chart.raw.monthElement),
      normalizeValue(chart.raw.zhiFu),
      normalizeValue(chart.raw.zhiShi),
      normalizeValue(chart.raw.postHorse),
      normalizeValue(chart.hiddenStemsByPalace),
      normalizeValue(chart.raw.specialPatterns),
      summarizeRegisteredPatternsCompact(chart),
    ],
    palaces: chart.raw.palaces.map((palace) => [
      palace.position,
      normalizeValue(palace.trigram),
      normalizeValue(palace.innerOuter),
      normalizeValue(palace.earthlyStem),
      normalizeValue(palace.heavenlyStem),
      normalizeValue(palace.earthBranch),
      normalizeValue(palace.gate),
      normalizeValue(palace.star),
      normalizeValue(palace.deity),
      Boolean(palace.isZhiFu),
      Boolean(palace.isZhiShi),
      Boolean(palace.isPostHorse),
      normalizeValue(chart.hiddenStemsByPalace[palace.position] ?? "无"),
      normalizeValue(palace.voidness?.voidBranches),
      normalizeValue(palace.voidness?.palaceBranches),
      normalizeValue(palace.voidness?.voidInPalace),
      normalizeValue(palace.voidness?.hasVoidness),
      normalizeValue(palace.gatePressure),
      normalizeValue(palace.status?.star),
      normalizeValue(palace.status?.gate),
      normalizeValue(palace.growthInfo?.heavenlyStem),
      normalizeValue(palace.growthInfo?.earthlyStem),
      normalizeValue(palace.growthInfo?.timeStem),
      normalizeValue(palace.growthInfo?.dayStem),
      normalizeValue(palace.tombInfo?.heavenlyStemInTomb),
      normalizeValue(palace.tombInfo?.earthlyStemInTomb),
      normalizeValue(palace.tombInfo?.timeStemInTomb),
      normalizeValue(palace.tombInfo?.dayStemInTomb),
      normalizeValue(palace.tombInfo?.tombBranch),
      relationOf(palace.tenStemResponse?.heavenlyToEarthly),
      relationOf(palace.tenStemResponse?.timeToDay),
      relationOf(palace.tenStemResponse?.heavenlyToDay),
      normalizeValue(palace.liuYiJiXing?.hasJiXing),
      normalizeValue(palace.liuYiJiXing?.type),
      normalizeValue(palace.liuYiJiXing?.description),
    ]),
  };
};

const buildCompactPayload = (chart: NormalizedQimenChart) => ({
  format: "qmdj-llm-compact-v1",
  note: "legend.chart 与 chart 按索引一一对应；legend.palace 与 palaces 每行按索引一一对应；值为“无”表示源值为空、缺失或无该项。紧凑载荷里的「十干克应」只给关系码，完整描述见结构化文本。",
  ...buildCompactSections(chart),
});

export const serializeChartToCompactJson = (chart: NormalizedQimenChart) =>
  JSON.stringify(buildCompactPayload(chart));

export const serializeSequenceToCompactJson = (
  sequence: ChartSequenceItem[],
) =>
  JSON.stringify((() => {
    const first = sequence[0];
    const sharedLegend = first ? buildCompactSections(first.chart).legend : { chart: [], palace: [] };

    return {
      format: "qmdj-llm-sequence-compact-v1",
      note: "legend 只出现一次；每个 item 的 chart 与 palaces 按 legend 索引一一对应。",
      count: sequence.length,
      legend: sharedLegend,
      items: sequence.map((item) => {
        const { chart, palaces } = buildCompactSections(item.chart);
        return {
          index: item.index,
          datetime: item.input.datetime,
          timeZone: item.input.timeZone,
          chart,
          palaces,
        };
      }),
    };
  })());
