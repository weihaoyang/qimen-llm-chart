// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  afterEach(() => cleanup());

  it("renders the reality-first battle workspace", async () => {
    render(<AppShell />);

    expect(await screen.findByRole("main", { name: "胜天半子现实极限博弈终端" }, { timeout: 30000 })).toBeInTheDocument();
    expect(screen.getByText("你要在哪一局，胜天半子？")).toBeInTheDocument();
    expect(screen.getByText("推演台待命")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "排盘叠层" }));
    expect(await screen.findByText("奇门主盘", { selector: ".observatory-hero__workspace" }, { timeout: 30000 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /奇门/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /八字/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /紫微/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /三盘联合/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "人生 K 线" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "K 线" })).toBeInTheDocument();
    const workbenchTabs = within(document.querySelector(".workbench-tabs")!);
    expect(workbenchTabs.getByRole("tab", { name: "Agent" })).toBeInTheDocument();
  }, 30000);

  it("opens a battle intake rather than a generic interview", async () => {
    render(<AppShell />);

    expect(await screen.findByRole("main", { name: "胜天半子现实极限博弈终端" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("例如：72 小时内拿下项目试局")).toHaveValue("");
    expect(screen.getByPlaceholderText("这一局具体要改变什么现实结果？")).toHaveValue("");
    expect(screen.getByRole("button", { name: /建立战局/ })).toBeInTheDocument();
  }, 30000);

  it("keeps single-chart and sequence analysis in the chart product", async () => {
    render(<AppShell product="chart" />);

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
    expect(screen.getByRole("tab", { name: "结构化文本" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "JSON" })).toBeInTheDocument();
  }, 60000);
});
