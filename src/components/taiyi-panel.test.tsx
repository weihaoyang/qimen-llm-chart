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

  it("shows the specific generals and target for the 秘書 flanking example", () => {
    const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 2 });
    render(<TaiyiPanel chart={chart} yearInput="724" cycle={360} dun="阳遁" ruJuInput="2" />);
    expect(screen.getByText(/主大小将挟客大将于正宫/)).toBeInTheDocument();
  });
});
