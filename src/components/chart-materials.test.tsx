// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChartMaterials } from "./chart-materials";

describe("ChartMaterials", () => {
  afterEach(() => cleanup());

  it("opens the materials dialog and closes from the backdrop", () => {
    render(<ChartMaterials text="结构化盘面" json={'{"format":"qmdj-test"}'} literature="文献" />);
    // 触发器必须一眼看出"这是复制入口"（第一次用的人不会知道「盘面资料」是复制）
    fireEvent.click(screen.getByRole("button", { name: "复制盘面资料" }));
    expect(screen.getByRole("dialog", { name: "盘面资料" })).toBeInTheDocument();
    // 抽屉里给出用途说明与明确的复制/下载动作名
    expect(screen.getByText(/可直接贴给 AI 或聊天窗口/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制到剪贴板" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载为文件" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("dialog", { name: "盘面资料" }).querySelector("header button") as HTMLElement);
    expect(screen.queryByRole("dialog", { name: "盘面资料" })).not.toBeInTheDocument();
  });
});
