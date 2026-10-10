// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SacredGeometryPanel } from "./sacred-geometry-panel";

describe("SacredGeometryPanel", () => {
  afterEach(() => cleanup());

  it("renders the selected figure as shapes", () => {
    const { container } = render(<SacredGeometryPanel patternId="flower" steps={2} />);
    expect(screen.getByRole("heading", { name: /神圣几何/ })).toBeInTheDocument();
    expect(container.querySelectorAll(".sacred-shape")).toHaveLength(22);
    expect(container.querySelectorAll(".sacred-shape--guide").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Flower of Life" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/层数/)).toBeInTheDocument();
  });

  it("reports pattern and depth changes", () => {
    const onPatternChange = vi.fn();
    const onStepsChange = vi.fn();
    render(<SacredGeometryPanel patternId="flower" steps={2} onPatternChange={onPatternChange} onStepsChange={onStepsChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Metatron's Cube" }));
    expect(onPatternChange).toHaveBeenCalledWith("metatron");
    fireEvent.change(screen.getByLabelText(/层数/), { target: { value: "4" } });
    expect(onStepsChange).toHaveBeenCalledWith(4);
  });
});
