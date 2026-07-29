import { describe, expect, it } from "vitest";
import { serializeCombinedToCompactJson } from "./serializer";

describe("serializeCombinedToCompactJson", () => {
  it("aggregates three single-chart payloads without adding conclusions", () => {
    const parsed = JSON.parse(
      serializeCombinedToCompactJson({
        input: {
          original: {
            calendarMode: "solar",
            datetime: "2026-07-03T11:30",
            timeZone: "Asia/Shanghai",
            gender: "male",
            timeBasis: "civil",
          },
          normalized: {
            datetime: "2026-07-03T11:30",
            timeZone: "Asia/Shanghai",
            calendarMode: "solar",
            timeBasis: "civil",
          },
        },
        qimen: { format: "qmdj-llm-compact-v1", payload: {} },
        bazi: { format: "bazi-llm-compact-v1", payload: {} },
        ziwei: { format: "ziwei-llm-compact-v1", payload: {} },
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
    expect(parsed.charts.ziwei?.format).toBe("ziwei-llm-compact-v1");
  });
});
