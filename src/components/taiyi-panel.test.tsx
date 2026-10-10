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
  });
});
