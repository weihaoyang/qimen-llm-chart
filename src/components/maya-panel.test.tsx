// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildMayaChart } from "@/lib/maya/chart";
import { MayaPanel } from "./maya-panel";

describe("MayaPanel", () => {
  afterEach(() => cleanup());

  it("renders the long count, the twenty day signs and the 13:20 kin", () => {
    const chart = buildMayaChart("2012-12-21");
    const { container } = render(<MayaPanel chart={chart} dateInput="2012-12-21" />);

    expect(screen.getByRole("heading", { name: "玛雅历法 · 卓尔金" })).toBeInTheDocument();
    expect(container.querySelectorAll(".maya-sign")).toHaveLength(20);
    expect(container.querySelectorAll(".maya-sign.is-active")).toHaveLength(1);
    expect(container.querySelectorAll(".maya-oracle__card")).toHaveLength(5);
    expect(container.querySelectorAll(".maya-moons__grid i")).toHaveLength(28);
    expect(screen.getByText("13.0.0.0.0")).toBeInTheDocument();
    expect(screen.getByText("207")).toBeInTheDocument();
  });

  it("shows the Zolkin grid position and the galactic portal / mystic column flag", () => {
    // Kin 39（2013-03-23）为银河门户：Zolkin 第 19 行第 2 列。
    render(<MayaPanel chart={buildMayaChart("2013-03-23")} dateInput="2013-03-23" />);
    expect(screen.getByText(/Zolkin 第 19 行 · 第 2 列/)).toBeInTheDocument();
    expect(screen.getByText(/银河门户（Galactic Portal）/)).toBeInTheDocument();

    cleanup();
    // Kin 121（2013-06-13，恰为 2013-07-26 前 43 天）落在 Zolkin 中央第 7 列 → 神秘柱。
    render(<MayaPanel chart={buildMayaChart("2013-06-13")} dateInput="2013-06-13" />);
    expect(screen.getByText(/Zolkin 第 1 行 · 第 7 列/)).toBeInTheDocument();
    expect(screen.getByText(/神秘柱（Mystic Column）/)).toBeInTheDocument();
  });
});
