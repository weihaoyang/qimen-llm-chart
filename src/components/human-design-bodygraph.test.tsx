// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildHumanDesignChart, HD_CHANNELS } from "@/lib/human-design/chart";
import { HumanDesignBodygraph } from "./human-design-bodygraph";

const chart = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return buildHumanDesignChart(normalizeProfileInput(input));
};

describe("HumanDesignBodygraph", () => {
  afterEach(() => cleanup());

  it("draws every channel slot and highlights the defined ones", () => {
    const value = chart();
    const { container } = render(<HumanDesignBodygraph chart={value} />);
    expect(HD_CHANNELS).toHaveLength(36);
    expect(container.querySelectorAll(".bodygraph-svg__channel")).toHaveLength(36);
    expect(container.querySelectorAll(".bodygraph-svg__channel.is-active")).toHaveLength(value.channels.length);
    expect(container.querySelectorAll(".bodygraph-svg__channel.is-muted")).toHaveLength(36 - value.channels.length);
  });

  it("shows the selected center's activated gates", () => {
    const value = chart();
    const definedCenter = value.centers.find((center) => center.defined && center.gates.length > 0);
    expect(definedCenter).toBeTruthy();
    render(<HumanDesignBodygraph chart={value} />);
    fireEvent.click(screen.getByRole("button", { name: `查看${definedCenter?.name}中心` }));
    expect(screen.getByText(/激活门/)).toHaveTextContent(String(definedCenter?.gates[0]));
  });
});
