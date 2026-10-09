// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FOURTH_WAY_CONTENT } from "@/lib/fourth-way/content";
import { EnneagramDiagram, ENNEAGRAM_HEXAD, ENNEAGRAM_TRIANGLE } from "./enneagram-diagram";
import { FourthWayPanel } from "./fourth-way-panel";

describe("EnneagramDiagram", () => {
  afterEach(() => cleanup());

  it("draws nine nodes and both cosmic laws", () => {
    const { container } = render(<EnneagramDiagram />);
    expect(container.querySelectorAll(".enneagram-svg__node")).toHaveLength(9);
    expect(container.querySelectorAll(".enneagram-svg__law--three")).toHaveLength(1);
    expect(container.querySelectorAll(".enneagram-svg__law--seven")).toHaveLength(1);
    expect(ENNEAGRAM_TRIANGLE).toEqual([3, 6, 9]);
    expect(ENNEAGRAM_HEXAD).toEqual([1, 4, 2, 8, 5, 7]);
    // The triangle visits 3-6-9 and closes: 1 move + 2 lines + Z.
    const three = container.querySelector(".enneagram-svg__law--three")?.getAttribute("d") ?? "";
    expect(three.startsWith("M")).toBe(true);
    expect(three.endsWith("Z")).toBe(true);
    expect(three.split("L")).toHaveLength(3);
  });
});

describe("FourthWayPanel", () => {
  afterEach(() => cleanup());

  it("renders every section plus the enneagram and boundary", () => {
    render(<FourthWayPanel content={FOURTH_WAY_CONTENT} />);
    expect(screen.getByRole("heading", { name: "第四道" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /九型图/ })).toBeInTheDocument();
    for (const section of FOURTH_WAY_CONTENT.sections) {
      expect(screen.getByRole("heading", { name: section.title })).toBeInTheDocument();
    }
    expect(screen.getAllByText(/不是科学共识/).length).toBeGreaterThan(0);
  });
});
