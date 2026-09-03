import { buildChart } from "@/lib/qimen/chart";
import { getDefaultChartInput } from "@/lib/qimen/defaults";

const QIMEN_TIMING_ENGINE_VERSION = "3meta-current-time-v1";

export type BattleTimingResult = {
  isViewed: true;
  solarTerm: string;
  lunarDate: string;
  qiMenChart: {
    gong: string;
    door: string;
    star: string;
    deity: string;
    elementEnergy: string;
  };
  symbolicReflection: string;
  provenance: {
    source: "server_qimen_chart";
    calculatedAt: string;
    localDateTime: string;
    timeZone: string;
    engine: string;
    engineVersion: string;
    dunType: string;
    juNumber: number;
  };
};

const palaceLabel = (position: number, trigram: unknown) =>
  `${typeof trigram === "string" && trigram ? trigram : "九宫"}${position}宫`;

export function buildBattleTiming(now: Date, timeZone: string): BattleTimingResult {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  } catch {
    throw new Error("时区无效。");
  }
  const input = getDefaultChartInput(now, timeZone);
  const chart = buildChart(input);
  const activePalace = chart.palaceMap[chart.raw.zhiShi.position];
  const deity = typeof activePalace?.deity === "string" ? activePalace.deity : "未标注";
  const elementEnergy = typeof activePalace?.fiveElements === "string"
    ? activePalace.fiveElements
    : String(chart.raw.monthElement ?? "未标注");
  const gong = palaceLabel(chart.raw.zhiShi.position, activePalace?.trigram);
  const calculatedAt = now.toISOString();

  return {
    isViewed: true,
    solarTerm: String(chart.raw.timeInfo.solarTerm ?? "未标注"),
    lunarDate: String(chart.raw.timeInfo.lunarDate ?? chart.raw.timeInfo.solarDate ?? input.datetime.slice(0, 10)),
    qiMenChart: {
      gong,
      door: String(chart.raw.zhiShi.gate),
      star: String(chart.raw.zhiFu.star),
      deity,
      elementEnergy,
    },
    symbolicReflection: `本次记录采用${chart.raw.ju.type}${chart.raw.ju.number}局：值符${chart.raw.zhiFu.star}，值使${chart.raw.zhiShi.gate}落${gong}。盘面只作为当前决策的传统术数证据叠层，不替代现实事实、风险约束和结果验证。`,
    provenance: {
      source: "server_qimen_chart",
      calculatedAt,
      localDateTime: input.datetime,
      timeZone: input.timeZone,
      engine: chart.engine,
      engineVersion: QIMEN_TIMING_ENGINE_VERSION,
      dunType: String(chart.raw.ju.type),
      juNumber: Number(chart.raw.ju.number),
    },
  };
}
