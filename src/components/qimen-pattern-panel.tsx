"use client";

import { useState } from "react";
import { evaluateQimenPatterns, type QimenPatternCheck, type QimenPatternGroup, type QimenPatternStrength } from "@/lib/qimen/patterns";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import { ProvenanceBlock } from "./provenance-block";

type PatternFilter = "all" | "formed" | "failed";

const FILTERS: Array<{ key: PatternFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "formed", label: "只看成立" },
  { key: "failed", label: "只看失败" },
];

const GROUP_ORDER: QimenPatternGroup[] = ["九遁", "三诈五假", "常用吉格", "常用凶格", "伏吟反吟", "全局"];

const STRENGTH_KEY: Record<QimenPatternStrength, string> = { 有力: "strong", 中平: "medium", 无力: "weak" };

const matchesFilter = (check: QimenPatternCheck, filter: PatternFilter) =>
  filter === "all" ? true : filter === "formed" ? check.status === "成立" : check.status === "未成立";

export function QimenPatternPanel({
  chart,
  open,
  onOpenChange,
}: {
  chart: NormalizedQimenChart | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [filter, setFilter] = useState<PatternFilter>("all");
  const report = chart ? evaluateQimenPatterns(chart) : null;
  const shown = report ? report.checks.filter((check) => matchesFilter(check, filter)) : [];
  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: shown.filter((check) => check.group === group),
  })).filter((entry) => entry.items.length > 0);

  return (
    <details
      className="qimen-pattern-disclosure"
      open={open}
      onToggle={(event) => onOpenChange?.(event.currentTarget.open)}
    >
      <summary>
        <span className="qimen-pattern-disclosure__mark">PATTERNS</span>
        <strong>奇门格局 · 成立 / 失败</strong>
        <span className="qimen-pattern-disclosure__hint">逐项判定登记格局，含未成立者与侧边提示</span>
        <span className="qimen-pattern-disclosure__toggle" aria-hidden="true">+</span>
      </summary>

      <section className="qimen-pattern-panel" aria-label="奇门格局成立与失败">
        {!report ? (
          <div className="qimen-pattern-empty">等待生成盘面。</div>
        ) : (
          <>
            <header className="qimen-pattern-head">
              <span>
                登记 {report.registered} 项 · 成立 <b className="is-good">{report.formed.length}</b> · 未成立{" "}
                <b className="is-bad">{report.failed.length}</b>
              </span>
              <span className="qimen-pattern-head__strength">
                有力 <b className="is-strong">{report.strengthCounts.有力}</b> · 中平{" "}
                <b className="is-medium">{report.strengthCounts.中平}</b> · 无力{" "}
                <b className="is-weak">{report.strengthCounts.无力}</b>
              </span>
              <div className="qimen-pattern-filter" role="group" aria-label="格局筛选">
                {FILTERS.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={filter === item.key ? "is-active" : undefined}
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </header>

            {groups.map(({ group, items }) => (
              <section className="qimen-pattern-group" key={group} aria-label={group}>
                <h3 className="qimen-pattern-group__title">
                  {group}
                  <span>
                    成立 {items.filter((check) => check.status === "成立").length} / {items.length}
                  </span>
                </h3>
                <ul className="qimen-pattern-list">
                  {items.map((check) => (
                    <li
                      className={`qimen-pattern-item is-${check.kind === "吉格" ? "good" : "bad"} is-${check.status === "成立" ? "formed" : "failed"}`}
                      key={check.id}
                    >
                      <div className="qimen-pattern-item__head">
                        <b>{check.kind}</b>
                        <strong>{check.name}</strong>
                        {check.strength ? (
                          <span className={`qimen-pattern-item__strength is-${STRENGTH_KEY[check.strength]}`}>
                            {check.strength}
                          </span>
                        ) : null}
                        <span className={`qimen-pattern-item__status is-${check.status === "成立" ? "formed" : "failed"}`}>
                          {check.status}
                        </span>
                      </div>
                      <dl>
                        <dt>条件</dt>
                        <dd>{check.requirement}</dd>
                        <dt>提示</dt>
                        <dd>{check.hint}</dd>
                        {check.strengthNote ? (
                          <>
                            <dt>旺衰</dt>
                            <dd>{check.strengthNote}</dd>
                          </>
                        ) : null}
                        {check.evidence.length > 0 ? (
                          <>
                            <dt>落宫</dt>
                            <dd>{check.evidence.join("；")}</dd>
                          </>
                        ) : null}
                      </dl>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <small className="qimen-pattern-disclaimer">
              只判定本产品登记的经典格局；「未成立」表示本盘未命中其条件，既不等于传统上不存在其它格局，也不构成吉凶断语。
            </small>
          </>
        )}
      </section>

      <ProvenanceBlock system="qimen" />
    </details>
  );
}
