import { describe, expect, it } from "vitest";
import { AETTIR, RUNES, SPREADS, SPREAD_IDS } from "./data";
import { buildRuneReading } from "./draw";
import { NINE_WORLDS } from "./nine-worlds";
import { serializeRunesToCompactJson, serializeRunesToStructuredText } from "./serializer";

describe("elder futhark runes", () => {
  it("keeps the twenty-four runes in three aettir of eight", () => {
    expect(AETTIR).toHaveLength(3);
    expect(RUNES).toHaveLength(24);
    for (let aett = 0; aett < 3; aett += 1) {
      expect(RUNES.filter((rune) => rune.aett === aett)).toHaveLength(8);
    }
    expect(new Set(RUNES.map((rune) => rune.id)).size).toBe(24);
  });

  it("marks the nine runes that cannot be reversed", () => {
    expect(RUNES.filter((rune) => rune.reversed === null)).toHaveLength(9);
    for (const rune of RUNES) {
      expect(rune.char.length).toBeGreaterThan(0);
      expect(rune.path.length).toBeGreaterThan(0);
      expect(rune.keywords.length).toBeGreaterThan(0);
    }
  });

  it("defines four spreads whose positions fit their grids", () => {
    expect(SPREAD_IDS).toEqual(["single", "three", "cross", "nine"]);
    const expected = { single: 1, three: 3, cross: 5, nine: 9 } as const;
    for (const id of SPREAD_IDS) {
      const spread = SPREADS[id];
      expect(spread.positions).toHaveLength(expected[id]);
      for (const position of spread.positions) {
        expect(position.col).toBeGreaterThanOrEqual(1);
        expect(position.col).toBeLessThanOrEqual(spread.cols);
        expect(position.row).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("draws deterministically from a seed without repeating a rune", () => {
    const first = buildRuneReading("qmdj-seed", "nine");
    const again = buildRuneReading("qmdj-seed", "nine");
    expect(first.draws.map((draw) => draw.rune.id)).toEqual(again.draws.map((draw) => draw.rune.id));
    expect(first.draws).toHaveLength(9);
    expect(new Set(first.draws.map((draw) => draw.rune.id)).size).toBe(9);
    for (const draw of first.draws) {
      if (draw.orientation === "reversed") {
        expect(draw.rune.reversed).not.toBeNull();
      }
    }
    expect(buildRuneReading("another-seed", "nine").draws.map((draw) => draw.rune.id)).not.toEqual(first.draws.map((draw) => draw.rune.id));
  });

  it("serializes the reading and the nine worlds", () => {
    const reading = buildRuneReading("seed", "three");
    const text = serializeRunesToStructuredText(reading);
    expect(text).toContain("The Three Norns");
    expect(text).toContain("Yggdrasil");
    expect(text).toContain(reading.draws[0].rune.name);

    const payload = JSON.parse(serializeRunesToCompactJson(reading)) as { format: string; draws: unknown[]; nineWorlds: unknown[] };
    expect(payload.format).toBe("qmdj-runes-v1");
    expect(payload.draws).toHaveLength(3);
    expect(payload.nineWorlds).toHaveLength(9);
    expect(NINE_WORLDS.map((world) => world.level)).toContain("上");
  });
});
