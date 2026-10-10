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
  { value: "daliuren", label: "大六壬" },
];

/** 单个标签的最小可读宽度（px）：据此决定一页放几个。 */
const MIN_TAB_WIDTH = 86;
/** 翻页按钮与页码占用的宽度（px）。 */
const PAGER_WIDTH = 104;
/** 量不到容器宽度时（jsdom / 嵌入 webview）的每页个数。 */
const FALLBACK_PAGE_SIZE = 8;
const CLASSIC_KEY = "daliuren";

/**
 * 体系标签条：**翻页按钮**（‹ ›）而非横向滚动。
 *
 * - 每页标签个数由容器宽度决定（`ResizeObserver`），因此任何宽度下都不会出现横向滚动或标签重叠；
 * - 当前体系被程序性切换（深链 / 恢复 / 重置 / 选经典盘）时自动翻到它所在的一页，手动翻页浏览时不打扰；
 * - 左右方向键在当前页内移动，越界则翻页；
 * - 每个标签渲染 `data-tabkey`（唯一），供回归测试与外部工具定位。
 */
export function ModeTabs({ mode, onChange, classicActive = null, onClassicSelect }: ModeTabsProps) {
  const activeKey = classicActive ?? mode;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState(FALLBACK_PAGE_SIZE);
  // 手动翻页记录：记下「为哪个体系翻到了第几页」。体系一旦变化（点击标签 / 深链 / 恢复 /
  // 重置），这条记录就失效，页码自动回到该体系所在页——因此不需要在 effect 里 setState。
  const [paging, setPaging] = useState<{ key: string; page: number }>({ key: activeKey, page: 0 });

  const pageCount = Math.max(1, Math.ceil(MODE_OPTIONS.length / pageSize));
  const activeIndex = Math.max(0, MODE_OPTIONS.findIndex((item) => item.value === activeKey));
  const followPage = Math.floor(activeIndex / pageSize);
  const page = Math.min(paging.key === activeKey ? paging.page : followPage, pageCount - 1);

  const goToPage = (next: number) => {
    setPaging({ key: activeKey, page: Math.min(Math.max(0, next), pageCount - 1) });
  };

  // 每页个数随容器宽度自适应；这样「一页」总是恰好铺满，不需要横向滚动。
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const width = host.clientWidth;
      if (!width) return;
      const fit = Math.floor((width - PAGER_WIDTH) / MIN_TAB_WIDTH);
      setPageSize(Math.min(MODE_OPTIONS.length, Math.max(2, fit)));
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

  const start = page * pageSize;
  const visible = useMemo(() => MODE_OPTIONS.slice(start, start + pageSize), [start, pageSize]);

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
    <div className="workbench-tabs workbench-tabs--paged" ref={hostRef} data-pages={pageCount}>
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
