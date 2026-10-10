// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildLiurenChart } from "@/lib/liuren/chart";
import { LiurenPanel } from "./liuren-panel";

const chart = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return buildLiurenChart(normalizeProfileInput(input));
};

describe("LiurenPanel", () => {
  afterEach(() => cleanup());

  it("renders the twelve-palace plate, the four lessons and the three transmissions", () => {
    const value = chart();
    const { container } = render(<LiurenPanel chart={value} />);

    expect(screen.getByRole("heading", { name: "大六壬" })).toBeInTheDocument();
    expect(container.querySelectorAll(".liuren-cell")).toHaveLength(12);
    expect(container.querySelectorAll(".liuren-cell.is-day")).toHaveLength(1);
    expect(container.querySelectorAll(".liuren-lesson")).toHaveLength(4);
    expect(container.querySelectorAll(".liuren-transmission")).toHaveLength(3);
    expect(container.querySelectorAll(".liuren-table__row")).toHaveLength(13);
    expect(container.querySelector(".liuren-center")).toHaveTextContent("月将");
  });
});
