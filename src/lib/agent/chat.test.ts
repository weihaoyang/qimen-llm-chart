import { describe, expect, it, vi } from "vitest";
import {
  buildAgentMessages,
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
