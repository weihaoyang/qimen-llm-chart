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
});
