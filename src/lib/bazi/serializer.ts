import { Solar } from "lunar-typescript";
import type { BaziPillarDetail, NormalizedBaziChart } from "./types";

export type BaziSerializationOptions = {
  /**
   * Keeps the "current" year deterministic in tests and replayed analyses.
   * The live workbench leaves this unset and uses the browser's current date.
   */
  referenceDate?: Date;
};

export type BaziRelationMatch = {
  branches?: string;
  stems?: string;
  positions: string[];
  pattern: string;
};

export type BaziRelationSummary = {
  heavenlyStemCombinations: BaziRelationMatch[];
  earthlyBranchRelations: {
    liuHe: BaziRelationMatch[];
    liuChong: BaziRelationMatch[];
    sanHe: BaziRelationMatch[];
    sanHui: BaziRelationMatch[];
    xing: BaziRelationMatch[];
    hai: BaziRelationMatch[];
    po: BaziRelationMatch[];
  };
  timing: {
    referenceDate: string;
    liuNian: {
      calendarYear: number;
      ganZhi: string;
      xun: string;
      xunKong: string;
    };
    currentDaYun: NormalizedBaziChart["raw"]["yun"]["daYun"][number] | null;
    note: string;
  };
};

const PILLAR_LABELS: Record<BaziPillarDetail["key"], string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  time: "时柱",
};

const HEAVENLY_STEM_COMBINATIONS = [
  ["甲", "己"],
  ["乙", "庚"],
  ["丙", "辛"],
  ["丁", "壬"],
  ["戊", "癸"],
] as const;

const BRANCH_PAIR_RELATIONS = {
  liuHe: [
    ["子", "丑"],
    ["寅", "亥"],
    ["卯", "戌"],
    ["辰", "酉"],
    ["巳", "申"],
    ["午", "未"],
  ],
  liuChong: [
    ["子", "午"],
    ["丑", "未"],
    ["寅", "申"],
    ["卯", "酉"],
    ["辰", "戌"],
    ["巳", "亥"],
  ],
  hai: [
    ["子", "未"],
    ["丑", "午"],
    ["寅", "巳"],
    ["卯", "辰"],
    ["申", "亥"],
    ["酉", "戌"],
  ],
  po: [
    ["子", "酉"],
    ["丑", "辰"],
    ["寅", "亥"],
    ["卯", "午"],
    ["巳", "申"],
    ["未", "戌"],
  ],
} as const;

const XING_PAIRS = [
  ["寅", "巳"],
  ["寅", "申"],
  ["巳", "申"],
  ["丑", "未"],
  ["丑", "戌"],
  ["未", "戌"],
  ["子", "卯"],
] as const;

const SELF_XING_BRANCHES = ["辰", "午", "酉", "亥"] as const;

const SAN_HE_GROUPS = [
  { name: "三合水局", branches: ["申", "子", "辰"] },
  { name: "三合木局", branches: ["亥", "卯", "未"] },
  { name: "三合火局", branches: ["寅", "午", "戌"] },
  { name: "三合金局", branches: ["巳", "酉", "丑"] },
] as const;

const SAN_HUI_GROUPS = [
  { name: "三会木局", branches: ["寅", "卯", "辰"] },
  { name: "三会火局", branches: ["巳", "午", "未"] },
  { name: "三会金局", branches: ["申", "酉", "戌"] },
  { name: "三会水局", branches: ["亥", "子", "丑"] },
] as const;

const isMatchingPair = (
  left: string,
  right: string,
  pairs: readonly (readonly [string, string])[],
) =>
  pairs.some(
    ([first, second]) =>
      (left === first && right === second) || (left === second && right === first),
  );

const buildPairMatches = (
  tokens: Array<{ value: string; position: string }>,
  pairs: readonly (readonly [string, string])[],
  pattern: string,
): BaziRelationMatch[] => {
  const matches: BaziRelationMatch[] = [];

  for (let leftIndex = 0; leftIndex < tokens.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < tokens.length; rightIndex += 1) {
      const left = tokens[leftIndex];
      const right = tokens[rightIndex];

      if (!left || !right || !isMatchingPair(left.value, right.value, pairs)) {
        continue;
      }

      matches.push({
        branches: `${left.value}${right.value}`,
        positions: [left.position, right.position],
        pattern,
      });
    }
  }

  return matches;
};

const buildGroupMatches = (
  tokens: Array<{ value: string; position: string }>,
  groups: readonly { name: string; branches: readonly string[] }[],
): BaziRelationMatch[] => {
  const matches: BaziRelationMatch[] = [];

  for (const group of groups) {
    for (let firstIndex = 0; firstIndex < tokens.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < tokens.length; secondIndex += 1) {
        for (
          let thirdIndex = secondIndex + 1;
          thirdIndex < tokens.length;
          thirdIndex += 1
        ) {
          const selected = [
            tokens[firstIndex],
            tokens[secondIndex],
            tokens[thirdIndex],
          ];

          if (
            selected.some((token) => !token) ||
            new Set(selected.map((token) => token?.value)).size !== 3 ||
            !group.branches.every((branch) => selected.some((token) => token?.value === branch))
          ) {
            continue;
          }

          matches.push({
            branches: group.branches.join(""),
            positions: selected.map((token) => token!.position),
            pattern: group.name,
          });
        }
      }
    }
  }

  return matches;
};

const buildStemCombinationMatches = (
  pillars: NormalizedBaziChart["raw"]["pillars"],
): BaziRelationMatch[] => {
  const tokens = pillars.map((pillar) => ({
    value: pillar.heavenlyStem,
    position: PILLAR_LABELS[pillar.key],
  }));

  return buildPairMatches(tokens, HEAVENLY_STEM_COMBINATIONS, "天干五合").map((match) => ({
    stems:
      HEAVENLY_STEM_COMBINATIONS.find(
        ([first, second]) =>
          match.branches === `${first}${second}` || match.branches === `${second}${first}`,
      )?.join("") ?? match.branches,
    positions: match.positions,
    pattern: match.pattern,
  }));
};

const buildXingMatches = (
  pillars: NormalizedBaziChart["raw"]["pillars"],
): BaziRelationMatch[] => {
  const tokens = pillars.map((pillar) => ({
    value: pillar.earthlyBranch,
    position: PILLAR_LABELS[pillar.key],
  }));
  const pairMatches = buildPairMatches(tokens, XING_PAIRS, "相刑");
  const selfMatches = buildPairMatches(tokens, SELF_XING_BRANCHES.map((branch) => [branch, branch] as const), "自刑");

  return [
    ...pairMatches,
    ...selfMatches,
    ...buildGroupMatches(tokens, [
      { name: "无恩三刑", branches: ["寅", "巳", "申"] },
      { name: "恃势三刑", branches: ["丑", "未", "戌"] },
    ]),
  ];
};

const formatReferenceDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildTimingSummary = (
  chart: NormalizedBaziChart,
  referenceDate: Date,
): BaziRelationSummary["timing"] => {
  const calendarYear = referenceDate.getFullYear();
  const solar = Solar.fromYmd(
    calendarYear,
    referenceDate.getMonth() + 1,
    referenceDate.getDate(),
  );
  const lunar = solar.getLunar();
  const currentDaYun =
    chart.raw.yun.daYun.find(
      (item) => calendarYear >= item.startYear && calendarYear <= item.endYear,
    ) ?? null;

  return {
    referenceDate: formatReferenceDate(referenceDate),
    liuNian: {
      calendarYear,
      ganZhi: lunar.getYearInGanZhiExact(),
      xun: lunar.getYearXunExact(),
      xunKong: lunar.getYearXunKongExact(),
    },
    currentDaYun,
    note: "流年按参考日期的节气年干支提供；当前大运按起止年份近似定位，交运临界日仍需复核。",
  };
};

export const buildBaziRelationSummary = (
  chart: NormalizedBaziChart,
  options: BaziSerializationOptions = {},
): BaziRelationSummary => {
  const branchTokens = chart.raw.pillars.map((pillar) => ({
    value: pillar.earthlyBranch,
    position: PILLAR_LABELS[pillar.key],
  }));

  return {
    heavenlyStemCombinations: buildStemCombinationMatches(chart.raw.pillars),
    earthlyBranchRelations: {
      liuHe: buildPairMatches(branchTokens, BRANCH_PAIR_RELATIONS.liuHe, "六合"),
      liuChong: buildPairMatches(branchTokens, BRANCH_PAIR_RELATIONS.liuChong, "六冲"),
      sanHe: buildGroupMatches(branchTokens, SAN_HE_GROUPS),
      sanHui: buildGroupMatches(branchTokens, SAN_HUI_GROUPS),
      xing: buildXingMatches(chart.raw.pillars),
      hai: buildPairMatches(branchTokens, BRANCH_PAIR_RELATIONS.hai, "六害"),
      po: buildPairMatches(branchTokens, BRANCH_PAIR_RELATIONS.po, "六破"),
    },
    timing: buildTimingSummary(chart, options.referenceDate ?? new Date()),
  };
};

const formatRelationMatches = (matches: BaziRelationMatch[]) =>
  matches.length > 0
    ? matches
        .map((match) => {
          const value = match.branches ?? match.stems ?? "未知";
          return `${value}（${match.positions.join("、")}）`;
        })
        .join("；")
    : "无";

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

export const serializeBaziToCompactJson = (
  chart: NormalizedBaziChart,
  options: BaziSerializationOptions = {},
) => {
  const relations = buildBaziRelationSummary(chart, options);

  return JSON.stringify({
    format: "bazi-llm-compact-v1",
    note: "仅提供传统排盘分析材料，不包含程序化结论或自动断语。关系摘要只记录盘面中出现的干支组合，不等于传统推断或事件断语。legend.chart 与 chart 按索引一一对应。",
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
    relations,
  });
};

export const serializeBaziToStructuredText = (
  chart: NormalizedBaziChart,
  options: BaziSerializationOptions = {},
) => {
  const relations = buildBaziRelationSummary(chart, options);
  const { earthlyBranchRelations, heavenlyStemCombinations, timing } = relations;
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
    "",
    "### 结构关系摘要",
    `天干五合: ${formatRelationMatches(heavenlyStemCombinations)}`,
    `地支六合: ${formatRelationMatches(earthlyBranchRelations.liuHe)}`,
    `地支六冲: ${formatRelationMatches(earthlyBranchRelations.liuChong)}`,
    `地支三合: ${formatRelationMatches(earthlyBranchRelations.sanHe)}`,
    `地支三会: ${formatRelationMatches(earthlyBranchRelations.sanHui)}`,
    `地支刑: ${formatRelationMatches(earthlyBranchRelations.xing)}`,
    `地支六害: ${formatRelationMatches(earthlyBranchRelations.hai)}`,
    `地支六破: ${formatRelationMatches(earthlyBranchRelations.po)}`,
    "",
    "### 流年与当前大运",
    `参考日期: ${timing.referenceDate}`,
    `流年: ${timing.liuNian.calendarYear} ${timing.liuNian.ganZhi}（${timing.liuNian.xun} / ${timing.liuNian.xunKong}）`,
    `当前大运: ${timing.currentDaYun?.ganZhi ?? "未在已提供的大运年份范围内"}`,
    timing.currentDaYun
      ? `当前大运年份: ${timing.currentDaYun.startYear}-${timing.currentDaYun.endYear}，年龄: ${timing.currentDaYun.startAge}-${timing.currentDaYun.endAge}岁`
      : "当前大运年份: 无",
    `口径说明: ${timing.note}`,
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
