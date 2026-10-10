// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildAkashaChart } from "@/lib/akasha/chart";
import { AkashaPanel } from "./akasha-panel";

describe("AkashaPanel", () => {
  afterEach(() => cleanup());

  it("renders the holographic report, the reconstruction demo and the akashic knowledge entries", () => {
    const chart = buildAkashaChart({ massKg: 5.9722e24, sourceCount: 3, fragment: 0.25 });
    const { container } = render(
      <AkashaPanel chart={chart} massInput="5.9722e24" sourceCount={3} fragment={0.25} />,
    );

    expect(screen.getByRole("heading", { name: "阿卡西记录 · 全息宇宙" })).toBeInTheDocument();
    expect(container.querySelectorAll(".akasha-facts > div")).toHaveLength(8);
    expect(container.querySelectorAll(".akasha-bars")).toHaveLength(3);
    expect(container.querySelectorAll(".akasha-bars__row > span")).toHaveLength(64 * 3);
    expect(container.querySelectorAll(".akasha-concept")).toHaveLength(7);
    expect(container.querySelectorAll(".akasha-steps li")).toHaveLength(5);
    expect(container.querySelectorAll(".akasha-timeline > div")).toHaveLength(9);
    expect(container.querySelectorAll(".akasha-analogy p")).toHaveLength(3);
    expect(screen.getByText("阿卡西记录 · 知识条目")).toBeInTheDocument();
  });
});
