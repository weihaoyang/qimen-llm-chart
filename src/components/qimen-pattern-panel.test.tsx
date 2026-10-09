// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import { QimenPatternPanel } from "./qimen-pattern-panel";

const chart = {
  raw: {
    palaces: [
      { position: 3, heavenlyStem: "戊", earthlyStem: "丙", gate: "开门", gatePressure: "无", liuYiJiXing: { hasJiXing: false } },
      { position: 7, heavenlyStem: "无", earthlyStem: "无", gate: "无门", gatePressure: "迫", liuYiJiXing: { hasJiXing: false } },
    ],
    zhiShi: { position: 3, gate: "开门" },
    specialPatterns: { wuBuYuShi: { isWuBuYuShi: false } },
  },
} as unknown as NormalizedQimenChart;

describe("QimenPatternPanel", () => {
  afterEach(() => cleanup());

  it("lists formed and failed patterns with their hints", () => {
    render(<QimenPatternPanel chart={chart} />);

    expect(screen.getByText("青龙返首")).toBeInTheDocument();
    expect(screen.getByText("飞鸟跌穴")).toBeInTheDocument();
    // 青龙返首 is on the board; 飞鸟跌穴 is the reverse pairing and is not.
    expect(screen.getAllByText("成立").length).toBeGreaterThan(0);
    expect(screen.getAllByText("未成立").length).toBeGreaterThan(0);
    expect(screen.getByText(/天盘 戊 · 地盘 丙/)).toBeInTheDocument();
  });

  it("filters to formed or failed", () => {
    render(<QimenPatternPanel chart={chart} />);

    fireEvent.click(screen.getByRole("button", { name: "只看失败" }));
    expect(screen.queryByText("青龙返首")).not.toBeInTheDocument();
    expect(screen.getByText("飞鸟跌穴")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "只看成立" }));
    expect(screen.getByText("青龙返首")).toBeInTheDocument();
    expect(screen.queryByText("飞鸟跌穴")).not.toBeInTheDocument();
  });

  it("shows a placeholder before a chart exists", () => {
    render(<QimenPatternPanel chart={null} />);
    expect(screen.getByText("等待生成盘面。")).toBeInTheDocument();
  });
});
