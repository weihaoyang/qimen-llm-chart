import { describe, expect, it, vi } from "vitest";
import { requestBaziPersonalityPrediction } from "./bazi-personality";

describe("Bazi personality request", () => {
  it("uses deterministic structure-first output instructions", async () => {
    const prediction = JSON.stringify({ chart_diagnosis: {}, mbti_axes: {} });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ model: "mock-model", choices: [{ message: { content: prediction } }] }),
    });

    const result = await requestBaziPersonalityPrediction(
      { structuredText: "日主：戊；月令：寅", jsonPayload: '{"dayMaster":"戊"}' },
      {
        env: {
          OPENAI_API_KEY: "unit-test-key",
          OPENAI_BASE_URL: "https://example.com/v1/",
          OPENAI_MODEL: "mock-model",
        },
        fetchImpl,
      },
    );

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as {
      temperature: number;
      messages: Array<{ content: string }>;
    };
    expect(url?.toString()).toBe("https://example.com/v1/chat/completions");
    expect(body.temperature).toBe(0);
    expect(body.messages[0]?.content).toContain("chart_diagnosis");
    expect(body.messages[0]?.content).toContain("从格反证审计");
    expect(body.messages[1]?.content).toContain("从弱/从财/从杀/从儿候选必须检查");
    expect(result).toEqual({ content: prediction, model: "mock-model" });
  });

  it("does not expose upstream error details", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(requestBaziPersonalityPrediction(
      { structuredText: "text", jsonPayload: "{}" },
      { env: { OPENAI_API_KEY: "unit-test-key" }, fetchImpl },
    )).rejects.toThrow("八字 Agent 暂时不可用，请稍后再试。");
  });

  it("rejects an empty successful response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ model: "mock-model", choices: [{ message: { content: "   " } }] }),
    });
    await expect(requestBaziPersonalityPrediction(
      { structuredText: "text", jsonPayload: "{}" },
      { env: { OPENAI_API_KEY: "unit-test-key" }, fetchImpl },
    )).rejects.toThrow("八字 Agent 返回成功，但没有可解析的结构化内容。");
  });
});
