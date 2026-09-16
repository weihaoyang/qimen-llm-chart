// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}

describe("AppShell", () => {
  afterEach(() => cleanup());

  it("keeps single-chart and sequence analysis in the chart product", async () => {
    render(<AppShell product="chart" platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    expect(await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 })).toBeInTheDocument();
    expect(document.querySelector('[data-layout="chart-agent-sidebar"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-layout="chart-analysis-drawer"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /盘面分析/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /盘面分析/ }));
    expect(screen.getByRole("dialog", { name: "盘面分析台" })).toBeInTheDocument();
    expect(screen.queryByText("开始人生议题访谈")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "调整盘面" }));
    expect(screen.getByRole("tab", { name: "单张" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "序列" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "盘面资料" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "发送给 Agent 的问题" })).toBeInTheDocument();
  }, 60000);
});
