// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import { MetadataPanel } from "./metadata-panel";

const chart: NormalizedQimenChart = {
  engine: "3meta",
  input: {
    datetime: "2026-07-03T11:30",
    timeZone: "Asia/Shanghai",
    qimenSettings: {
      method: "default",
      solarTerm: "auto",
      dunType: "auto",
      juNumber: "auto",
      yearDivide: "exact",
    },
  },
  interpretedDateTime: "2026-07-03 11:30:00",
  raw: {
    version: "test",
    timeInfo: {
      solarDate: "2026-07-03",
      lunarDate: "丙午年五月十九",
      chineseYear: "丙午",
      chineseMonth: "甲午",
      chineseDay: "辛巳",
      timeEarthlyBranch: "午",
      timeName: "午时",
      solarTerm: "夏至",
      xunShou: "甲子",
      chineseTime: "午时",
      voidness: ["子", "亥"],
    },
    fourPillars: {
      year: { stem: "丙", branch: "午" },
      month: { stem: "甲", branch: "午" },
      day: { stem: "辛", branch: "巳" },
      hour: { stem: "甲", branch: "午" },
    },
    ju: {
      type: "阴遁",
      number: 3,
    },
    yuan: "上元",
    season: "夏",
    monthElement: "火",
    zhiFu: {
      star: "天蓬",
      position: 1,
      heavenlyStem: "壬",
    },
    zhiShi: {
      gate: "休门",
      position: 1,
    },
    postHorse: {
      branch: "申",
      position: 6,
    },
    palaces: [],
    hiddenStems: {},
    specialPatterns: {},
  } as NormalizedQimenChart["raw"],
  hiddenStemsByPalace: {},
  palaceMap: {},
};

describe("MetadataPanel", () => {
  it("shows both supported and unsupported chart-method information", () => {
    render(<MetadataPanel chart={chart} />);

    expect(screen.getByText("当前口径")).toBeInTheDocument();
    expect(screen.getByText("算法引擎")).toBeInTheDocument();
    expect(screen.getByText("用局法")).toBeInTheDocument();
    expect(screen.getByText("未接入")).toBeInTheDocument();
    expect(screen.getByText("默认 / 拆补 / 茅山 / 节气 / 阴阳遁 / 局数 / 年界")).toBeInTheDocument();
    expect(screen.getByText("置闰 / 飞盘")).toBeInTheDocument();
  });
});
