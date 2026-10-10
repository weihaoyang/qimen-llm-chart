// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildQabalahReading } from "@/lib/qabalah/chart";
import { QabalahPanel } from "./qabalah-panel";

describe("QabalahPanel", () => {
  afterEach(() => cleanup());

  it("renders the four worlds, the ten sephirot, the letters and the gematria", () => {
    const reading = buildQabalahReading("יהוה");
    const { container } = render(<QabalahPanel reading={reading} input="יהוה" />);

    expect(screen.getByRole("heading", { name: "赫尔墨斯卡巴拉" })).toBeInTheDocument();
    expect(container.querySelectorAll(".qabalah-world")).toHaveLength(4);
    expect(container.querySelectorAll(".qabalah-table__row")).toHaveLength(11);
    expect(container.querySelectorAll(".qabalah-table__row.is-active")).toHaveLength(1);
    expect(container.querySelectorAll(".qabalah-letter")).toHaveLength(22);
    expect(container.querySelectorAll(".qabalah-letter.is-active")).toHaveLength(3); // י ה ו
    expect(container.querySelectorAll(".qabalah-method")).toHaveLength(13);
    expect(container.querySelectorAll(".qabalah-chip")).toHaveLength(4);
    expect(container.querySelectorAll(".qabalah-palette > button")).toHaveLength(28);
    expect(screen.getByText("Metatron 梅塔特隆")).toBeInTheDocument();
  });
});
