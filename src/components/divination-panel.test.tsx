// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildAstroChart } from "@/lib/astro/chart";
import { buildHumanDesignChart, buildHumanDesignChartFromDatetime } from "@/lib/human-design/chart";
import { buildHumanDesignComposite } from "@/lib/human-design/composite";
import { DivinationPanel } from "./divination-panel";
import { buildTarotReading } from "@/lib/tarot/reading";

const chart = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return buildHumanDesignChart(normalizeProfileInput(input));
};

const noteStartingWith = (prefix: string) =>
  [...document.querySelectorAll(".divination-panel__note")].find((node) => node.textContent?.startsWith(prefix));

it("labels tarot core keywords separately from the orientation-specific meaning", () => {
  const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai"));
  const reading = Array.from({ length: 30 }, (_, i) => buildTarotReading(profile, `orientation-${i}`))
    .find(result => result.cards.some(card => card.orientation === "逆位"))!;
  const reversed = reading.cards.find(card => card.orientation === "逆位")!;
  render(<DivinationPanel kind="tarot" value={reading} />);
  const card = [...document.querySelectorAll(".tarot-card")].find(node => node.textContent?.includes(reversed.name));
  expect(card?.textContent).toContain(`牌面核心词：${reversed.keyword}`);
  expect(card?.textContent).toContain(reversed.meaning);
  cleanup();
});

it("shows the historical source distinction when Two of Cups is reversed", () => {
  const profile = normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T00:00:00Z"), "Asia/Shanghai"));
  const reading = Array.from({ length: 300 }, (_, i) => buildTarotReading(profile, `cups-source-${i}`))
    .find(result => result.cards.some(card => card.id === "two-of-cups" && card.orientation === "逆位"))!;
  render(<DivinationPanel kind="tarot" value={reading} />);
  expect(screen.getByText(/图解条未列逆位/)).toHaveTextContent("补充释义另列‘热情’");
  cleanup();
});

describe("DivinationPanel astro（缺出生地的空态引导）", () => {
  afterEach(() => cleanup());

  const astroChart = (withLocation: boolean) => {
    const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
    if (withLocation) input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
    else delete input.location;
    return buildAstroChart(normalizeProfileInput(input));
  };

  it("缺出生地时写明为什么空，并给出一键补录动作", () => {
    const onRequestLocation = vi.fn();
    render(<DivinationPanel kind="astro" value={astroChart(false)} onRequestLocation={onRequestLocation} />);

    expect(screen.getByText(/还差出生地/)).toBeInTheDocument();
    expect(screen.getByText(/不受出生地影响/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "去补出生地" }));
    expect(onRequestLocation).toHaveBeenCalledTimes(1);
  });

  it("有出生地时不出现该提示", () => {
    render(<DivinationPanel kind="astro" value={astroChart(true)} />);
    expect(screen.queryByText(/还差出生地/)).not.toBeInTheDocument();
  });
});

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
