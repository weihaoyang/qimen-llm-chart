// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildVedicChart } from "@/lib/vedic/chart";
import { VedicPanel } from "./vedic-panel";

const chart = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return buildVedicChart(normalizeProfileInput(input));
};

describe("VedicPanel", () => {
  afterEach(() => cleanup());

  it("renders the varga selector, the south indian chart and the matrix", () => {
    const value = chart();
    const { container } = render(<VedicPanel chart={value} vargaCode="D9" />);

    expect(screen.getByRole("heading", { name: "吠陀分盘 · D9 Navamsa" })).toBeInTheDocument();
    // 16 个分盘按钮 + 2 个交点口径按钮（平 / 真）。
    expect(container.querySelectorAll(".vedic-selector > button")).toHaveLength(18);
    expect(screen.getByRole("group", { name: "选择分盘" }).querySelectorAll("button")).toHaveLength(16);
    expect(screen.getByRole("group", { name: "罗睺 / 计都交点口径" }).querySelectorAll("button")).toHaveLength(2);
    expect(container.querySelectorAll(".vedic-cell")).toHaveLength(12);
    expect(container.querySelectorAll(".vedic-cell.is-lagna")).toHaveLength(1);
    expect(container.querySelectorAll(".vedic-row")).toHaveLength(9);
    expect(container.querySelectorAll(".vedic-matrix__row")).toHaveLength(17);
    expect(container.querySelector(".vedic-center")).toHaveTextContent("D9");
  });

  it("switches between the mean and true node for Rahu / Ketu", () => {
    const value = chart();
    const { container } = render(<VedicPanel chart={value} vargaCode="D1" />);
    expect(container.querySelector(".vedic-table + .vedic-chart__note")).toHaveTextContent("罗睺 / 计都取平交点（Mean Node）");

    const trueButton = screen.getByRole("button", { name: /真交点/ });
    expect(trueButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(trueButton);
    expect(trueButton).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".vedic-table + .vedic-chart__note")).toHaveTextContent("罗睺 / 计都取真交点（True Node）");
  });
});
