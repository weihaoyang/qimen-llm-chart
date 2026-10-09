"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { BaziSettings } from "@/lib/bazi/settings";
import {
  BAZI_REVERSE_MAX_YEAR,
  BAZI_REVERSE_MIN_YEAR,
  SEXAGENARY_CYCLE,
  deriveBirthDatesFromBazi,
  type BaziReversePillars,
  type BaziReverseResult,
} from "@/lib/bazi/reverse";
import type { NormalizedBaziChart } from "@/lib/bazi/types";

const PILLAR_FIELDS: Array<{ key: keyof BaziReversePillars; label: string }> = [
  { key: "year", label: "年柱" },
  { key: "month", label: "月柱" },
  { key: "day", label: "日柱" },
  { key: "time", label: "时柱" },
];

const DEFAULT_START_YEAR = 1940;
const DEFAULT_END_YEAR = 2020;

type BaziReversePanelProps = {
  /** 与当前工作台一致的换年、换日口径，保证搜出来的盘能直接对上。 */
  settings: BaziSettings;
  chart?: NormalizedBaziChart | null;
  onApply: (datetime: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function BaziReversePanel({
  settings,
  chart,
  onApply,
  open,
  onOpenChange,
}: BaziReversePanelProps) {
  const [pillars, setPillars] = useState<BaziReversePillars>({});
  const [startYear, setStartYear] = useState(DEFAULT_START_YEAR);
  const [endYear, setEndYear] = useState(DEFAULT_END_YEAR);
  const [result, setResult] = useState<BaziReverseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasCurrentChart = Boolean(chart && chart.raw.baZi.length === 4);

  const fillFromCurrentChart = () => {
    if (!chart) return;
    const [year, month, day, time] = chart.raw.baZi;
    setPillars({ year, month, day, time });
    setResult(null);
    setError(null);
  };

  const runSearch = () => {
    setError(null);
    setBusy(true);
    // 排盘扫描是同步的，先让「正在搜索」渲染一帧再开始，避免点击后界面假死。
    setTimeout(() => {
      try {
        setResult(
          deriveBirthDatesFromBazi({
            pillars,
            startYear,
            endYear,
            settings,
          }),
        );
      } catch (nextError) {
        setResult(null);
        setError(nextError instanceof Error ? nextError.message : "逆推失败，请检查输入。");
      } finally {
        setBusy(false);
      }
    }, 0);
  };

  const givenSummary = PILLAR_FIELDS.map(
    (field) => `${field.label} ${pillars[field.key] ?? "不限"}`,
  ).join(" · ");

  return (
    <details
      className="bazi-reverse-disclosure"
      open={open}
      onToggle={(event) => onOpenChange?.(event.currentTarget.open)}
    >
      <summary>
        <span className="bazi-reverse-disclosure__mark">REVERSE / 03</span>
        <strong>从八字逆推生日</strong>
        <span className="bazi-reverse-disclosure__hint">给出已知干支与年份范围，反查可能的公历生日</span>
        <span className="bazi-reverse-disclosure__toggle" aria-hidden="true">+</span>
      </summary>

      <section className="bazi-reverse-panel" aria-label="从八字逆推生日">
        <header className="bazi-reverse-hero">
          <div className="bazi-reverse-hero__copy">
            <span className="bazi-reverse-kicker">REVERSE ENGINE / 四柱反查</span>
            <h2>把四柱，翻回那一天</h2>
            <p>四柱不是一一对应：年柱每六十年一循环、一个时辰含两个整点。这里列出所有与干支一致的候选生日，由你结合现实信息判断。</p>
          </div>
        </header>

        <section className="bazi-reverse-editor" aria-label="逆推条件">
          <div className="bazi-reverse-editor__title">
            <span className="bazi-reverse-section-number">01</span>
            <div>
              <strong>填写已知干支</strong>
              <small>不必填满，留空即表示该柱不限；至少给出年、月、日柱之一</small>
            </div>
          </div>

          <div className="bazi-reverse-fields">
            {PILLAR_FIELDS.map((field) => (
              <label key={field.key}>
                <span>{field.label}</span>
                <select
                  value={pillars[field.key] ?? ""}
                  onChange={(event) =>
                    setPillars((current) => ({ ...current, [field.key]: event.target.value || undefined }))
                  }
                >
                  <option value="">不限</option>
                  {SEXAGENARY_CYCLE.map((ganZhi) => (
                    <option key={ganZhi} value={ganZhi}>
                      {ganZhi}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="bazi-reverse-range">
            <label>
              <span>年份范围</span>
              <input
                type="number"
                inputMode="numeric"
                min={BAZI_REVERSE_MIN_YEAR}
                max={BAZI_REVERSE_MAX_YEAR}
                value={startYear}
                onChange={(event) => setStartYear(Number(event.target.value))}
              />
            </label>
            <span aria-hidden="true">—</span>
            <label>
              <span>至</span>
              <input
                type="number"
                inputMode="numeric"
                min={BAZI_REVERSE_MIN_YEAR}
                max={BAZI_REVERSE_MAX_YEAR}
                value={endYear}
                onChange={(event) => setEndYear(Number(event.target.value))}
              />
            </label>
            <small>支持 {BAZI_REVERSE_MIN_YEAR} 至 {BAZI_REVERSE_MAX_YEAR} 年，范围越小越快</small>
          </div>

          <div className="bazi-reverse-actions">
            <button
              type="button"
              className="bazi-reverse-action bazi-reverse-action--primary"
              onClick={runSearch}
              disabled={busy}
            >
              <Search data-icon="inline-start" />
              {busy ? "正在搜索…" : "开始逆推"}
            </button>
            <button
              type="button"
              className="bazi-reverse-action"
              onClick={fillFromCurrentChart}
              disabled={!hasCurrentChart}
            >
              带入当前盘面四柱
            </button>
          </div>

          <small className="bazi-reverse-given">{givenSummary}</small>
        </section>

        {error ? (
          <p className="bazi-reverse-error" role="alert">{error}</p>
        ) : null}

        {!result && !error ? (
          <div className="bazi-reverse-empty">
            <span className="bazi-reverse-empty__glyph">⟲</span>
            <div>
              <strong>等待逆推</strong>
              <p>填好已知干支后点击「开始逆推」，系统会逐日回排并列出候选生日。</p>
            </div>
          </div>
        ) : null}

        {result ? (
          <section className="bazi-reverse-results" aria-label="逆推候选生日">
            <div className="bazi-reverse-results__head">
              <div>
                <span className="bazi-reverse-section-number">02</span>
                <div>
                  <strong>候选生日 {result.candidates.length} 个</strong>
                  <small>
                    扫描 {result.scannedDays} 天 · 命中 {result.matchedDays} 天 · {result.conventions.yearBoundary === "li-chun" ? "立春换年" : "春节换年"} / {result.conventions.dayBoundary === "midnight" ? "子正换日" : "子初换日"}
                  </small>
                </div>
              </div>
            </div>

            <ul className="bazi-reverse-notes">
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>

            {result.candidates.length === 0 ? (
              <div className="bazi-reverse-none">没有可列出的候选生日，见上方说明。</div>
            ) : (
              <ul className="bazi-reverse-list">
                {result.candidates.map((candidate) => (
                  <li className="bazi-reverse-item" key={candidate.datetime}>
                    <div className="bazi-reverse-item__when">
                      <strong>{candidate.date}</strong>
                      <span>{candidate.hourRanges.join(" / ")}</span>
                    </div>
                    <div className="bazi-reverse-item__lunar">{candidate.lunar}</div>
                    <div className="bazi-reverse-item__pillars">
                      {candidate.ganzhi.map((ganZhi, index) => (
                        <b key={`${candidate.datetime}-${PILLAR_FIELDS[index].label}`} title={PILLAR_FIELDS[index].label}>
                          <small>{PILLAR_FIELDS[index].label}</small>
                          {ganZhi}
                        </b>
                      ))}
                    </div>
                    <button type="button" className="bazi-reverse-apply" onClick={() => onApply(candidate.datetime)}>
                      应用此时间
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <small className="bazi-reverse-disclaimer">
          逆推结果只说明该时刻与所填干支一致，不构成出生时间的证明；若工作台使用真太阳时，代入后时柱可能随经度修正而变化。
        </small>
      </section>
    </details>
  );
}
