import type { WorkbenchMode } from "@/lib/workbench/types";

export type AgentRequestPayload = {
  mode: WorkbenchMode;
  question?: string;
  structuredText: string;
  jsonPayload: string;
};

type AgentConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ChatCompletionResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string } | { text?: string }>;
    };
  }>;
};

export const DEFAULT_AGENT_QUESTIONS: Record<WorkbenchMode, string> = {
  qimen: "请基于当前奇门盘，概括盘面重点、关键门星神组合与需要重点复核的点。",
  bazi: "请基于当前八字盘，概括四柱结构、十神分布、藏干与大运起运信息，不要直接给出程序式强弱或喜用神定论。",
  ziwei: "请基于当前紫微盘，概括命宫、身宫、主星组合、四化与需要重点关注的宫位联动。",
  combined: "请联合奇门、八字、紫微三盘，整理共振点、差异点与需要人工继续判断的部分。",
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4.1-mini";

const MODE_LABELS: Record<WorkbenchMode, string> = {
  qimen: "奇门遁甲",
  bazi: "八字",
  ziwei: "紫微斗数",
  combined: "三盘联合",
};

export const getAgentConfig = (env: NodeJS.ProcessEnv = process.env): AgentConfig => {
  const apiKey = env.OPENAI_API_KEY ?? env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("未配置 OPENAI_API_KEY 或 AI_API_KEY。");
  }

  return {
    apiKey,
    baseUrl: env.OPENAI_BASE_URL ?? env.AI_BASE_URL ?? DEFAULT_BASE_URL,
    model: env.OPENAI_MODEL ?? env.AI_MODEL ?? DEFAULT_MODEL,
  };
};

export const extractAssistantText = (content: unknown): string => {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
};

export const buildAgentMessages = ({
  mode,
  question,
  structuredText,
  jsonPayload,
}: AgentRequestPayload): ChatMessage[] => {
  const resolvedQuestion = question?.trim() || DEFAULT_AGENT_QUESTIONS[mode];
  const modeLabel = MODE_LABELS[mode];

  return [
    {
      role: "system",
      content: [
        "你是一个命理研究工作台里的分析助理。",
        "只能基于用户提供的盘面材料回答，不要虚构盘面里不存在的字段或结论。",
        "回答使用简体中文，尽量紧凑，优先引用盘面中的具体门、星、神、干支、宫位、十神、四化等信息。",
        "如果信息不足，直接说明“材料不足以支持该结论”。",
        "八字分析不要直接给出程序式强弱和喜用神已定论的口吻，除非用户明确要求并同时给出依据。",
        "输出尽量按以下结构组织：盘面重点、关键信号、交叉印证、待人工复核。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `当前模式：${modeLabel}`,
        `用户问题：${resolvedQuestion}`,
        "",
        "结构化文本：",
        structuredText,
        "",
        "紧凑 JSON：",
        jsonPayload,
      ].join("\n"),
    },
  ];
};

export const requestAgentAnalysis = async (
  payload: AgentRequestPayload,
  options?: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
  },
) => {
  const env = options?.env ?? process.env;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const config = getAgentConfig(env);
  const baseUrl = config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`;
  const endpoint = new URL("chat/completions", baseUrl);

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.4,
      messages: buildAgentMessages(payload),
    }),
  });

  if (!response.ok) {
    throw new Error("分析服务暂时不可用，请稍后再试。");
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = extractAssistantText(data.choices?.[0]?.message?.content);

  if (!content) {
    throw new Error("模型接口返回成功，但没有可展示的文本内容。");
  }

  return {
    content,
    model: data.model ?? config.model,
  };
};
