import { describe, expect, it, vi } from "vitest";
import { selectBaziClassicsContext } from "./bazi-classics";
import {
  AGENT_ANALYSIS_ANGLES,
  buildAgentMessages,
  buildAgentSystemPrompt,
  DEFAULT_AGENT_QUESTIONS,
  extractAssistantText,
  getAgentConfig,
  requestAgentAnalysis,
} from "./chat";

describe("agent chat helpers", () => {
  it("offers five focused analysis angles for every workbench mode", () => {
    expect(Object.values(AGENT_ANALYSIS_ANGLES)).toHaveLength(4);
    for (const angles of Object.values(AGENT_ANALYSIS_ANGLES)) {
      expect(angles).toHaveLength(5);
      expect(angles.every((angle) => angle.label && angle.question)).toBe(true);
    }

    expect(AGENT_ANALYSIS_ANGLES.bazi.at(-1)?.label).toBe("文献对照");
    expect(AGENT_ANALYSIS_ANGLES.combined.at(-1)?.label).toBe("文献与边界");
    expect(AGENT_ANALYSIS_ANGLES.qimen[0]?.evidence).toContain("时令、遁局与局数");
    expect(AGENT_ANALYSIS_ANGLES.bazi[1]?.description).toContain("调候");
  });

  it("falls back to standard OpenAI-compatible env vars", () => {
    expect(
      getAgentConfig({
        OPENAI_API_KEY: "test-key",
      }),
    ).toEqual({
      apiKey: "test-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
    });
  });

  it("accepts Gemini-compatible env aliases with Google defaults", () => {
    expect(
      getAgentConfig({
        GEMINI_API_KEY: "gemini-key",
      }),
    ).toEqual({
      apiKey: "gemini-key",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-2.5-flash",
    });
  });

  it("builds mode-specific messages with the default question", () => {
    const messages = buildAgentMessages({
      mode: "combined",
      structuredText: "combined text",
      jsonPayload: '{"ok":true}',
    });

    expect(messages[1]?.content).toContain(DEFAULT_AGENT_QUESTIONS.combined);
    expect(messages[1]?.content).toContain("结构化文本：\ncombined text");
    expect(messages[1]?.content).toContain('紧凑 JSON：\n{"ok":true}');
  });

  it("adds a structured Bazi analysis protocol and bounded literature references", () => {
    const systemPrompt = buildAgentSystemPrompt("bazi");

    expect(systemPrompt).toContain("【八字分析顺序】");
    expect(systemPrompt).toContain("《子平真诠》");
    expect(systemPrompt).toContain("《穷通宝鉴》");
    expect(systemPrompt).toContain("不得伪造引号、原句、章节、页码");
    expect(systemPrompt).toContain("当前载荷没有流年或当前大运定位字段时");
    expect(systemPrompt).toContain("结构关系摘要");
    expect(systemPrompt).toContain("## 传统文献参考");
    expect(systemPrompt).toContain("每次判断至少串起两个以上的盘面字段");
    expect(systemPrompt).toContain("原始摘录每次最多引用两段短句");
  });

  it("keeps non-Bazi prompts focused on their own chart system", () => {
    const systemPrompt = buildAgentSystemPrompt("qimen");

    expect(systemPrompt).toContain("【奇门分析规则】");
    expect(systemPrompt).toContain("值符、值使、门星神");
    expect(systemPrompt).not.toContain("《子平真诠》");
    expect(systemPrompt).toContain("证据优先级与输出契约");
    expect(systemPrompt).toContain("事实、传统推断和待验证假设");
  });

  it("injects source excerpts into Bazi context and keeps them out of Qimen", () => {
    const baziMessages = buildAgentMessages({
      mode: "bazi",
      question: "请重点分析月令、日主和大运。",
      structuredText: "日主：甲；月令：寅；大运：丙午",
      jsonPayload: "{}",
    });
    const qimenMessages = buildAgentMessages({
      mode: "qimen",
      question: "请分析值使和驿马。",
      structuredText: "值使：景门；驿马：寅",
      jsonPayload: "{}",
    });

    expect(baziMessages[1]?.content).toContain("原始古籍摘录上下文：");
    expect(baziMessages[1]?.content).toContain("《渊海子平》");
    expect(qimenMessages[1]?.content).not.toContain("原始古籍摘录上下文：");
  });

  it("ranks excerpts by the user's requested Bazi angle", () => {
    const context = selectBaziClassicsContext({
      question: "请只看大运和流年触发。",
      structuredText: "当前大运：丙午",
      jsonPayload: "{}",
      limit: 1,
    });

    expect(context).toContain("论大运");
    expect(context).toContain("大运看支");
    expect(context).toContain("原始语料：八字 - 渊海子平.txt");
  });

  it("selects a Tai Sui excerpt for a current-year question", () => {
    const context = selectBaziClassicsContext({
      question: "请分析今年流年和太岁如何触发。",
      structuredText: "流年：丙午",
      jsonPayload: "{}",
      limit: 1,
    });

    expect(context).toContain("《三命通会》｜论太岁");
    expect(context).toContain("逐年太岁游行十二宫");
  });

  it("weights the explicit question above serialized chart boilerplate", () => {
    const context = selectBaziClassicsContext({
      question: "请只分析事业与官星。",
      structuredText: "### 大运\n当前大运：丙午\n流年：丙午",
      jsonPayload: '{"大运":"丙午","流年":"丙午"}',
      limit: 1,
    });

    expect(context).toContain("正官论、论七杀");
  });

  it("extracts assistant text from content parts", () => {
    expect(
      extractAssistantText([
        { type: "output_text", text: "第一段" },
        { text: "第二段" },
      ]),
    ).toBe("第一段\n第二段");
  });

  it("requests a completion through the backend-compatible chat endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "mock-model",
        choices: [
          {
            message: {
              content: "分析完成",
            },
          },
        ],
      }),
    });

    const result = await requestAgentAnalysis(
      {
        mode: "qimen",
        structuredText: "text",
        jsonPayload: "{}",
      },
      {
        env: {
          OPENAI_API_KEY: "test-key",
          OPENAI_BASE_URL: "https://example.com/v1",
          OPENAI_MODEL: "mock-model",
        },
        fetchImpl,
      },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0].toString()).toBe("https://example.com/v1/chat/completions");
    expect(result).toEqual({
      content: "分析完成",
      model: "mock-model",
    });
  });

  it("does not expose upstream error details to the caller", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
    });

    await expect(
      requestAgentAnalysis(
        { mode: "qimen", structuredText: "text", jsonPayload: "{}" },
        { env: { OPENAI_API_KEY: "test-key" }, fetchImpl },
      ),
    ).rejects.toThrow("分析服务暂时不可用，请稍后再试。");
  });
});
