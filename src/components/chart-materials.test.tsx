// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChartMaterials } from "./chart-materials";

describe("ChartMaterials", () => {
  afterEach(() => cleanup());

  it("opens the materials dialog and closes from the backdrop", () => {
    render(<ChartMaterials text="结构化盘面" json={'{"format":"qmdj-test"}'} literature="文献" />);
    fireEvent.click(screen.getByRole("button", { name: "盘面资料" }));
    expect(screen.getByRole("dialog", { name: "盘面资料" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("dialog", { name: "盘面资料" }).querySelector("header button") as HTMLElement);
    expect(screen.queryByRole("dialog", { name: "盘面资料" })).not.toBeInTheDocument();
  });
});
