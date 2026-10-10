import type {
  FourPillars,
  Palace,
  Position,
  PostHorse,
  Season,
  SpecialPatterns,
  TimeInfo,
  Yuan,
  JuType,
  FiveElements,
  HeavenlyStem,
  Star,
  Gate,
} from "3meta";
import type { QimenSettings } from "./settings";

export type UserChartInput = {
  datetime: string;
  timeZone: string;
  qimenSettings?: QimenSettings;
};

export type RawChartData = {
  version: string;
  timeInfo: TimeInfo;
  fourPillars: FourPillars;
  ju: JuType;
  yuan: Yuan;
  season: Season;
  monthElement: FiveElements;
  zhiFu: {
    star: Star;
    position: Position;
    heavenlyStem: HeavenlyStem;
  };
  zhiShi: {
    gate: Gate;
    position: Position;
  };
  postHorse: PostHorse;
  palaces: Palace[];
  hiddenStems: Record<number, string>;
  specialPatterns: SpecialPatterns;
};

export type NormalizedQimenChart = {
  /**
   * 出盘引擎。2026-10 起只有 3meta 一条产线路径；
   * 字段保留是为了让核验层/参考盘提示继续能标注盘面来源。
   */
  engine: "3meta";
  input: UserChartInput;
  interpretedDateTime: string;
  raw: RawChartData;
  hiddenStemsByPalace: Record<number, string>;
  palaceMap: Record<number, Palace>;
};

export type PalaceSelection = Position | null;
