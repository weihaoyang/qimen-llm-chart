import { describe, expect, it } from "vitest";
import { normalizeAdsbLolPointResponse } from "./adsb-lol";

describe("adsb.lol flight normalization", () => {
  it("returns the OpenSky-compatible rows consumed by the GEV renderer", () => {
    const result = normalizeAdsbLolPointResponse({ now: 1_700_000_000, ac: [
      { hex:"abc123", flight:"TEST1 ", lat:31.2, lon:121.5, alt_baro:10_000, alt_geom:10_100, gs:200, track:95, baro_rate:500, seen_pos:2, category:"A3" },
      { hex:"missing-position" },
    ] });
    expect(result.time).toBe(1_700_000_000);
    expect(result.states).toHaveLength(1);
    expect(result.states[0]).toMatchObject({ 0:"abc123", 1:"TEST1", 5:121.5, 6:31.2, 8:false, 17:4 });
  });
});
