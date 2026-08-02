import { describe, expect, it, vi } from "vitest";
import {
  buildAgentMessages,
  buildAgentSystemPrompt,
  DEFAULT_AGENT_QUESTIONS,
  extractAssistantText,
  getAgentConfig,
  requestAgentAnalysis,
} from "./chat";

describe("agent chat helpers", () => {
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
    expect(systemPrompt).toContain("## 传统文献参考");
  });

  it("keeps non-Bazi prompts focused on their own chart system", () => {
    const systemPrompt = buildAgentSystemPrompt("qimen");

    expect(systemPrompt).toContain("【奇门分析规则】");
    expect(systemPrompt).toContain("值符、值使、门星神");
    expect(systemPrompt).not.toContain("《子平真诠》");
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
