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
    // population first: the chart modes plus the classic 大六壬 board.
    // 标签条现在是翻页按钮，因此逐页收集 data-tabkey 再断言总数与唯一性。
    const tabKeySet = new Set<string>();
    const prevPage = screen.getByRole("button", { name: "上一页体系标签" });
    while (!(prevPage as HTMLButtonElement).disabled) fireEvent.click(prevPage);
    for (;;) {
      container.querySelectorAll("[data-tabkey]").forEach((node) => {
        tabKeySet.add(node.getAttribute("data-tabkey") ?? "");
      });
      const nextPage = screen.getByRole("button", { name: "下一页体系标签" }) as HTMLButtonElement;
      if (nextPage.disabled) break;
      fireEvent.click(nextPage);
    }
    const tabKeys = [...tabKeySet];
    expect(tabKeys).toHaveLength(22);
    // 每个标签的 key 必须唯一：重复会让 React 报 duplicate key（并可能漏渲染标签）。
    expect(new Set(tabKeys).size).toBe(tabKeys.length);
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

  it("imports a 生日库 JSON export into the library", async () => {
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });
    fireEvent.click(screen.getByRole("button", { name: "生日库" }));

    const payload = JSON.stringify({
      format: "qmdj-birth-library-v1",
      profiles: [
        { id: "imp-1", name: "导入甲", profile: { calendarMode: "solar", datetime: "1985-05-05T08:00", timeZone: "Asia/Shanghai", gender: "female", timeBasis: "civil" } },
      ],
    });
    const input = screen.getByLabelText("导入生日库文件");
    Object.defineProperty(input, "files", {
      value: [new File([payload], "lib.json", { type: "application/json" })],
      configurable: true,
    });
    fireEvent.change(input);

    expect(await screen.findByText(/已导入 1 条/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重命名导入甲" })).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem("qmdj-birth-library") || "[]") as Array<{ name: string }>;
    expect(stored.map((item) => item.name)).toEqual(["导入甲"]);
  }, 60000);

  it("filters 生日库 by name and birthday and shows an empty state", async () => {
    localStorage.setItem("qmdj-birth-library", JSON.stringify([
      { id: "s-1", name: "小明", profile: { calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" } },
      { id: "s-2", name: "小红", profile: { calendarMode: "solar", datetime: "2000-12-31T20:00", timeZone: "Asia/Shanghai", gender: "female", timeBasis: "civil" } },
    ]));
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });
    fireEvent.click(screen.getByRole("button", { name: "生日库" }));
    const search = screen.getByLabelText("搜索生日库");

    fireEvent.change(search, { target: { value: "小红" } });
    expect(screen.getByRole("button", { name: "重命名小红" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重命名小明" })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "1990" } });
    expect(screen.getByRole("button", { name: "重命名小明" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重命名小红" })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "查无此人" } });
    expect(screen.getByText(/没有匹配/)).toBeInTheDocument();
  }, 60000);

  it("moves the last-used 生日库 profile to the front", async () => {
    localStorage.setItem("qmdj-birth-library", JSON.stringify([
      { id: "r-1", name: "甲", profile: { calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" } },
      { id: "r-2", name: "乙", profile: { calendarMode: "solar", datetime: "1992-02-02T09:00", timeZone: "Asia/Shanghai", gender: "female", timeBasis: "civil" } },
    ]));
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });
    fireEvent.click(screen.getByRole("button", { name: "生日库" }));

    fireEvent.click(screen.getByRole("button", { name: /^乙/ }));
    const stored = JSON.parse(localStorage.getItem("qmdj-birth-library") || "[]") as Array<{ name: string }>;
    expect(stored.map((item) => item.name)).toEqual(["乙", "甲"]);
  }, 60000);

  it("overwrites a saved 生日库 profile with the current chart input", async () => {
    localStorage.setItem("qmdj-birth-library", JSON.stringify([
      { id: "o-1", name: "待更新", profile: { calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" } },
    ]));
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });
    fireEvent.click(screen.getByRole("button", { name: "生日库" }));

    fireEvent.click(screen.getByRole("button", { name: "更新待更新" }));
    expect(screen.getByText(/用当前盘面资料覆盖/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "覆盖" }));

    expect(screen.getByText(/已用当前盘面资料更新「待更新」/)).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem("qmdj-birth-library") || "[]") as Array<{ name: string; profile: { datetime: string } }>;
    expect(stored[0]?.name).toBe("待更新");
    expect(stored[0]?.profile.datetime).not.toBe("1990-01-01T12:00");
    expect(stored[0]?.profile.datetime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  }, 60000);

  it("asks before deleting a 生日库 profile", async () => {
    localStorage.setItem("qmdj-birth-library", JSON.stringify([
      { id: "d-1", name: "需要确认", profile: { calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" } },
    ]));
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });
    fireEvent.click(screen.getByRole("button", { name: "生日库" }));

    fireEvent.click(screen.getByRole("button", { name: "删除需要确认" }));
    expect(screen.getByText(/确认删除/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "取消删除" }));
    expect(screen.getByRole("button", { name: "重命名需要确认" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "删除需要确认" }));
    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    expect(screen.getByText(/已删除「需要确认」/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("qmdj-birth-library") || "[]")).toEqual([]);
  }, 60000);

  it("reports when saving reuses an existing 生日库 name", async () => {
    localStorage.setItem("qmdj-birth-library", JSON.stringify([
      { id: "n-1", name: "甲", profile: { calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" } },
    ]));
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });
    fireEvent.click(screen.getByRole("button", { name: "生日库" }));
    const nameInput = screen.getByLabelText("姓名");

    fireEvent.change(nameInput, { target: { value: "乙" } });
    fireEvent.click(screen.getByRole("button", { name: "保存当前" }));
    expect(screen.getByText(/已保存「乙」/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("qmdj-birth-library") || "[]")).toHaveLength(2);

    fireEvent.change(nameInput, { target: { value: "甲" } });
    fireEvent.click(screen.getByRole("button", { name: "保存当前" }));
    expect(screen.getByText(/已覆盖同名档案「甲」/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("qmdj-birth-library") || "[]")).toHaveLength(2);
  }, 60000);

  it("warns when renaming to an existing 生日库 name", async () => {
    localStorage.setItem("qmdj-birth-library", JSON.stringify([
      { id: "e-1", name: "甲", profile: { calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" } },
      { id: "e-2", name: "乙", profile: { calendarMode: "solar", datetime: "1992-02-02T09:00", timeZone: "Asia/Shanghai", gender: "female", timeBasis: "civil" } },
    ]));
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });
    fireEvent.click(screen.getByRole("button", { name: "生日库" }));

    fireEvent.click(screen.getByRole("button", { name: "重命名乙" }));
    fireEvent.change(screen.getByRole("textbox", { name: "重命名乙" }), { target: { value: "甲" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText(/与既有档案同名/)).toBeInTheDocument();
  }, 60000);

  it("pins a 生日库 profile to the front", async () => {
    localStorage.setItem("qmdj-birth-library", JSON.stringify([
      { id: "p-1", name: "甲", profile: { calendarMode: "solar", datetime: "1990-01-01T12:00", timeZone: "Asia/Shanghai", gender: "male", timeBasis: "civil" } },
      { id: "p-2", name: "乙", profile: { calendarMode: "solar", datetime: "1992-02-02T09:00", timeZone: "Asia/Shanghai", gender: "female", timeBasis: "civil" } },
    ]));
    render(<AppShell platformConfig={{
      baseUrl: "https://api.singseq.com",
      productCode: "shengtian-banzi",
      accessScope: "shengtian-banzi-core",
    }} />);

    await screen.findByRole("heading", { name: "知几" }, { timeout: 30000 });
    fireEvent.click(screen.getByRole("button", { name: "生日库" }));

    fireEvent.click(screen.getByRole("button", { name: "置顶乙" }));
    expect(screen.getByText(/已置顶「乙」/)).toBeInTheDocument();
    expect(localStorage.getItem("qmdj-birth-library-pin")).toBe("p-2");
    expect(document.querySelectorAll(".birth-library-item")[0]?.textContent).toContain("乙");

    fireEvent.click(screen.getByRole("button", { name: "取消置顶乙" }));
    expect(localStorage.getItem("qmdj-birth-library-pin")).toBeNull();
  }, 60000);
});
