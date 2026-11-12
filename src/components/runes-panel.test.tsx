// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { RUNE_ORDER_NOTE } from "@/lib/runes/data";
import { buildRuneReading } from "@/lib/runes/draw";
import { RunesPanel } from "./runes-panel";

afterEach(cleanup);

it("shows the historical order difference alongside the drawn runes", () => {
  render(<RunesPanel reading={buildRuneReading("kylver-audit", "three")} />);
  expect(screen.getByText(RUNE_ORDER_NOTE)).toBeInTheDocument();
});
