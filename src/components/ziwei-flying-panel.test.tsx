// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildZiweiFlyingChart } from "@/lib/ziwei-flying/chart";
import { ZiweiFlyingPanel } from "./ziwei-flying-panel";

const chart = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  input.gender = "male";
  return buildZiweiFlyingChart(normalizeProfileInput(input));
};

describe("ZiweiFlyingPanel", () => {
  afterEach(() => cleanup());

  it("renders the native four transformations, the flying matrix, the chains and the techniques", () => {
    const value = chart();
    const { container } = render(<ZiweiFlyingPanel chart={value} />);

    expect(screen.getByRole("heading", { name: "紫微飞星 · 河洛化象" })).toBeInTheDocument();
    expect(container.querySelectorAll(".zf-native")).toHaveLength(4);
    expect(container.querySelectorAll(".zf-matrix__row")).toHaveLength(13);
    expect(container.querySelectorAll(".zf-technique")).toHaveLength(7);
    expect(container.querySelectorAll(".zf-facts > div")).toHaveLength(4);
    expect(container.querySelectorAll(".zf-matrix__row.is-laiyin")).toHaveLength(1);
    expect(screen.getByText("飞星矩阵 · 十二宫宫干飞化")).toBeInTheDocument();
  });
});
