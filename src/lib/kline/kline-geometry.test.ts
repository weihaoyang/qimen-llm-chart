import { describe, expect, it } from "vitest";
import { candleBodyWidth, candleGeometry } from "./kline-geometry";

/**
 * A candle shape must keep its wick when the high/low reach past the body.
 *
 * Upstream read Recharts' internal `yAxis.scale` and fell back to the body rect
 * on any failure, which renders a candle with no shadows at all — a wrong
 * reading that looks like a legitimate doji. These cases pin the arithmetic that
 * replaced it.
 */
describe("candle geometry", () => {
  // Rect Recharts hands the shape: high at y, low at y + height.
  const box = { y: 100, height: 200, high: 80, low: 20 };

  it("maps open and close through the rect's own scale", () => {
    const geometry = candleGeometry({ ...box, open: 50, close: 60 });
    // pixel(v) = 100 + 200 * (80 - v) / 60
    expect(geometry.bodyTop).toBeCloseTo(100 + (200 * 20) / 60, 6);
    expect(geometry.bodyHeight).toBeCloseTo((200 * 10) / 60, 6);
    expect(geometry.up).toBe(true);
  });

  it("keeps the wick spanning the full high/low range, not the body", () => {
    const geometry = candleGeometry({ ...box, open: 50, close: 60 });
    expect(geometry.wickTop).toBe(100);
    expect(geometry.wickBottom).toBe(300);
    // The regression this guards: wick endpoints collapsing onto the body.
    expect(geometry.wickTop).not.toBe(geometry.bodyTop);
    expect(geometry.wickBottom).toBeGreaterThan(geometry.bodyTop + geometry.bodyHeight);
  });

  it("reports a falling candle as down", () => {
    expect(candleGeometry({ ...box, open: 60, close: 50 }).up).toBe(false);
  });

  it("keeps a doji visible at the minimum body height", () => {
    const geometry = candleGeometry({ ...box, open: 50, close: 50 });
    expect(geometry.bodyHeight).toBe(2);
    expect(geometry.bodyTop).toBeCloseTo(200, 6);
  });

  it("honours a custom minimum body height", () => {
    expect(candleGeometry({ ...box, open: 50, close: 50 }, 5).bodyHeight).toBe(5);
  });

  it("collapses a zero-range candle onto the rect instead of dividing by zero", () => {
    const flat = candleGeometry({ y: 100, height: 200, high: 50, low: 50, open: 50, close: 50 });
    expect(flat).toEqual({ wickTop: 100, wickBottom: 100, bodyTop: 100, bodyHeight: 2, up: true });
  });

  it("treats a non-finite range as flat rather than emitting NaN coordinates", () => {
    const broken = candleGeometry({ y: 10, height: 40, high: Number.NaN, low: 20, open: 20, close: 30 });
    expect(Number.isFinite(broken.bodyTop)).toBe(true);
    expect(Number.isFinite(broken.bodyHeight)).toBe(true);
  });
});

describe("candle body width", () => {
  it("scales with the slot and never disappears", () => {
    expect(candleBodyWidth(20)).toBe(12);
    expect(candleBodyWidth(100)).toBe(62);
    expect(candleBodyWidth(1)).toBe(2);
    expect(candleBodyWidth(0)).toBe(2);
  });
});
