"use client";

/**
 * 「还差一项输入」提示条：把"为什么这里是空的、点哪里补"直接写在盘面里，并给出可点的动作。
 *
 * 目前用于两类与出生地有关的情况：星盘的上升/中天/宫位/阿拉伯点，以及吠陀盘的上升（Lagna）。
 */
export function InputNotice({
  title,
  detail,
  actionLabel = "去补出生地",
  onAction,
}: {
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="input-notice" role="status">
      <div className="input-notice__text">
        <b>{title}</b>
        <span>{detail}</span>
      </div>
      {onAction ? (
        <button type="button" className="input-notice__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default InputNotice;
