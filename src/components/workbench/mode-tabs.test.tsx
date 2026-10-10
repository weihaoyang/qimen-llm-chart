// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MODE_OPTIONS, ModeTabs } from "./mode-tabs";

type ObserverRecord = { callback: ResizeObserverCallback; targets: Element[]; trigger: () => void };

const observers: ObserverRecord[] = [];

class FakeResizeObserver {
  private record: ObserverRecord;
  constructor(callback: ResizeObserverCallback) {
    this.record = { callback, targets: [], trigger: () => callback([], this as unknown as ResizeObserver) };
    observers.push(this.record);
  }
  observe(target: Element) {
    this.record.targets.push(target);
  }
  disconnect() {}
  unobserve() {}
}

const setHostWidth = (container: HTMLElement, width: number) => {
  const host = container.querySelector<HTMLElement>(".workbench-tabs");
  if (!host) throw new Error("未找到标签条容器");
  Object.defineProperty(host, "clientWidth", { configurable: true, value: width });
  return host;
};

const renderTabs = (props: Partial<Parameters<typeof ModeTabs>[0]> = {}) =>
  render(<ModeTabs mode={props.mode ?? "qimen"} onChange={props.onChange ?? vi.fn()} classicActive={props.classicActive ?? null} onClassicSelect={props.onClassicSelect} />);

const visibleKeys = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-tabkey]")].map((node) => node.getAttribute("data-tabkey") ?? "");

const nextPage = () => screen.getByRole("button", { name: "下一页体系标签" }) as HTMLButtonElement;
const prevPage = () => screen.getByRole("button", { name: "上一页体系标签" }) as HTMLButtonElement;

describe("ModeTabs 翻页按钮", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("第一页只渲染一页标签，并在翻页后暴露全部唯一 key", () => {
    const { container } = renderTabs();

    // 默认（量不到宽度时）每页 8 个；22 个体系共 3 页。
    expect(visibleKeys(container)).toHaveLength(8);
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(prevPage().disabled).toBe(true);
    expect(nextPage().disabled).toBe(false);
    // 大六壬在最后一页，首页不应出现
    expect(container.querySelector('[data-tabkey="daliuren"]')).toBeNull();

    const seen = new Set<string>();
    for (;;) {
      visibleKeys(container).forEach((key) => seen.add(key));
      if (nextPage().disabled) break;
      fireEvent.click(nextPage());
    }
    expect(seen.size).toBe(MODE_OPTIONS.length);
    expect(seen.size).toBe(22);
    expect(seen.has("daliuren")).toBe(true);
    expect(nextPage().disabled).toBe(true);
    expect(screen.getByText("3/3")).toBeInTheDocument();
  });

  it("容器越窄每页越少：480px 时每页 4 个、共 6 页", () => {
    const { container } = renderTabs();
    setHostWidth(container, 480);
    act(() => {
      observers[0].trigger();
    });

    expect(visibleKeys(container)).toHaveLength(4);
    expect(screen.getByText("1/6")).toBeInTheDocument();
    // 收窄后不会横向滚动（一页恰好铺满）
    expect(container.querySelectorAll(".workbench-tabs__tab").length).toBe(4);
  });

  it("程序性切换体系时自动翻到它所在的那一页；点击标签回调正确", () => {
    const onChange = vi.fn();
    const { container, rerender } = renderTabs({ mode: "qimen", onChange });

    // 深链/恢复：直接切到第 21 个体系（紫微飞星），应自动翻到第 3 页
    rerender(<ModeTabs mode="ziwei-flying" onChange={onChange} classicActive={null} />);
    expect(screen.getByText("3/3")).toBeInTheDocument();
    const active = container.querySelector(".workbench-tabs__tab.is-active");
    expect(active?.getAttribute("data-tabkey")).toBe("ziwei-flying");

    // 点击可见标签 → onChange(该体系)
    fireEvent.click(within(container).getByRole("tab", { name: "太乙神数" }));
    expect(onChange).toHaveBeenCalledWith("taiyi-shenshu");
  });

  it("大六壬作为经典盘走 onClassicSelect，不进入 mode 回调", () => {
    const onChange = vi.fn();
    const onClassicSelect = vi.fn();
    const { container } = renderTabs({ onChange, onClassicSelect });

    fireEvent.click(nextPage());
    fireEvent.click(nextPage());
    fireEvent.click(within(container).getByRole("tab", { name: "大六壬" }));

    expect(onClassicSelect).toHaveBeenCalledWith("daliuren");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("方向键在当前页内移动，越界翻页", () => {
    const onChange = vi.fn();
    const { container } = renderTabs({ mode: "bazi", onChange });
    const list = container.querySelector(".workbench-tabs__list");
    if (!list) throw new Error("未找到标签列表");

    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("ziwei");
    fireEvent.keyDown(list, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("qimen");
  });
});
