"use client";

import { useCallback, useEffect, useSyncExternalStore, type CSSProperties } from "react";

export type GuidedTourStep = {
  id: string;
  /** 目标选择器；找不到目标（或目标不可测）时退化为居中说明，不报错。 */
  selector: string | null;
  title: string;
  body: string;
};

/**
 * 分步高亮指引的步骤。选择器与界面上的 `data-tour` 锚点一一对应：
 * 改时间 / 标签条 / 复制盘面资料 / AI 对话区（桌面右侧、手机底部）。
 */
export const GUIDED_TOUR_STEPS: readonly GuidedTourStep[] = [
  {
    id: "time",
    selector: '[data-tour="time"]',
    title: "① 先设时间",
    body: "点这里改出生时间（或问事时间），填好后点「应用并重新排盘」。第一次用请先做这一步——当前盘面用的还是默认资料。",
  },
  {
    id: "tabs",
    selector: '[data-tour="tabs"]',
    title: "② 选体系",
    body: "点标签切换体系（奇门 / 八字 / 紫微 / 七政四余 / 太乙神数…）。体系多，用两侧的 ‹ › 翻页。",
  },
  {
    id: "materials",
    selector: '[data-tour="materials"]',
    title: "③ 取用盘面资料",
    body: "点这里可复制或下载「结构化文本 · JSON · 文献」，直接贴给 AI、存档或换设备继续。",
  },
  {
    id: "ai",
    selector: '[data-tour="ai"]',
    title: "④ 问 AI",
    body: "桌面右侧就是 AI 对话区：直接在下方输入框提问（可拖拽调宽）；手机点底部「AI 盘面分析」。",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

const SEEN_KEY = "qmdj-guided-tour-seen";
const CHANGE_EVENT = "qmdj-guided-tour-change";

const subscribeSeen = (onChange: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

const readSeen = () => {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

const markTourSeen = () => {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* 隐私模式忽略 */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

/**
 * 「是否已经自动走过一次分步指引」。
 *
 * 服务端快照为 `true`（SSR 不自动弹指引），客户端若从未走过则水合后变为 `false`，
 * 由调用方在首次进入时自动启动一次——不依赖 effect 内同步 setState。
 */
export const useGuidedTourSeen = () => {
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => true);
  return { seen, markSeen: markTourSeen };
};


const GAP = 10;
const CALLOUT_WIDTH = 340;

const parseRect = (snapshot: string): Rect | null => {
  if (!snapshot) return null;
  const [top, left, width, height] = snapshot.split("|").map(Number);
  if (![top, left, width, height].every((value) => Number.isFinite(value))) return null;
  return { top, left, width, height };
};

/**
 * 读取目标元素的视口矩形。
 *
 * 用 `useSyncExternalStore` 而不是「effect 里量完 setState」：既符合仓库的 lint 规则，
 * 又能在窗口尺寸/滚动变化时自动重算。快照是字符串，按值比较，不会造成无谓重渲染。
 */
const useTargetRect = (selector: string | null) => {
  const subscribe = useCallback((onChange: () => void) => {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    if (!selector || typeof document === "undefined") return "";
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return "";
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return "";
    return [rect.top, rect.left, rect.width, rect.height].map((value) => Math.round(value)).join("|");
  }, [selector]);

  return parseRect(useSyncExternalStore(subscribe, getSnapshot, () => ""));
};

/**
 * 分步高亮指引：把「在哪点」逐个指出来（而不是只写在文案里）。
 *
 * 只应在用户主动触发时挂载（例如点「带我走一遍」），因此内部状态从 0 开始，不需要重置。
 */
export function GuidedTour({
  steps = GUIDED_TOUR_STEPS,
  index,
  onPrev,
  onNext,
  onClose,
}: {
  steps?: readonly GuidedTourStep[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const step = steps[Math.min(Math.max(index, 0), steps.length - 1)];
  const rect = useTargetRect(step?.selector ?? null);
  const isLast = index >= steps.length - 1;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!step) return null;

  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const calloutStyle: CSSProperties = rect
    ? {
        top: Math.max(12, Math.min(rect.top + rect.height + GAP, viewportHeight - 200)),
        left: Math.max(12, Math.min(rect.left, Math.max(12, viewportWidth - CALLOUT_WIDTH - 12))),
        width: Math.min(CALLOUT_WIDTH, viewportWidth - 24),
      }
    : {};

  return (
    <div className="guided-tour" role="dialog" aria-modal="true" aria-label="分步指引">
      {rect ? (
        <div
          className="guided-tour__spotlight"
          aria-hidden="true"
          style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
        />
      ) : (
        <div className="guided-tour__dim" aria-hidden="true" />
      )}
      <div className={`guided-tour__callout${rect ? "" : " is-centered"}`} style={calloutStyle}>
        <div className="guided-tour__head">
          <b>{step.title}</b>
          <span>
            {index + 1} / {steps.length}
          </span>
        </div>
        <p>{step.body}</p>
        <div className="guided-tour__actions">
          <button type="button" onClick={onPrev} disabled={index === 0}>
            上一步
          </button>
          <button type="button" className="is-primary" onClick={isLast ? onClose : onNext}>
            {isLast ? "完成" : "下一步"}
          </button>
          <button type="button" onClick={onClose}>
            跳过
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuidedTour;
