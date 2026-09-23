/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { KlinePoint, KlineSeries } from "@/lib/qimen/kline";
import { DEFAULT_WINDOW_RADIUS } from "@/lib/kline/life-kline-reading";

/**
 * `ResponsiveContainer` measures its parent and jsdom reports every element as
 * 0×0, so the chart would render an empty box. The panel assertions below are
 * about the panel, not the plot, so the substitution only has to stop Recharts
 * from bailing out.
 */
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  const react = await import("react");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      react.cloneElement(children as ReactElement<{ width?: number; height?: number }>, { width: 800, height: 320 }),
  };
});

import { KlinePanel } from "./kline-panel";

afterEach(cleanup);

/** 40 years from 起运 1996 — the shape a 1990-born profile produces. */
const points: KlinePoint[] = Array.from({ length: 40 }, (_, index) => {
  const year = 1996 + index;
  const close = index + 10;
  return {
    index,
    datetime: `${year}-01-01T00:00`,
    open: close - 2,
    high: close + 4,
    low: close - 4,
    close,
    score: close,
    delta: 0,
    phase: "震荡",
    // The year is the only identifying part these assertions need.
    label: `Y${year}`,
    keyPoint: "",
    prediction: "等待下一运年与现实反馈再复盘。",
    evidence: [`大运 丙戌（1996 起）`, `流年 丙午`],
  };
});

const series: KlineSeries = {
  kind: "life",
  title: "人生 K 线",
  disclaimer: "不代表财富、健康或事件预测。",
  methodology: "把大运与流年整理成可复核的结构波动。",
  points,
  keyPoints: [],
  sourceCount: 12,
};

const renderPanel = (now?: Date) =>
  render(
    <KlinePanel
      life={series}
      relationship={{ ...series, kind: "relationship" }}
      aiContent=""
      loading={false}
      onAnalyze={() => {}}
      now={now}
    />,
  );

const CLOCK = new Date("2026-06-01T00:00:00Z");

describe("KlinePanel default selection", () => {
  it("describes today rather than the first year of the series", () => {
    const { container } = renderPanel(CLOCK);
    // 2026 is index 30, so close/score 40; index 0 would be 10.
    expect(container.querySelector(".kline-panel__stats strong")?.textContent).toBe("40");
    expect(container.querySelector(".kline-panel__detail strong")?.textContent).toBe("Y2026");
  });

  it("keeps the default selection inside the window the chart opens on", () => {
    const { container } = renderPanel(CLOCK);
    const year = Number(container.querySelector(".kline-panel__detail strong")?.textContent?.slice(1));
    // Mirrors `defaultWindow`: today ± DEFAULT_WINDOW_RADIUS, clamped to the series.
    expect(year).toBeGreaterThanOrEqual(1996);
    expect(year).toBeLessThanOrEqual(1996 + DEFAULT_WINDOW_RADIUS * 2 + 30);
    expect(year).toBeGreaterThanOrEqual(2026 - DEFAULT_WINDOW_RADIUS);
    expect(year).toBeLessThanOrEqual(2026 + DEFAULT_WINDOW_RADIUS);
  });

  it("falls back to the opening years before the clock resolves", () => {
    const { container } = renderPanel(undefined);
    expect(container.querySelector(".kline-panel__detail strong")?.textContent).toBe("Y1996");
  });
});

describe("KlinePanel heads-up display", () => {
  it("does not float a card over the plot before anything is hovered", () => {
    // The regression: a pinned HUD opened on top of the candles, describing a
    // year the chart was not even showing.
    const { container } = renderPanel(CLOCK);
    expect(container.querySelectorAll(".kline-hud")).toHaveLength(0);
  });
});
