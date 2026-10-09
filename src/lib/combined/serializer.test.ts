import { describe, expect, it } from "vitest";
import type { ProfileInput } from "@/lib/profile";
import { serializeCombinedToCompactJson, serializeCombinedToStructuredText } from "./serializer";

const inputWith = (overrides: Partial<ProfileInput> = {}) => ({
  original: {
    calendarMode: "solar" as const,
    datetime: "2026-07-03T11:30",
    timeZone: "Asia/Shanghai",
    gender: "male" as const,
    timeBasis: "civil" as const,
    ...overrides,
  },
  normalized: {
    datetime: "2026-07-03T11:30",
    timeZone: "Asia/Shanghai",
    calendarMode: "solar" as const,
    timeBasis: "civil" as const,
  },
});

describe("serializeCombinedToCompactJson", () => {
  it("aggregates three single-chart payloads without adding conclusions", () => {
    const parsed = JSON.parse(
      serializeCombinedToCompactJson({
        input: inputWith(),
        qimen: { format: "qmdj-llm-compact-v1", payload: {} },
        bazi: { format: "bazi-llm-compact-v1", payload: {} },
        ziwei: { format: "ziwei-llm-compact-v2", payload: {} },
      }),
    ) as {
      format: string;
      charts: {
        qimen?: { format: string };
        bazi?: { format: string };
        ziwei?: { format: string };
      };
    };

    expect(parsed.format).toBe("meta-llm-combined-v1");
    expect(parsed.charts.qimen?.format).toBe("qmdj-llm-compact-v1");
    expect(parsed.charts.bazi?.format).toBe("bazi-llm-compact-v1");
    expect(parsed.charts.ziwei?.format).toBe("ziwei-llm-compact-v2");
  });
});

describe("combined time basis", () => {
  // The default is unchanged: one shared time, so the model must not be told
  // there are two.
  it("marks a single shared time by default", () => {
    const parsed = JSON.parse(serializeCombinedToCompactJson({ input: inputWith() })) as { timeBasis: unknown };
    expect(parsed.timeBasis).toEqual({ combined: "2026-07-03T11:30" });
  });

  // 奇门 is a 问事起局 chart; 八字/紫微 are birth charts. When the user opts into
  // separate times the context has to say which chart uses which, or the model
  // will read the question time as a birth time.
  it("separates 奇门's question time from the birth time when split", () => {
    const input = inputWith({ splitChartTimes: true, questionDatetime: "2026-10-10T15:30" });

    const parsed = JSON.parse(serializeCombinedToCompactJson({ input })) as {
      timeBasis: { qimen: string; bazi_ziwei: string; note: string };
    };
    expect(parsed.timeBasis.qimen).toBe("2026-10-10T15:30");
    expect(parsed.timeBasis.bazi_ziwei).toBe("2026-07-03T11:30");

    const text = serializeCombinedToStructuredText({ input });
    expect(text).toContain("时间口径: 奇门用问事起局时间，八字/紫微用出生时间。");
    expect(text).toContain("问事起局时间(奇门): 2026-10-10T15:30");
    expect(text).toContain("出生时间(八字/紫微): 2026-07-03T11:30");
  });
});
