import {
  buildAgentMessages,
  extractAssistantText,
  getAgentConfig,
} from "./chat";

type AgentEnvironment = Partial<NodeJS.ProcessEnv>;

type ChatCompletionResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string } | { text?: string }>;
    };
  }>;
};

/**
 * Internal consumer-platform adapter. It reuses the normal Bazi analysis
 * context but requires a small, auditable structure-first personality result.
 */
export const requestBaziPersonalityPrediction = async (
  payload: {
    structuredText: string;
    jsonPayload: string;
  },
  options?: {
    env?: AgentEnvironment;
    fetchImpl?: typeof fetch;
  },
) => {
  const env = options?.env ?? process.env;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const config = getAgentConfig(env);
  const baseUrl = config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`;
  const endpoint = new URL("chat/completions", baseUrl);
  const messages = buildAgentMessages({
    mode: "bazi",
    question: [
      "请基于当前已排好的八字盘，先完成命局结构审计，再输出机器可读的性格假设。不要复述出生日期。",
      "【强制分析顺序】",
      "1. 核对四柱、日主、月令、藏干、透干和合冲刑害；只能使用载荷中的盘面事实。",
      "2. 分别列出日主得令、得地、透干、生扶与克泄耗证据，判断极旺、偏旺、中和、偏弱、极弱或有争议。",
      "3. 先评估普通格局，再独立核验特殊格局。不得因为日主弱就直接判从弱，也不得因为日主旺就直接判从强。",
      "4. 从弱/从财/从杀/从儿候选必须检查：日主是否无有效根、无有效印比救应、全局主导力量是否成势，以及合冲是否改变根气；有有效根或逆势救应时必须列为反证并降级为假从或有争议。",
      "5. 从强/专旺候选必须检查：比劫印星是否形成一致旺势、财官食伤是否有力破势；存在有效逆神时不得判纯从。化气格另列，不得与从格混用。",
      "6. 格局有流派分歧时返回候选、支持证据、反证和置信度，不得强行给唯一结论。",
      "7. 完成格局判断后再映射人格。每个 MBTI 轴至少引用两条相互独立的盘面证据，并列出反向证据；禁止用单一五行、单个十神或生肖直接等同于一个字母。",
      "只输出 JSON，不要 Markdown 代码围栏。JSON 必须包含：",
      "- prediction_version；pillars（year/month/day/hour）；",
      "- chart_diagnosis：day_master_strength、structure、follow_structure、confidence、supporting_evidence、contradicting_evidence；",
      "- mbti_axes（ei、sn、tf、jp，0到100整数；高分端依次为 E、N、T、J，低分端为 I、S、F、P）；",
      "- mbti_axis_evidence：每轴含 direction、confidence、evidence、contradictions；",
      "- trait_scores（openness、conscientiousness、extraversion、agreeableness、emotional_stability，0到100整数）；",
      "- trait_hypotheses（trait、direction、claim、reason）、narrative、disclaimer。",
    ].join("\n"),
    structuredText: payload.structuredText,
    jsonPayload: payload.jsonPayload,
  });
  messages[0] = {
    ...messages[0],
    content: `${messages[0].content}\n\n【内部结构化输出契约】\n只输出合法 JSON；不得输出 Markdown、解释前言或 JSON 之外的字符。必须先完成 chart_diagnosis 和从格反证审计，再输出人格映射。mbti_axes 的高分端必须依次表示 E、N、T、J，低分端必须依次表示 I、S、F、P；mbti_axis_evidence.direction 必须与对应分数方向一致。证据只能引用载荷中存在的月令、透藏、根气、十神、合冲刑害等字段。性格分数只是传统命理叙事映射，不是心理测量，也不是确定性事实。`,
  };

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error("八字 Agent 暂时不可用，请稍后再试。");
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = extractAssistantText(data.choices?.[0]?.message?.content);
  if (!content) {
    throw new Error("八字 Agent 返回成功，但没有可解析的结构化内容。");
  }

  return {
    content,
    model: data.model ?? config.model,
  };
};
