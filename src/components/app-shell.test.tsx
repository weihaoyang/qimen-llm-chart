// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  afterEach(() => cleanup());

  it("renders the chart and Agent-first workspace", async () => {
    render(<AppShell />);

    expect(await screen.findByRole("main", { name: "胜天半子 Agent 决策控制室" }, { timeout: 30000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "排盘工具" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "排盘工具" }));
    expect(await screen.findByText("奇门主盘", { selector: ".observatory-hero__workspace" }, { timeout: 30000 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /奇门/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /八字/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /紫微/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /三盘联合/ })).toBeInTheDocument();
    expect(screen.getByText("调整盘面")).toBeInTheDocument();
    expect(screen.getByText("时盘仪表")).toBeInTheDocument();
    expect(screen.getByText("排盘时间")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "邀请码兑换" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "调整盘面" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "调整盘面" }));
    expect(screen.getByRole("dialog", { name: "调整盘面" })).toBeInTheDocument();
    expect(screen.queryByText("核验资料")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开 Agent 分析" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab", { name: "Agent" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "结构化文本" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "JSON" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "文献" })).toBeInTheDocument();
  }, 30000);

  it("opens the interview as a clean user-facing zero state", async () => {
    render(<AppShell />);

    expect(await screen.findByRole("main", { name: "胜天半子 Agent 决策控制室" })).toBeInTheDocument();
    expect(screen.getByText("新的决策议题")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("例如：只看事业，列出盘面依据和现实中的验证方式。")).toHaveValue("");
    expect(screen.getByRole("button", { name: "开通后开始访谈" })).toBeInTheDocument();
    expect(screen.queryByText("请进入访谈模式。先不要下结论；每次只问我一个最关键的问题，帮助我把当前人生议题说清楚，并按事实、约束、选项、代价、行动逐轮推进。")).not.toBeInTheDocument();
  }, 30000);

  it("keeps single-chart and sequence analysis in the chart product", async () => {
    render(<AppShell product="chart" />);

    expect(await screen.findByText("奇门主盘", { selector: ".observatory-hero__workspace" }, { timeout: 30000 })).toBeInTheDocument();
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
  }, 30000);
});
