/** @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  HYDRATION_SAFE_DATE,
  HYDRATION_SAFE_TIME_ZONE,
  useResolvedClock,
  type ResolvedClock,
} from "./hydration-clock";

/**
 * Capture every value the hook returns, in render order. `render()` flushes
 * effects, so index 0 is the pre-mount render — the one that has to match the
 * server's HTML byte for byte — and the last index is the settled value.
 */
const capture = () => {
  const seen: ResolvedClock[] = [];
  const Probe = () => {
    seen.push(useResolvedClock());
    return null;
  };
  render(<Probe />);
  return seen;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useResolvedClock", () => {
  it("pins the pre-mount render to a fixed instant", () => {
    // The whole point of the constant: server and client must agree on the first
    // render, so it cannot be `new Date()`. A regression here reappears as a
    // hydration mismatch in the panels that format dates, not as a failing unit
    // test elsewhere.
    const [first] = capture();
    expect(first.now).toBe(HYDRATION_SAFE_DATE);
    expect(first.timeZone).toBe(HYDRATION_SAFE_TIME_ZONE);
    expect(first.resolved).toBe(false);
  });

  it("keeps the safe date away from a day boundary in every time zone", () => {
    // The fallback is mid-day UTC on purpose. If it drifted to midnight, a
    // visitor east or west of UTC would see the placeholder describe a different
    // calendar day than the real clock, which is exactly the drift it exists to
    // prevent. Asserted as a property so the constant can move without breaking
    // the test, but not without breaking the guarantee.
    const hoursUtc = HYDRATION_SAFE_DATE.getUTCHours();
    expect(hoursUtc).toBeGreaterThanOrEqual(6);
    expect(hoursUtc).toBeLessThanOrEqual(18);
  });

  it("flips to the real wall clock after mount", () => {
    const before = Date.now();
    const seen = capture();
    const last = seen.at(-1)!;

    expect(last.resolved).toBe(true);
    expect(last.now).toBeInstanceOf(Date);
    expect(last.now.getTime()).toBeGreaterThanOrEqual(before);
    // A second, unsynchronized swap would show up as more than one distinct
    // clock value across the render pass.
    expect(new Set(seen.map((entry) => entry.now.getTime())).size).toBe(2);
  });

  it("resolves the visitor's own time zone, not the placeholder", () => {
    const last = capture().at(-1)!;
    // jsdom reports UTC, so the assertion is deliberately loose: the point is
    // that `resolved` carries a value read at mount rather than the constant.
    expect(typeof last.timeZone).toBe("string");
    expect(last.timeZone.length).toBeGreaterThan(0);
  });

  it("falls back to a valid zone instead of throwing when Intl is unavailable", () => {
    // Locked-down runtimes and older embedded webviews can throw from
    // `resolvedOptions()`. Crashing the mount effect would blank the workspace,
    // so the fallback has to survive.
    vi.stubGlobal("Intl", {
      ...Intl,
      DateTimeFormat: () => {
        throw new Error("time zone data unavailable");
      },
    });

    expect(() => capture()).not.toThrow();
    expect(capture().at(-1)!.timeZone).toBe(HYDRATION_SAFE_TIME_ZONE);
  });
});
