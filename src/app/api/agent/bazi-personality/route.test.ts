import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requestBaziPersonalityPredictionMock,
  normalizeProfileInputMock,
  buildBaziChartFromProfileMock,
  serializeBaziToCompactJsonMock,
  serializeBaziToStructuredTextMock,
} = vi.hoisted(() => ({
  requestBaziPersonalityPredictionMock: vi.fn(),
  normalizeProfileInputMock: vi.fn((profile) => profile),
  buildBaziChartFromProfileMock: vi.fn(),
  serializeBaziToCompactJsonMock: vi.fn(),
  serializeBaziToStructuredTextMock: vi.fn(),
}));

vi.mock("@/lib/agent/bazi-personality", () => ({
  requestBaziPersonalityPrediction: requestBaziPersonalityPredictionMock,
}));

vi.mock("@/lib/bazi/chart", () => ({
  buildBaziChartFromProfile: buildBaziChartFromProfileMock,
}));

vi.mock("@/lib/profile", () => ({
  normalizeProfileInput: normalizeProfileInputMock,
}));

vi.mock("@/lib/bazi/serializer", () => ({
  serializeBaziToCompactJson: serializeBaziToCompactJsonMock,
  serializeBaziToStructuredText: serializeBaziToStructuredTextMock,
}));

import { POST } from "./route";

const SECRET = "test-qmdj-internal-secret-0123456789";
const requestBody = {
  birth_date: "1995-08-17",
  birth_time: "14:30",
  timezone: "Asia/Shanghai",
  gender: "female",
  calendar: "solar",
};

const predictionJson = {
  chart_diagnosis: {
    day_master_strength: "weak",
    structure: "普通格局候选",
    follow_structure: "not-supported",
    confidence: 72,
    supporting_evidence: ["月令失令", "日主在辰中仍有根气"],
    contradicting_evidence: ["印星透干，不支持纯从"],
  },
  mbti_axes: { ei: 68, sn: 72, tf: 32, jp: 41 },
  mbti_axis_evidence: {
    ei: { direction: "E", confidence: 60, evidence: ["月令证据", "透干证据"], contradictions: [] },
    sn: { direction: "N", confidence: 60, evidence: ["月令证据", "透干证据"], contradictions: [] },
    tf: { direction: "F", confidence: 60, evidence: ["月令证据", "透干证据"], contradictions: [] },
    jp: { direction: "P", confidence: 60, evidence: ["月令证据", "透干证据"], contradictions: [] },
  },
  trait_scores: {
    openness: 70,
    conscientiousness: 40,
    extraversion: 55,
    agreeableness: 65,
    emotional_stability: 45,
  },
  trait_hypotheses: [
    {
      trait: "openness",
      direction: "high",
      claim: "倾向从复杂经验中寻找意义和模式",
      reason: "这是基于盘面结构的传统叙事假设。",
    },
  ],
  narrative: "这是一段结构化的传统命理性格叙事。",
  disclaimer: "这不是科学测量或心理诊断。",
};

const signedRequest = (body: object = requestBody, timestamp = Math.floor(Date.now() / 1000).toString()) => {
  const rawBody = JSON.stringify(body);
  const signature = createHmac("sha256", SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return new Request("http://localhost/api/agent/bazi-personality", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SS-Bazi-Timestamp": timestamp,
      "X-SS-Bazi-Signature": signature,
    },
    body: rawBody,
  });
};

describe("POST /api/agent/bazi-personality", () => {
  beforeEach(() => {
    process.env.BAZI_AGENT_INTERNAL_SECRET = SECRET;
    requestBaziPersonalityPredictionMock.mockReset();
    normalizeProfileInputMock.mockClear();
    buildBaziChartFromProfileMock.mockReset();
    serializeBaziToCompactJsonMock.mockReset();
    serializeBaziToStructuredTextMock.mockReset();
    buildBaziChartFromProfileMock.mockReturnValue({
      raw: {
        pillars: [
          { key: "year", pillar: "乙亥" },
          { key: "month", pillar: "甲申" },
          { key: "day", pillar: "戊辰" },
          { key: "time", pillar: "己未" },
        ],
      },
    });
    serializeBaziToCompactJsonMock.mockReturnValue('{"pillars":"compact"}');
    serializeBaziToStructuredTextMock.mockReturnValue("结构化八字盘面");
    requestBaziPersonalityPredictionMock.mockResolvedValue({
      content: JSON.stringify(predictionJson),
      model: "test-model",
    });
  });

  it("rejects an unsigned request before chart calculation", async () => {
    const response = await POST(new Request("http://localhost/api/agent/bazi-personality", {
      method: "POST",
      body: JSON.stringify(requestBody),
    }));

    expect(response.status).toBe(401);
    expect(buildBaziChartFromProfileMock).not.toHaveBeenCalled();
  });

  it("reuses the qmdj chart and agent pipeline behind the HMAC boundary", async () => {
    const response = await POST(signedRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      prediction_version: "bazi-v2-structure-first",
      pillars: { year: "乙亥", month: "甲申", day: "戊辰", hour: "己未" },
      mbti_code: "ENFP",
      ...predictionJson,
      provider: "qmdj-agent",
      model: "test-model",
      cache_hit: false,
      prompt_version: "bazi-personality-v3-structure-first",
    }));
    expect(buildBaziChartFromProfileMock).toHaveBeenCalledTimes(1);
    expect(serializeBaziToStructuredTextMock).toHaveBeenCalledTimes(1);
    expect(serializeBaziToCompactJsonMock).toHaveBeenCalledTimes(1);
    expect(requestBaziPersonalityPredictionMock).toHaveBeenCalledWith({
      structuredText: "结构化八字盘面",
      jsonPayload: '{"pillars":"compact"}',
    });
    expect(JSON.stringify(requestBaziPersonalityPredictionMock.mock.calls[0])).not.toContain("1995-08-17");
  });

  it("rejects malformed structured output instead of persisting an invalid prediction", async () => {
    requestBaziPersonalityPredictionMock.mockResolvedValueOnce({
      content: JSON.stringify({ ...predictionJson, trait_scores: { openness: 101 } }),
      model: "test-model",
    });

    const response = await POST(signedRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Agent 返回的性格分数不符合结构化契约。" });
  });

  it("normalizes the documented Chinese structure labels to stable contract tokens", async () => {
    requestBaziPersonalityPredictionMock.mockResolvedValueOnce({
      content: JSON.stringify({
        ...predictionJson,
        chart_diagnosis: {
          ...predictionJson.chart_diagnosis,
          day_master_strength: "极弱",
          follow_structure: "从财格候选",
        },
      }),
      model: "test-model",
    });

    const response = await POST(signedRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.chart_diagnosis).toEqual(expect.objectContaining({
      day_master_strength: "extreme-weak",
      follow_structure: "follow-wealth-candidate",
    }));
  });

  it("normalizes bounded decimal and numeric-string scores from the model", async () => {
    requestBaziPersonalityPredictionMock.mockResolvedValueOnce({
      content: JSON.stringify({
        ...predictionJson,
        mbti_axes: { ei: 67.6, sn: "72", tf: 31.7, jp: 40.8 },
        trait_scores: { ...predictionJson.trait_scores, openness: "69.6" },
      }),
      model: "test-model",
    });

    const response = await POST(signedRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mbti_axes).toEqual({ ei: 68, sn: 72, tf: 32, jp: 41 });
    expect(body.trait_scores.openness).toBe(70);
  });

  it("normalizes separated, nested, and single-letter MBTI axis shapes", async () => {
    requestBaziPersonalityPredictionMock.mockResolvedValueOnce({
      content: JSON.stringify({
        ...predictionJson,
        mbti_axes: {
          "E/I": { score: "67.6" },
          N: 72,
          F: 68,
          P: 59,
        },
      }),
      model: "test-model",
    });

    const response = await POST(signedRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mbti_axes).toEqual({ ei: 68, sn: 72, tf: 32, jp: 41 });
    expect(body.mbti_code).toBe("ENFP");
  });

  it("forwards true-solar time and longitude into the shared chart profile", async () => {
    const response = await POST(signedRequest({
      ...requestBody,
      time_basis: "true-solar",
      longitude: 116.4074,
    }));

    expect(response.status).toBe(200);
    expect(normalizeProfileInputMock).toHaveBeenCalledWith(expect.objectContaining({
      timeBasis: "true-solar",
      location: { longitude: 116.4074 },
    }));
  });

  it("rejects malformed MBTI axes instead of deriving a misleading code", async () => {
    requestBaziPersonalityPredictionMock.mockResolvedValueOnce({
      content: JSON.stringify({ ...predictionJson, mbti_axes: { ei: 101, sn: 72, tf: 32, jp: 41 } }),
      model: "test-model",
    });

    const response = await POST(signedRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Agent 返回的 MBTI 四维不符合结构化契约。" });
  });

  it("rejects a prediction that skips the ordinary-versus-follow-structure audit", async () => {
    const { chart_diagnosis: _diagnosis, ...withoutDiagnosis } = predictionJson;
    requestBaziPersonalityPredictionMock.mockResolvedValueOnce({
      content: JSON.stringify(withoutDiagnosis),
      model: "test-model",
    });

    const response = await POST(signedRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Agent 没有返回命局结构诊断。" });
  });
});
