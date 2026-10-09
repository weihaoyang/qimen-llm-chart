// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateHuangjiChronology } from "@/lib/huangji/chronology";
import { HuangjiPanel } from "./huangji-panel";

const value = () => calculateHuangjiChronology({ era: "CE", year: 2026 });

describe("HuangjiPanel", () => {
  afterEach(() => cleanup());

  it("renders the 元会运世 coordinates and the year field", () => {
    render(<HuangjiPanel value={value()} yearInput="2026" />);
    expect(screen.getByRole("heading", { name: "皇极经世" })).toBeInTheDocument();
    expect(screen.getByText("第 1 元")).toBeInTheDocument();
    expect(screen.getByText("第 7 会")).toBeInTheDocument();
    expect(screen.getByText("第 192 运")).toBeInTheDocument();
    expect(screen.getByText("第 2302 世")).toBeInTheDocument();
    expect(screen.getAllByText(/丙午/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("皇极经世目标年份")).toHaveValue("2026");
  });

  it("reports year edits and invalid input", () => {
    const onYearChange = vi.fn();
    render(<HuangjiPanel value={value()} yearInput="2026" yearError onYearChange={onYearChange} />);
    fireEvent.change(screen.getByLabelText("皇极经世目标年份"), { target: { value: "前87年" } });
    expect(onYearChange).toHaveBeenCalledWith("前87年");
    expect(screen.getByText(/无法识别该年份/)).toBeInTheDocument();
  });
});
