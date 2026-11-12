// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildTaiyiChart } from "@/lib/taiyi/chart";
import { PATTERNS } from "@/lib/taiyi/data";
import { TaiyiPanel } from "./taiyi-panel";

describe("TaiyiPanel", () => {
  afterEach(() => cleanup());

  it("renders the sixteen-deity plate, the sourced patterns, the palaces and the generals", () => {
    const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "auto", ruJu: null });
    const { container } = render(<TaiyiPanel chart={chart} yearInput="2024" cycle={360} dun="auto" ruJuInput="" />);

    expect(screen.getByRole("heading", { name: "太乙神数" })).toBeInTheDocument();
    expect(container.querySelectorAll(".taiyi-cell")).toHaveLength(16);
    expect(container.querySelectorAll(".taiyi-mark--taiyi")).toHaveLength(1);
    expect(container.querySelectorAll(".taiyi-pattern")).toHaveLength(PATTERNS.length);
    expect(container.querySelectorAll(".taiyi-table__row")).toHaveLength(10);
    expect(container.querySelectorAll(".taiyi-general")).toHaveLength(8);
    expect(container.querySelector(".taiyi-table__row.is-active")).toBeTruthy();
    expect(screen.getByText("十六神盘")).toBeInTheDocument();
    expect(screen.getByText(/《太乙秘書》电子本清单（影印待核）/)).toBeInTheDocument();
    expect(screen.queryByText(/本仓未能核到其一手出处/)).not.toBeInTheDocument();
  });

  it("marks a same-palace estimate as a cross-text inference", () => {
    const chart = Array.from({ length: 72 }, (_, i) => buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu: i + 1 })).find(item => item.fixedPlanSamePalaceCandidate)!;
    expect(chart).toBeDefined();
    render(<TaiyiPanel chart={chart} yearInput="2024" cycle={360} dun="阳遁" ruJuInput={String(chart.input.ruJu)} />);
    expect(screen.getByText("定目与太乙同宫，待核")).toBeInTheDocument();
    expect(screen.getByText("定算同宫候选")).toBeInTheDocument();
    expect(screen.getByText(/跨书推导，非古书定算同宫实例/)).toBeInTheDocument();
    expect(screen.queryByText("开门加定大将")).not.toBeInTheDocument();
  });

  it("shows the sourced 912 opposite-gate case", () => {
    const chart = buildTaiyiChart({ year: 912, cycle: 360, dun: "阳遁", ruJu: null });
    render(<TaiyiPanel chart={chart} yearInput="912" cycle={360} dun="阳遁" ruJuInput="" />);
    expect(screen.getByText("提格 · 太乙8宫死门，对宫2宫生门")).toBeInTheDocument();
  });

  it("shows the Yin 60 diagram and prose discrepancy without claiming to calculate the source hour", () => {
    const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu: 60 });
    render(<TaiyiPanel chart={chart} yearInput="724" cycle={360} dun="阴遁" ruJuInput="60" />);
    expect(screen.getByText("图列3宫 · 正文列2宫")).toBeInTheDocument();
    expect(screen.getByText(/原书为时计局例/)).toBeInTheDocument();
  });

  it("shows the specific generals and target for the 秘書 flanking example", () => {
    const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 2 });
    render(<TaiyiPanel chart={chart} yearInput="724" cycle={360} dun="阳遁" ruJuInput="2" />);
    expect(screen.getByText(/主大小将挟客大将于正宫/)).toBeInTheDocument();
  });

  it("shows the 太白 eye-and-Taiyi flank on the actual plate", () => {
    const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu: 15 });
    render(<TaiyiPanel chart={chart} yearInput="2024" cycle={360} dun="阳遁" ruJuInput="15" />);
    expect(screen.getByText(/太乙与天目（文昌）共挟始击（客目）于正宫/)).toBeInTheDocument();
  });

  it("shows the source-specific opposing host general", () => {
    const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu: 13 });
    render(<TaiyiPanel chart={chart} yearInput="2024" cycle={360} dun="阳遁" ruJuInput="13" />);
    expect(screen.getByText(/主参将与太乙对冲（《太白》口径）/)).toBeInTheDocument();
  });
});
