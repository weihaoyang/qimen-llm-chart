import type { NormalizedProfileInput } from "@/lib/profile";
export type HumanDesignType = "生成者" | "显示生产者" | "投射者" | "反映者" | "显化者";
export type HumanDesignAuthority = "情绪权威" | "骶骨权威" | "脾权威" | "意志力权威" | "自我投射权威" | "环境权威" | "月亮权威";
/** 定义：已定义中心之间的连接分量数。 */
export type HumanDesignDefinition = "无定义" | "单一" | "二分" | "三分" | "四分";
export type HumanDesignActivation = { gate: number; line: number; color: number; tone: number; base: number };
/** 四变量：色/音/基 + 依据的天体侧。语义标签（如 PHS 分类）不作推导。 */
export type HumanDesignVariable = { source: string; color: number; tone: number; base: number };
export type HumanDesignVariables = { digestion: HumanDesignVariable; environment: HumanDesignVariable; perspective: HumanDesignVariable; motivation: HumanDesignVariable };
export type HumanDesignCenter = { name: string; defined: boolean; gates: number[] };
export type HumanDesignChannel = { gates: [number, number]; name: string; centers: [string, string] };
export type HumanDesignChart = {
  format: "qmdj-human-design-v1";
  input: { datetime: string; timeZone: string; latitude: number | null; longitude: number | null };
  type: HumanDesignType | null;
  strategy: string | null;
  authority: HumanDesignAuthority | null;
  profile: string | null;
  definition: HumanDesignDefinition | null;
  incarnationCross: string | null;
  incarnationCrossType: "右角度" | "并列" | "左角度" | null;
  variables: HumanDesignVariables | null;
  centers: HumanDesignCenter[];
  channels: HumanDesignChannel[];
  activations: Record<string, { personality: HumanDesignActivation; design: HumanDesignActivation }>;
  precision: { gate: "reliable" | "estimate"; line: "reliable" | "estimate"; color: "reliable" | "estimate"; tone: "reliable" | "estimate"; base: "reliable" | "estimate" } | null;
  complete: boolean;
  disclaimer: string;
};
export type HumanDesignChartInput = NormalizedProfileInput;
