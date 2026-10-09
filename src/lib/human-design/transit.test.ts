import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildHumanDesignChart, HD_CHANNELS } from "./chart";
import { buildHumanDesignTransit } from "./transit";

const natal = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return buildHumanDesignChart(normalizeProfileInput(input));
};

describe("human design transit", () => {
  it("derives a deterministic transit for a fixed moment", () => {
    const chart = natal();
    const at = new Date("2026-03-03T12:00:00Z");
    const transit = buildHumanDesignTransit(chart, at);
    expect(transit).toBeTruthy();
    expect(Object.keys(transit?.activations ?? {})).toHaveLength(13);
    expect(transit?.gates.length).toBeGreaterThan(0);
    expect(transit?.gates.length).toBeLessThanOrEqual(13);
    expect(buildHumanDesignTransit(chart, at)).toEqual(transit);
  });

  it("overlays the transit gates on the natal design", () => {
    const chart = natal();
    const transit = buildHumanDesignTransit(chart, new Date("2026-03-03T12:00:00Z"));
    expect(transit).toBeTruthy();
    if (!transit) return;

    const natalGates = new Set(Object.values(chart.activations).flatMap((value) => [value.personality.gate, value.design.gate]));
    expect(new Set(transit.overlay.gates)).toEqual(new Set([...natalGates, ...transit.gates]));

    const union = new Set(transit.overlay.gates);
    for (const channel of transit.overlay.channels) {
      expect(union.has(channel.gates[0])).toBe(true);
      expect(union.has(channel.gates[1])).toBe(true);
    }
    expect(transit.overlay.channels.length).toBeGreaterThanOrEqual(chart.channels.length);

    const natalChannels = new Set(chart.channels.map((channel) => channel.gates.join("-")));
    expect(transit.overlay.newChannels.every((channel) => !natalChannels.has(channel.gates.join("-")))).toBe(true);
    expect(HD_CHANNELS).toHaveLength(36);
  });
});
