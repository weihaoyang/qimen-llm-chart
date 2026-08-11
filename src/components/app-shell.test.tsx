// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders the chart and Agent-first workspace", async () => {
    render(<AppShell />);

    expect(await screen.findByRole("heading", { name: "奇门主盘" }, { timeout: 30000 })).toBeInTheDocument();
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
    expect(screen.getByRole("tab", { name: "Agent" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "结构化文本" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "JSON" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "文献" })).toBeInTheDocument();
  }, 30000);
});
