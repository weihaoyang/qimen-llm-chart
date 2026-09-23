/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import { normalizeProfileInput } from "@/lib/profile/normalize";
import type { ProfileInput } from "@/lib/profile";

import { BaziPanel } from "./bazi-panel";

const profile: ProfileInput = {
  calendarMode: "solar",
  datetime: "1990-05-20T14:30",
  timeZone: "Asia/Shanghai",
  gender: "male",
  timeBasis: "civil",
};

const chart = buildBaziChartFromProfile(normalizeProfileInput(profile));

// Vitest runs without globals here, so Testing Library cannot register its own
// auto-cleanup. Without this, each render piles onto the same document and the
// document-wide queries below read the previous test's markup.
afterEach(cleanup);

// The 大运 track also marks its first item active, so a bare `button.is-active`
// query would read the 大运 year instead of the 流年 year. Select the track by its
// own label rather than by position, so reordering the markup does not silently
// point these assertions at the wrong control.
const track = (label: "流年" | "流月") => {
  const found = Array.from(document.querySelectorAll(".bazi-timing-track")).find(
    (element) => element.querySelector("span")?.textContent === label,
  );
  if (!found) throw new Error(`timing track not found: ${label}`);
  return found;
};

const activeIn = (label: "流年" | "流月") =>
  track(label).querySelector("button.is-active small")?.textContent ?? "";

describe("BaziPanel", () => {
  it("selects 流年 and 流月 from the injected clock, not the wall clock", () => {
    // The panel used to call `new Date()` during render, which produced different
    // HTML on the server and in the browser. It now takes the instant as a prop.
    // 1998 sits inside this chart's first 大运 (1995–2004) but is nowhere near the
    // real "today", so a stray `new Date()` would fall outside the offered range,
    // snap back to the first year, and fail this assertion.
    render(<BaziPanel chart={chart} now={new Date("1998-07-15T12:00:00.000Z")} />);

    expect(activeIn("流年")).toBe("1998");
    // 流月 follows the injected month while the active year is the current year.
    expect(activeIn("流月")).toBe("七月");
    expect(screen.getByText("1998年 · 七月")).toBeTruthy();
  });

  it("derives the year and the month from one instant", () => {
    // Regression guard for the split-clock bug: the old code read the year and the
    // month from two separate `new Date()` calls, so a render straddling a
    // boundary could pair one year with another year's month. With a single
    // injected instant the two derived values cannot disagree.
    render(<BaziPanel chart={chart} now={new Date("2000-01-01T00:30:00.000Z")} />);

    expect(activeIn("流年")).toBe("2000");
    expect(activeIn("流月")).toBe("一月");
    expect(screen.getByText("2000年 · 一月")).toBeTruthy();
  });

  it("falls back to the hydration-safe instant when no clock is supplied", () => {
    // A caller that forgets `now` must degrade to a stable placeholder rather than
    // reintroduce a mismatch. The real wall clock would pick 2026, which this
    // chart's first 大运 does not cover, so the rendered year would be 1995.
    render(<BaziPanel chart={chart} />);

    expect(activeIn("流年")).toBe("2000");
    expect(activeIn("流年")).not.toBe("1995");
  });

  it("renders an empty state instead of throwing without a chart", () => {
    expect(() => render(<BaziPanel chart={null} now={new Date()} />)).not.toThrow();
    expect(screen.getByText("等待生成八字盘。")).toBeTruthy();
  });
});
