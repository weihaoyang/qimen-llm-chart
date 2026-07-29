import type { EarthlyBranch, Gate, HeavenlyStem, Palace, Position, Star } from "3meta";
import taobiModule from "taobi";
import { toZonedDate } from "@/lib/qimen/timezone";
import type { RawChartData } from "./types";
import type { QimenMethod } from "./settings";

const { TheArtOfBecomingInvisible } = taobiModule as {
  TheArtOfBecomingInvisible: new (
    questionTime: Date,
    round?: number | null,
    arranged?: number | null,
    follow?: number,
    options?: { elements?: number },
  ) => TaobiInstance;
};

type TaobiInstance = {
  round: number;
  symbol: number;
  mandate: number;
  five: {
    getECS: (asLabel?: boolean) => string[] | string;
    getHCS?: (asLabel?: boolean) => string[] | string;
  };
  circle: TaobiPalace[];
};

type TaobiPalace = {
  index: number;
  getPalace: (asLabel?: boolean) => string;
  getDoor: (asLabel?: boolean) => string;
  getOriginDoor: (asLabel?: boolean) => string;
  getStar: (asLabel?: boolean) => string[] | string;
  getOriginStar: (asLabel?: boolean) => string;
  getDivinity: (asLabel?: boolean) => string;
  getHCS: (asLabel?: boolean) => string[] | string;
  getECS: (asLabel?: boolean) => string[] | string;
  getOTB: (asLabel?: boolean) => string[] | string;
};

const TRIGRAM_TO_POSITION: Record<string, Position> = {
  坎: 1,
  坤: 2,
  震: 3,
  巽: 4,
  中: 5,
  乾: 6,
  兑: 7,
  艮: 8,
  离: 9,
};
const NEUTRAL_RELATION = { relation: "无" as const };

const toLabelArray = (value: string[] | string | undefined) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const normalizeStarLabel = (value: string) => value.replace(/星/g, "") as Palace["star"];
const normalizeGateLabel = (value: string) => value as Gate;
const normalizeDeityLabel = (value: string) =>
  (value === "螣蛇" ? "腾蛇" : value) as Palace["deity"];

const normalizeStemValue = (
  value: string[] | string | undefined,
): HeavenlyStem | [HeavenlyStem, HeavenlyStem] | "无" => {
  const labels = toLabelArray(value).filter(Boolean);
  if (labels.length === 0) {
    return "无";
  }

  return labels.length === 1
    ? (labels[0] as HeavenlyStem)
    : [labels[0] as HeavenlyStem, labels[1] as HeavenlyStem];
};

const normalizeBranchValue = (
  value: string[] | string | undefined,
): EarthlyBranch | [EarthlyBranch, EarthlyBranch] | "无" => {
  const labels = toLabelArray(value).filter(Boolean);
  if (labels.length === 0) {
    return "无";
  }

  return labels.length === 1
    ? (labels[0] as EarthlyBranch)
    : [labels[0] as EarthlyBranch, labels[1] as EarthlyBranch];
};

const normalizeStarValue = (value: string[] | string): Star | [Star, Star] => {
  const labels = toLabelArray(value).map((item) => normalizeStarLabel(item));
  return labels.length === 1
    ? (labels[0] as Star)
    : [labels[0] as Star, labels[1] as Star];
};

const getMethodElementsIndex = (method: Exclude<QimenMethod, "default">) => {
  switch (method) {
    case "split":
      return 1;
    case "maoshan":
      return 2;
  }
};

const getFirstStem = (value: Palace["heavenlyStem"]) =>
  Array.isArray(value) ? value[0] : value;

const containsStar = (value: Palace["star"], target: RawChartData["zhiFu"]["star"]) =>
  Array.isArray(value) ? value.includes(target) : value === target;

const buildNeutralPalace = (
  basePalace: Palace,
  overrides: Partial<Palace>,
): Palace => ({
  ...basePalace,
  status: {
    star: "无",
    gate: "无",
  },
  gatePressure: "无",
  growthInfo: {
    heavenlyStem: "无",
    earthlyStem: "无",
    timeStem: "无",
    dayStem: "无",
  },
  liuYiJiXing: {
    hasJiXing: false,
  },
  tombInfo: {
    heavenlyStemInTomb: [],
    earthlyStemInTomb: [],
    timeStemInTomb: false,
    dayStemInTomb: false,
  },
  tenStemResponse: {
    heavenlyToEarthly: NEUTRAL_RELATION,
    timeToDay: NEUTRAL_RELATION,
    heavenlyToDay: NEUTRAL_RELATION,
  },
  auspiciousPatterns: [],
  inauspiciousPatterns: [],
  ...overrides,
});

export const buildTaobiChartData = (
  datetime: string,
  timeZone: string,
  baseChart: RawChartData,
  method: Exclude<QimenMethod, "default">,
) => {
  const taobiDate = toZonedDate(datetime, timeZone);
  const taobi = new TheArtOfBecomingInvisible(
    taobiDate,
    null,
    null,
    0,
    { elements: getMethodElementsIndex(method) },
  );
  const basePalaces = Object.fromEntries(
    baseChart.palaces.map((palace) => [palace.position, palace]),
  ) as Record<Position, Palace>;
  const postHorsePosition = Number(baseChart.postHorse.position) as Position;

  const adaptedPalaces = taobi.circle.map((palace) => {
    const trigram = palace.getPalace(true);
    const position = TRIGRAM_TO_POSITION[trigram];
    const basePalace = basePalaces[position];
    const star = normalizeStarValue(palace.getStar(true));
    const gate = normalizeGateLabel(palace.getDoor(true));

    return buildNeutralPalace(basePalace, {
      position,
      trigram: basePalace.trigram,
      gate,
      star,
      deity: normalizeDeityLabel(palace.getDivinity(true)),
      heavenlyStem: normalizeStemValue(palace.getHCS(true)),
      earthlyStem: normalizeStemValue(palace.getECS(true)) as Palace["earthlyStem"],
      earthBranch: normalizeBranchValue(palace.getOTB(true)),
      isPostHorse: position === postHorsePosition,
    });
  });

  const centerBase = basePalaces[5];
  const centerPalace = buildNeutralPalace(centerBase, {
    position: 5,
    trigram: "中",
    gate: "无门",
    star: "天禽",
    deity: "无神",
    heavenlyStem: normalizeStemValue(taobi.five.getHCS?.(true)),
    earthlyStem: normalizeStemValue(taobi.five.getECS(true)) as Palace["earthlyStem"],
    earthBranch: "无",
    isPostHorse: false,
  });

  const palaces = [...adaptedPalaces, centerPalace].sort((left, right) => left.position - right.position);
  const symbolSource = taobi.circle.find((palace) => palace.index === taobi.symbol);
  const mandateSource = taobi.circle.find((palace) => palace.index === taobi.mandate);

  if (!symbolSource || !mandateSource) {
    throw new Error("taobi 盘面缺少值符或值使来源。");
  }

  const zhiFuStar = normalizeStarLabel(symbolSource.getOriginStar(true)) as RawChartData["zhiFu"]["star"];
  const zhiShiGate = normalizeGateLabel(mandateSource.getOriginDoor(true)) as RawChartData["zhiShi"]["gate"];
  const zhiFuPalace = palaces.find((palace) => containsStar(palace.star, zhiFuStar));
  const zhiShiPalace = palaces.find((palace) => palace.gate === zhiShiGate);

  if (!zhiFuPalace || !zhiShiPalace) {
    throw new Error("无法从 taobi 盘面定位值符或值使宫位。");
  }

  zhiFuPalace.isZhiFu = true;
  zhiShiPalace.isZhiShi = true;

  return {
    version: "taobi-adapter",
    timeInfo: {
      ...baseChart.timeInfo,
      solarTerm: baseChart.timeInfo.solarTerm,
    },
    fourPillars: baseChart.fourPillars,
    ju: {
      type: taobi.round > 0 ? "阳遁" : "阴遁",
      number: Math.abs(taobi.round) as RawChartData["ju"]["number"],
    },
    yuan: baseChart.yuan,
    season: baseChart.season,
    monthElement: baseChart.monthElement,
    zhiFu: {
      star: zhiFuStar,
      position: zhiFuPalace.position,
      heavenlyStem: getFirstStem(zhiFuPalace.heavenlyStem) as RawChartData["zhiFu"]["heavenlyStem"],
    },
    zhiShi: {
      gate: zhiShiGate,
      position: zhiShiPalace.position,
    },
    postHorse: {
      ...baseChart.postHorse,
      position: postHorsePosition,
    },
    palaces,
    hiddenStems: {},
    specialPatterns: {
      auspiciousPatterns: [],
      inauspiciousPatterns: [],
      others: [`taobi:${method}`],
    },
  } satisfies RawChartData;
};
