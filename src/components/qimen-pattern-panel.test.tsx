// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import { QimenPatternPanel } from "./qimen-pattern-panel";

const chart = {
  raw: {
    palaces: [
      {
        position: 3,
        heavenlyStem: "戊",
        earthlyStem: "丙",
        earthBranch: "卯",
        gate: "开门",
        deity: "值符",
        gatePressure: "无",
        fiveElements: "木",
        status: { star: "旺", gate: "旺" },
        isZhiFu: true,
        liuYiJiXing: { hasJiXing: false },
      },
      {
        position: 7,
        heavenlyStem: "无",
        earthlyStem: "无",
        earthBranch: "酉",
        gate: "无门",
        deity: "无神",
        gatePressure: "迫",
        fiveElements: "金",
        isZhiFu: false,
        liuYiJiXing: { hasJiXing: false },
      },
    ],
    zhiShi: { position: 3, gate: "开门" },
    zhiFu: { position: 3, star: "天冲", heavenlyStem: "戊" },
    specialPatterns: { wuBuYuShi: { isWuBuYuShi: false } },
    fourPillars: {
      year: { stem: "甲", branch: "子" },
      month: { stem: "丙", branch: "寅" },
      day: { stem: "戊", branch: "辰" },
      hour: { stem: "甲", branch: "寅" },
    },
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
    expect(screen.getAllByText(/天盘 戊 · 地盘 丙/).length).toBeGreaterThan(0);
    // 青龙返首 forms in palace 3 whose gate/star are both 旺 → 有力.
    expect(screen.getAllByText("有力").length).toBeGreaterThan(0);
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
