import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput } from "@/lib/profile";
import { buildAstroChart } from "@/lib/astro/chart";
import { serializeAstroToCompactJson } from "@/lib/astro/serializer";
import { buildHumanDesignChart } from "@/lib/human-design/chart";
import { serializeHumanDesignToCompactJson } from "@/lib/human-design/serializer";
import { buildTarotReading } from "@/lib/tarot/reading";
import { serializeTarotToCompactJson } from "@/lib/tarot/serializer";

describe("divination JSON export contracts", () => {
  it("exports the three new charts as parseable, versioned JSON", () => {
    const input = getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai");
    input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
    const profile = normalizeProfileInput(input);

    expect(JSON.parse(serializeAstroToCompactJson(buildAstroChart(profile))).format).toBe("qmdj-astro-chart-v1");
    expect(JSON.parse(serializeHumanDesignToCompactJson(buildHumanDesignChart(profile))).format).toBe("qmdj-human-design-v1");
    expect(JSON.parse(serializeTarotToCompactJson(buildTarotReading(profile))).format).toBe("qmdj-tarot-reading-v1");
  });
});
