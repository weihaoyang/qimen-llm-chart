/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { NormalizedQimenChart } from "@/lib/qimen/types";

/**
 * `PalaceGrid` is memoized and so are the nine `PalaceCard`s it renders, which
 * only works while every prop keeps its identity between renders. The easiest
 * way to break it is to go back to `onSelect={() => onSelectPalace(position)}`:
 * that closure is new on every render, so `memo` compares unequal and re-renders
 * all nine cards on every keystroke in the parameters drawer. These tests pin
 * the contract that keeps memo effective, rather than the performance itself.
 */
const captured = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }));

vi.mock("./palace-card", () => ({
  PalaceCard: (props: Record<string, unknown>) => {
    captured.calls.push(props);
    return null;
  },
}));

import { PalaceGrid } from "./palace-grid";

const chart = {
  raw: {
    ju: { type: "阳遁", number: 3 },
    yuan: "上元",
    season: "夏",
    monthElement: "火",
    zhiFu: { position: 6 },
    zhiShi: { position: 3 },
  },
  palaceMap: Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((position) => [
      position,
      { position, trigram: "坎", innerOuter: "内", gate: "开门", star: "天辅", deity: "六合", isZhiFu: false, isZhiShi: false, isPostHorse: false, voidness: { hasVoidness: false }, status: {} },
    ]),
  ),
  hiddenStemsByPalace: {},
} as unknown as NormalizedQimenChart;

describe("PalaceGrid", () => {
  afterEach(() => {
    captured.calls.length = 0;
    cleanup();
  });

  it("passes the parent's callback through by identity instead of a new closure", () => {
    const onSelectPalace = vi.fn();
    const { rerender } = render(<PalaceGrid chart={chart} selectedPalace={null} onSelectPalace={onSelectPalace} />);

    expect(captured.calls).toHaveLength(9);
    for (const props of captured.calls) expect(props.onSelect).toBe(onSelectPalace);

    // A re-render with the same inputs must not hand the cards a new callback.
    captured.calls.length = 0;
    rerender(<PalaceGrid chart={chart} selectedPalace={null} onSelectPalace={onSelectPalace} />);
    for (const props of captured.calls) expect(props.onSelect).toBe(onSelectPalace);
  });

  it("renders one card per grid position with the selection flag resolved", () => {
    render(<PalaceGrid chart={chart} selectedPalace={5} onSelectPalace={vi.fn()} />);
    const selected = captured.calls.filter((props) => props.isSelected === true);
    expect(selected).toHaveLength(1);
    expect((selected[0].palace as { position: number }).position).toBe(5);
  });
});

describe("PalaceCard", () => {
  afterEach(cleanup);

  it("reports the palace's own position, not the grid slot", async () => {
    const { PalaceCard } = await vi.importActual<typeof import("./palace-card")>("./palace-card");
    const onSelect = vi.fn();
    const palace = chart.palaceMap[7];
    const { container } = render(
      <PalaceCard palace={palace} hiddenStem="乙" isSelected={false} onSelect={onSelect} />,
    );

    fireEvent.click(container.querySelector("button") as HTMLButtonElement);
    expect(onSelect).toHaveBeenCalledWith(7);
  });
});
