import type { NormalizedProfileInput } from "@/lib/profile";
export type HumanDesignType = "生成者" | "显示生产者" | "投射者" | "反映者" | "显化者";
export type HumanDesignCenter = { name: string; defined: boolean; gate: number };
export type HumanDesignChart = {
  format: "qmdj-human-design-v1";
  input: { datetime: string; timeZone: string };
  type: HumanDesignType;
  strategy: string;
  authority: string;
  profile: string;
  incarnationCross: string;
  centers: HumanDesignCenter[];
  disclaimer: string;
};
export type HumanDesignChartInput = NormalizedProfileInput;
