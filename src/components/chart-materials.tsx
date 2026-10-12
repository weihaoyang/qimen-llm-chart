"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardCopy, X } from "lucide-react";
import styles from "./chart-materials.module.css";

const TABS: Array<[key: "text" | "json" | "literature", label: string]> = [
  ["text", "结构化文本"],
  ["json", "JSON"],
  ["literature", "文献"],
];

/**
 * 盘面资料抽屉：把**当前盘面**的结构化文本 / JSON / 文献上下文复制或下载。
 *
 * 触发按钮直接写「复制盘面资料」，因为第一次用的人不会知道「盘面资料」就是复制入口；
 * 抽屉内也加了一行用途说明（贴给 AI、存档、换设备继续）。
 */
export function ChartMaterials({ text, json, literature }: { text: string; json: string; literature: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"text" | "json" | "literature">("text");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  let content = tab === "text" ? text : tab === "json" ? json : literature;
  if (tab === "json") {
    try {
      content = JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      /* Show original if incomplete. */
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        title="复制或下载当前盘面的结构化文本 / JSON / 文献，可直接贴给 AI"
        onClick={() => {
          setNotice("");
          setOpen(true);
        }}
      >
        <ClipboardCopy size={15} />
        复制盘面资料
      </button>
      {open && createPortal(
        <div className={styles.overlay} role="presentation">
          <div className={styles.backdrop} aria-hidden="true" onClick={() => setOpen(false)} />
          <section className={styles.drawer} role="dialog" aria-modal="true" aria-label="盘面资料">
            <header>
              <div>
                <small>CHART / SOURCES</small>
                <h2>盘面资料</h2>
              </div>
              <button type="button" aria-label="关闭盘面资料" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </header>
            <p className={styles.hint}>
              这里是<b>当前盘面</b>的结构化文本、JSON 与文献上下文：点「复制到剪贴板」可直接贴给 AI 或聊天窗口；
              点「下载为文件」可存档或换设备继续。切换体系标签后，这里的内容会随之改变。
            </p>
            <nav aria-label="资料类型">
              {TABS.map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  aria-pressed={tab === key}
                  onClick={() => {
                    setTab(key);
                    setNotice("");
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className={styles.actions}>
              <button
                type="button"
                disabled={!content}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(content);
                    setNotice("已复制，可直接粘贴使用");
                  } catch {
                    setNotice("复制失败，请手动选择正文复制");
                  }
                }}
              >
                复制到剪贴板
              </button>
              <button
                type="button"
                disabled={!content}
                onClick={() => {
                  const url = URL.createObjectURL(new Blob([content], { type: tab === "json" ? "application/json" : "text/plain;charset=utf-8" }));
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `知几-${tab}.${tab === "json" ? "json" : "txt"}`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                下载为文件
              </button>
              <span role="status">{notice}</span>
            </div>
            <pre>{content || "当前盘面暂无此项资料。"}</pre>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
