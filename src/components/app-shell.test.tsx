// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

// Keep the workbench wiring test focused on mode switching and data injection;
// the vendor chart renderer has its own contract and is covered by the Ziwei
// panel tests.
vi.mock("@/vendor/react-iztro", () => ({
  Iztrolabe: () => <div data-testid="iztrolabe" />,
}));

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}

describe("AppShell", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("keeps single-chart and sequence analysis in the chart product", async () => {
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    expect(await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /管理员.*邀请码/ })).not.toBeInTheDocument();
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

  it("wires the normalized Ziwei chart into the visible workbench panel", async () => {
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });
    fireEvent.click(screen.getByRole("tab", { name: "紫微" }));

    expect(await screen.findByRole("heading", { name: "命盘结构识别" })).toBeInTheDocument();
    expect(screen.getAllByText(/命宫三方四正/).length).toBeGreaterThan(0);
  }, 60000);

  it("exposes the 从八字逆推生日 entry point in the BaZi workspace", async () => {
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });
    fireEvent.click(screen.getByRole("tab", { name: "八字" }));

    // The reverse engine (deriveBirthDatesFromBazi) and its panel shipped fully
    // built but were never rendered, so the feature was unreachable. Pin the
    // entry point and its controls so it cannot regress back into dead code.
    expect(screen.getByText("从八字逆推生日")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /开始逆推/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /带入当前盘面四柱/ })).toBeInTheDocument();
  }, 60000);

  // The 胜天半子 surface used to be selected by a `product` prop that defaulted
  // to `"shengtian"`; the only route renders the chart surface, so the whole
  // branch was unreachable and has been collapsed. Nothing enforced that until
  // now — a `product` prop could be reintroduced, or the retired copy pasted
  // back in, and every existing assertion would still pass.
  //
  // This is a *retirement* guard, not a feature test: it pins what must stay
  // gone. Verified by rendering the shell before the collapse and after — all
  // seven tabs plus the parameter popover, byte-identical once the framework's
  // per-mount random `data-uuid` is normalised away.
  it("renders only the chart surface, with none of the retired 胜天半子 copy or panes", async () => {
    const { container } = render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });

    // A scan that silently matches nothing is worse than no scan, so pin the
    // population first: the five chart modes plus the two classic boards.
    const tabKeys = [...container.querySelectorAll("[data-tabkey]")]
      .map((node) => node.getAttribute("data-tabkey") ?? "");
    expect(tabKeys).toHaveLength(10);
    expect(tabKeys.filter((key) => /kline|decision|agent/i.test(key))).toEqual([]);

    // The retired surface's panes must not come back.
    expect(container.querySelector(".page-shell")?.className).toBe("page-shell product-chart");
    expect(container.querySelector(".qmdj-footer__compact")).not.toBeNull();
    expect(container.querySelector(".observatory-hero__manifesto")).toBeNull();
    expect(container.querySelector(".observatory-hero__workspace")).toBeNull();

    // ...and neither may its copy. Checked on the whole rendered text so a
    // future branch cannot smuggle it back in behind a new element.
    const text = container.textContent ?? "";
    for (const retired of ["胜天半子", "以身入局", "重构命运", "人生决策控制室", "关键决策树", "K 线观测"]) {
      expect(text).not.toContain(retired);
    }
  }, 60000);

  it("renames a saved 生日库 profile", async () => {
    localStorage.setItem("qmdj-birth-library", JSON.stringify([
      { id: "seed-1", name: "旧名", profile: { calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" } },
    ]));
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });
    fireEvent.click(screen.getByRole("button", { name: "生日库" }));

    fireEvent.click(screen.getByRole("button", { name: "重命名旧名" }));
    fireEvent.change(screen.getByRole("textbox", { name: "重命名旧名" }), { target: { value: "新名" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.queryByRole("button", { name: "重命名旧名" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重命名新名" })).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem("qmdj-birth-library") || "[]") as Array<{ name: string }>;
    expect(stored[0]?.name).toBe("新名");
  }, 60000);
});
