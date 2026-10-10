// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildAstroChart } from "@/lib/astro/chart";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildUranianChart } from "@/lib/uranian/chart";
import { UranianPanel } from "./uranian-panel";

const chart = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  const profile = normalizeProfileInput(input);
  return buildUranianChart(profile, buildAstroChart(profile));
};

describe("UranianPanel", () => {
  afterEach(() => cleanup());

  it("renders the dial, the eight TNPs and the midpoint structures", () => {
    const value = chart();
    const { container } = render(<UranianPanel chart={value} />);

    expect(screen.getByRole("heading", { name: "汉堡学派 · 90° 盘" })).toBeInTheDocument();
    expect(container.querySelectorAll(".uranian-marker")).toHaveLength(value.bodies.length);
    expect(container.querySelectorAll(".uranian-row")).toHaveLength(8);
    expect(container.querySelectorAll(".uranian-dial__tick")).toHaveLength(18);
    expect(container.querySelectorAll(".uranian-list__item").length).toBe(value.midpoints.length + value.sums.length + value.differences.length + value.equations.length);
    expect(screen.getByText("八虚星 · TRANSNEPTUNIAN")).toBeInTheDocument();
    expect(screen.getAllByText("丘比特").length).toBeGreaterThan(0);
  });
});
