"use client";

import { useSyncExternalStore } from "react";

const DISMISS_KEY = "qmdj-first-run-guide-dismissed";
const CHANGE_EVENT = "qmdj-first-run-guide-change";

const subscribe = (onChange: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

const readDismissed = () => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

const writeDismissed = (value: boolean) => {
  try {
    if (value) window.localStorage.setItem(DISMISS_KEY, "1");
    else window.localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* 隐私模式下 localStorage 可能不可用，忽略即可 */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

/**
 * 「首次使用引导是否已被关闭」的状态。
 *
 * 用 `useSyncExternalStore` 而不是在 effect 里 setState：服务端按「未关闭」渲染（首屏就有引导，
 * 不会被水合前的空窗吞掉），客户端若已关闭则在水合后自动隐藏，不会产生水合告警。
 */
export const useFirstRunGuide = () => {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => false);
  return { dismissed, dismiss: () => writeDismissed(true), reset: () => writeDismissed(false) };
};

/**
 * 第一次使用引导：把「怎么改时间」「怎么取用盘面资料」直接写在界面上，
 * 并且「现在就去改时间」是真按钮（点它直接打开排盘资料面板）。
 */
export function FirstRunGuide({
  open,
  profileSummary,
  onDismiss,
  onOpenTimeSettings,
  onStartTour,
}: {
  open: boolean;
  /** 当前盘面资料（城市 · 时间），写进第①步，让人一眼知道自己看的是谁的盘。 */
  profileSummary?: string;
  onDismiss: () => void;
  onOpenTimeSettings: () => void;
  /** 启动分步高亮指引：把「在哪点」逐个指出来。 */
  onStartTour?: () => void;
}) {
  if (!open) return null;

  return (
    <aside className="first-run-guide" aria-label="第一次使用引导">
      <div className="first-run-guide__head">
        <b>第一次用？四步上手</b>
        <span className="first-run-guide__head-actions">
          {onStartTour ? (
            <button type="button" className="first-run-guide__start" onClick={onStartTour}>
              带我走一遍（在界面上高亮指出来）
            </button>
          ) : null}
          <button type="button" className="first-run-guide__dismiss" onClick={onDismiss}>
            知道了，不再显示
          </button>
        </span>
      </div>
      <ol className="first-run-guide__steps">
        <li>
          <b>① 先设时间</b>
          <span>
            当前盘面：<em>{profileSummary ?? "（未读取）"}</em>。点右上「<em>改时间</em>」改成你的出生时间
            （或问事时间），再点「应用并重新排盘」。
          </span>
          <button type="button" className="first-run-guide__action" onClick={onOpenTimeSettings}>
            现在就去改时间
          </button>
        </li>
        <li>
          <b>② 选体系</b>
          <span>
            顶部标签条是<b>翻页</b>的：用 <em>‹ ›</em> 翻页，点标签切换体系（奇门、八字、紫微、七政四余、太乙神数……）。
          </span>
        </li>
        <li>
          <b>③ 取用结果</b>
          <span>
            点右上「<em>复制盘面资料</em>」→ 复制或下载「结构化文本 · JSON · 文献」，可直接贴给 AI、存档或换设备继续；
            想在本页直接问：桌面**右侧就是 AI 对话区**（直接在下方的输入框提问，可拖拽调宽），手机点底部「<em>AI 盘面分析</em>」。
          </span>
        </li>
        <li>
          <b>④ 核对出处</b>
          <span>
            每个体系面板底部有「<em>出处与原文</em>」；右上「<em>资料库</em>」可全文检索全部原文、数值表与源码行。
          </span>
        </li>
      </ol>
    </aside>
  );
}

export default FirstRunGuide;
