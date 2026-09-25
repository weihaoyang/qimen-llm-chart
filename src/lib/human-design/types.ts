import type { NormalizedProfileInput } from "@/lib/profile";
export type HumanDesignType = "生成者" | "显示生产者" | "投射者" | "反映者" | "显化者";
export type HumanDesignActivation = { gate: number; line: number; color: number; tone: number; base: number };
export type HumanDesignCenter = { name: string; defined: boolean; gate: number | null };
export type HumanDesignChart = {
  format: "qmdj-human-design-v1";
  input: { datetime: string; timeZone: string; latitude: number | null; longitude: number | null };
  type: HumanDesignType | null;
  strategy: string | null;
  authority: string | null;
  profile: string | null;
  incarnationCross: string | null;
  centers: HumanDesignCenter[];
  activations: Record<string, { personality: HumanDesignActivation; design: HumanDesignActivation }>;
  precision: { gate: "reliable" | "estimate"; line: "reliable" | "estimate"; color: "reliable" | "estimate"; tone: "reliable" | "estimate"; base: "reliable" | "estimate" } | null;
  complete: boolean;
  disclaimer: string;
};
export type HumanDesignChartInput = NormalizedProfileInput;
