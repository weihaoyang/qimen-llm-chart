import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput } from "@/lib/profile";
import { buildTarotReading } from "./reading";

describe("tarot reading", () => {
  it("draws a deterministic three-card spread", () => {
    const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai"));
    const reading = buildTarotReading(profile);
    expect(reading.cards).toHaveLength(3);
    expect(reading.cards.map((card) => card.name)).toEqual(buildTarotReading(profile).cards.map((card) => card.name));
    expect(reading.cards.every((card) => card.orientation === "正位" || card.orientation === "逆位")).toBe(true);
  });
});
