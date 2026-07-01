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

export type UserChartInput = {
  datetime: string;
  timeZone: string;
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
  input: UserChartInput;
  interpretedDateTime: string;
  raw: RawChartData;
  hiddenStemsByPalace: Record<number, string>;
  palaceMap: Record<number, Palace>;
};

export type PalaceSelection = Position | null;
