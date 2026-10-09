// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildHumanDesignChart, buildHumanDesignChartFromDatetime } from "@/lib/human-design/chart";
import { buildHumanDesignComposite } from "@/lib/human-design/composite";
import { DivinationPanel } from "./divination-panel";

const chart = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return buildHumanDesignChart(normalizeProfileInput(input));
};

const noteStartingWith = (prefix: string) =>
  [...document.querySelectorAll(".divination-panel__note")].find((node) => node.textContent?.startsWith(prefix));

describe("DivinationPanel human design", () => {
  afterEach(() => cleanup());

  it("builds a composite from a partner birth time", () => {
    const value = chart();
    render(<DivinationPanel kind="human-design" value={value} />);

    fireEvent.change(screen.getByLabelText("合图对方出生时间"), { target: { value: "1992-02-02T09:00" } });
    fireEvent.click(screen.getByRole("button", { name: "生成合图" }));

    const expected = buildHumanDesignComposite(value, buildHumanDesignChartFromDatetime("1992-02-02T09:00", value.input.timeZone));
    const note = noteStartingWith("合图");
    expect(note).toBeTruthy();
    expect(note?.textContent).toContain(expected.type);
    expect(note?.textContent).toContain(String(expected.channels.length));
    // The BodyGraph legend gains the composite swatch once a partner is set.
    expect(document.querySelector(".legend-line--partner")).toBeTruthy();
  });

  it("computes a transit overlay on demand", () => {
    render(<DivinationPanel kind="human-design" value={chart()} />);
    fireEvent.click(screen.getByRole("button", { name: /叠加流日/ }));
    expect(noteStartingWith("流日")).toBeTruthy();
  });
});
