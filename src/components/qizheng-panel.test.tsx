// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildQizhengChart } from "@/lib/qizheng/chart";
import { QizhengPanel } from "./qizheng-panel";

const chart = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return buildQizhengChart(normalizeProfileInput(input));
};

describe("QizhengPanel", () => {
  afterEach(() => cleanup());

  it("renders the twelve palaces, seven luminaries and four remainders", () => {
    const value = chart();
    const { container } = render(<QizhengPanel value={value} />);
    expect(screen.getByRole("heading", { name: "七政四余" })).toBeInTheDocument();
    expect(container.querySelectorAll(".qizheng-palaces span")).toHaveLength(12);
    expect(container.querySelector(".qizheng-palaces span.is-ming")).toBeTruthy();
    expect(container.querySelectorAll(".qizheng-row")).toHaveLength(value.stars.length);
    expect(screen.getByText("七政落宫")).toBeInTheDocument();
    expect(screen.getByText("四余落宫")).toBeInTheDocument();
    expect(screen.getByText("罗睺")).toBeInTheDocument();
  });
});
