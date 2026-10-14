"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { WorkbenchMode } from "@/lib/workbench/types";

type ModeTabsProps = {
  mode: WorkbenchMode;
  onChange: (mode: WorkbenchMode) => void;
  classicActive?: "daliuren" | null;
  onClassicSelect?: (kind: "daliuren") => void;
};

/**
 * 体系标签项（含经典盘「大六壬」）。导出供测试与分页断言使用。
 *
 * 顺序即翻页顺序；新增体系只需在此追加一行。
 */
export const MODE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "qimen", label: "奇门" },
  { value: "bazi", label: "八字" },
  { value: "ziwei", label: "紫微" },
  { value: "combined", label: "三盘联合" },
  { value: "research", label: "人生 K 线" },
  { value: "astro", label: "星盘" },
  { value: "human-design", label: "人类图" },
  { value: "tarot", label: "塔罗牌" },
  { value: "fourth-way", label: "第四道" },
  { value: "harmonic", label: "泛音星盘" },
  { value: "huangji", label: "皇极经世" },
  { value: "qizheng", label: "七政四余" },
  { value: "sacred-geometry", label: "神圣几何" },
  { value: "runes", label: "卢恩符文" },
  { value: "uranian", label: "汉堡学派" },
  { value: "maya", label: "玛雅历法" },
  { value: "vedic", label: "吠陀分盘" },
  { value: "qabalah", label: "赫尔墨斯卡巴拉" },
  { value: "taiyi-shenshu", label: "太乙神数" },
  { value: "akasha", label: "阿卡西 · 全息" },
  { value: "ziwei-flying", label: "紫微飞星" },
  { value: "bazi-tcm", label: "中医运气" },
  { value: "daliuren", label: "大六壬" },
];

/**
 * 体系标签条：**按名字宽度分页**的翻页按钮（‹ ›），不是横向滚动。
 *
 * 早期版本给每个标签等宽（`flex: 1 1 0`），因此"一页能放几个"只能按最小宽度除，长名字
 * （「赫尔墨斯卡巴拉」「阿卡西 · 全息」）永远被省略号收尾。现在每个标签按自己名字的排版宽度
 * 占位、逐页装满可用宽度，于是任何视口下都不会有标签被裁掉，短名字也不再浪费空间。
 */

/** 单个标签的最小盒宽（px）：太窄不好点，也保证短名字的方块不塌陷。 */
export const MIN_TAB_BOX = 52;
/** 标签盒宽估算使用的字号（px）：与 workbench-responsive.css 里 .workbench-tabs__tab 的实际字号对应。 */
const TAB_FONT_PX = 12;
/** 标签盒宽估算里除文字以外的开销：padding 2×8 + border 2×2 + 安全余量 6。 */
const TAB_CHROME_X = 26;
/** 标签之间的间距（px）：与 CSS 中 .workbench-tabs__list 的 gap 一致。 */
const TAB_GAP = 6;
/** 翻页按钮与页码占用的宽度（px）。 */
export const PAGER_WIDTH = 104;
/** 量不到容器宽度时（jsdom / 嵌入 webview）的每页个数。 */
export const FALLBACK_PAGE_SIZE = 8;
const CLASSIC_KEY = "daliuren";

const FULL_WIDTH_CHAR = /[\u2e80-\u9fff\u3000-\u303f\uff00-\uffef]/;

/** 估一个名字的排版宽度（px）：汉字按 1em、西文按 0.58em、空格按 0.34em。 */
const estimateLabelWidth = (label: string, fontPx = TAB_FONT_PX) => {
  let width = 0;
  for (const char of label) {
    if (char === " ") width += fontPx * 0.34;
    else if (FULL_WIDTH_CHAR.test(char)) width += fontPx;
    else width += fontPx * 0.58;
  }
  return width;
};

/** 一个标签实际占用的盒宽（px）：名字宽度加排版开销，且不小于最小盒宽。 */
export const tabBoxWidth = (label: string) => Math.max(MIN_TAB_BOX, Math.ceil(estimateLabelWidth(label)) + TAB_CHROME_X);

/**
 * 把体系名字按可用宽度切成若干页。
 *
 * 每页至少 2 个（否则翻页比点标签还累）；单个名字超出整行时它单独占一页，由 CSS 兜底。
 * `available <= 0` 表示量不到宽度（jsdom / 首帧），退回固定每页 `FALLBACK_PAGE_SIZE` 个。
 */
export const paginateTabs = (labels: string[], available: number) => {
  if (!(available > 0)) {
    const size = Math.max(1, FALLBACK_PAGE_SIZE);
    const pages: string[][] = [];
    for (let index = 0; index < labels.length; index += size) pages.push(labels.slice(index, index + size));
    return pages.length ? pages : [[]];
  }

  const pages: string[][] = [];
  let current: string[] = [];
  let used = 0;
  for (const label of labels) {
    const width = tabBoxWidth(label);
    const extra = current.length ? TAB_GAP : 0;
    if (current.length >= 2 && used + extra + width > available) {
      pages.push(current);
      current = [label];
      used = width;
      continue;
    }
    current.push(label);
    used += extra + width;
  }
  if (current.length) pages.push(current);
  return pages.length ? pages : [labels];
};

/**
 * 体系标签条：**按名字宽度分页**的翻页按钮（‹ ›）而非横向滚动。
 *
 * - 每个标签按自己名字的排版宽度占位，`ResizeObserver` 量到可用宽度后逐页装满，因此任何宽度
 *   下都不会出现横向滚动、标签重叠或被省略号裁掉；
 * - 当前体系被程序性切换（深链 / 恢复 / 重置 / 选经典盘）时自动翻到它所在的一页，手动翻页浏览时不打扰；
 * - 左右方向键在当前页内移动，越界则翻页；
 * - 每个标签渲染 `data-tabkey`（唯一），供回归测试与外部工具定位。
 */
export function ModeTabs({ mode, onChange, classicActive = null, onClassicSelect }: ModeTabsProps) {
  const activeKey = classicActive ?? mode;
  const hostRef = useRef<HTMLDivElement | null>(null);
  // 量到的"标签可用宽度"（px）；0 表示还没量到（首帧 / jsdom），此时退回固定每页个数。
  const [budget, setBudget] = useState(0);
  // 手动翻页记录：记下「为哪个体系翻到了第几页」。体系一旦变化（点击标签 / 深链 / 恢复 /
  // 重置），这条记录就失效，页码自动回到该体系所在页——因此不需要在 effect 里 setState。
  const [paging, setPaging] = useState<{ key: string; page: number }>({ key: activeKey, page: 0 });

  const pages = useMemo(() => paginateTabs(MODE_OPTIONS.map((item) => item.label), budget), [budget]);
  const pageCount = pages.length;
  const activeIndex = Math.max(0, MODE_OPTIONS.findIndex((item) => item.value === activeKey));
  const activeLabel = MODE_OPTIONS[activeIndex]?.label ?? "";
  const followPage = Math.max(0, pages.findIndex((labels) => labels.includes(activeLabel)));
  const page = Math.min(Math.max(paging.key === activeKey ? paging.page : followPage, 0), pageCount - 1);

  const goToPage = (next: number) => {
    setPaging({ key: activeKey, page: Math.min(Math.max(0, next), pageCount - 1) });
  };

  // 标签条一页放几个由可用宽度决定：每个标签按自己名字的宽度占位，逐页装满即可，
  // 不需要横向滚动，也不会有标签被省略号裁掉。
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const width = host.clientWidth;
      if (!width) return;
      setBudget(width - PAGER_WIDTH);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // 方向键移动后把焦点带到激活标签（仅在焦点本来就在标签条内时，避免抢焦点）。
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof document === "undefined") return;
    if (!host.contains(document.activeElement)) return;
    host.querySelector<HTMLElement>(`[data-tabkey="${activeKey}"]`)?.focus();
  }, [activeKey, page]);

  const visibleLabels = useMemo(() => pages[page] ?? pages[0] ?? [], [pages, page]);
  const visible = useMemo(
    () => MODE_OPTIONS.filter((item) => visibleLabels.includes(item.label)),
    [visibleLabels],
  );

  // 兜底校正：分页依赖"量到的可用宽度"，若布局在测量之后又变窄（例如账户状态从"读取账户…"
  // 变成更长的文案），ResizeObserver 未必来得及回调，整页标签就会溢出、末位体系被裁掉。
  // 渲染后若发现标签确实溢出了列表，就用列表的真实宽度重算一次——只收紧，不会来回震荡。
  useEffect(() => {
    const list = hostRef.current?.querySelector<HTMLElement>(".workbench-tabs__list");
    if (!list || budget <= 0) return;
    if (list.scrollWidth > list.clientWidth + 1) setBudget(list.clientWidth);
  }, [budget, page, visibleLabels]);

  // 再补几次"落定后核对"：账户/权益状态与平台套餐都是异步到达的，会在首帧之后改变标签条宽度。
  // 这几次核对与 ResizeObserver 互补（离屏窗口 / webview 里 RO 回调可能被推迟）。
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const list = hostRef.current?.querySelector<HTMLElement>(".workbench-tabs__list");
      if (!list || !list.clientWidth) return;
      if (list.scrollWidth > list.clientWidth + 1) setBudget(list.clientWidth);
    };
    const timers = [400, 1200, 2600].map((ms) => window.setTimeout(check, ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const select = useCallback(
    (value: string) => {
      if (value === CLASSIC_KEY) {
        onClassicSelect?.(CLASSIC_KEY);
        return;
      }
      onChange(value as WorkbenchMode);
    },
    [onChange, onClassicSelect],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const nextIndex = Math.min(MODE_OPTIONS.length - 1, Math.max(0, activeIndex + delta));
    if (nextIndex === activeIndex) return;
    // 体系变化后页码自动跟随该体系所在页（见上面的派生逻辑）。
    select(MODE_OPTIONS[nextIndex].value);
  };

  return (
    <div className="workbench-tabs workbench-tabs--paged" ref={hostRef} data-pages={pageCount} data-tour="tabs">
      {pageCount > 1 ? (
        <button
          type="button"
          className="workbench-tabs__page"
          aria-label="上一页体系标签"
          onClick={() => goToPage(page - 1)}
          disabled={page === 0}
        >
          ‹
        </button>
      ) : null}
      <div className="workbench-tabs__list" role="tablist" aria-label="玄学体系" onKeyDown={handleKeyDown}>
        {visible.map((item) => {
          const selected = item.value === activeKey;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              data-tabkey={item.value}
              aria-selected={selected}
              className={`workbench-tabs__tab${selected ? " is-active" : ""}`}
              onClick={() => select(item.value)}
            >
              <strong>{item.label}</strong>
            </button>
          );
        })}
      </div>
      {pageCount > 1 ? (
        <>
          <button
            type="button"
            className="workbench-tabs__page"
            aria-label="下一页体系标签"
            onClick={() => goToPage(page + 1)}
            disabled={page >= pageCount - 1}
          >
            ›
          </button>
          <span className="workbench-tabs__indicator">
            {page + 1}/{pageCount}
          </span>
        </>
      ) : null}
    </div>
  );
}
