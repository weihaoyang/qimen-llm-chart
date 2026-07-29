// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders the chart and Agent-first workspace", () => {
    render(<AppShell />);

    expect(screen.getByRole("heading", { name: "奇门主盘" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /奇门/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /八字/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /紫微/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /三盘联合/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "分析" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("调整盘面")).toBeInTheDocument();
    expect(screen.getByText("核验资料")).toBeInTheDocument();
  });
});
