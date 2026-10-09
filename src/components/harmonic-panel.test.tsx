// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildHarmonicChart } from "@/lib/harmonic/chart";
import { HarmonicPanel } from "./harmonic-panel";

const chart = (harmonic = 5) => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return buildHarmonicChart(normalizeProfileInput(input), harmonic);
};

describe("HarmonicPanel", () => {
  afterEach(() => cleanup());

  it("draws the wheel, positions and harmonic selector", () => {
    const value = chart(5);
    const { container } = render(<HarmonicPanel value={value} />);
    expect(screen.getByRole("img", { name: /第 5 谐波/ })).toBeInTheDocument();
    expect(container.querySelectorAll(".harmonic-svg__tick")).toHaveLength(12);
    expect(container.querySelectorAll(".harmonic-svg__body")).toHaveLength(value.points.length + value.angles.length);
    expect(container.querySelectorAll(".harmonic-row")).toHaveLength(value.points.length + value.angles.length);
    expect(screen.getByRole("button", { name: "H5" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reports the chosen harmonic", () => {
    const onHarmonicChange = vi.fn();
    render(<HarmonicPanel value={chart(5)} onHarmonicChange={onHarmonicChange} />);
    fireEvent.click(screen.getByRole("button", { name: "H7" }));
    expect(onHarmonicChange).toHaveBeenCalledWith(7);
    fireEvent.change(screen.getByLabelText("自定义谐波数"), { target: { value: "9" } });
    expect(onHarmonicChange).toHaveBeenCalledWith(9);
  });
});
