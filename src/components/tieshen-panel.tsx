"use client";

import { useState } from "react";
import type { TieshenChart } from "@/lib/tieshen/chart";
import { KE_NAMES, SIX_QIN_PILLARS } from "@/lib/tieshen/rules";
import { ProvenanceBlock } from "./provenance-block";

/** 岁段窗口：每次只渲染 10 岁，避免一次铺 108 行。 */
const AGE_WINDOWS = [1, 11, 21, 31, 41, 51, 61, 71, 81, 91, 101] as const;

const textSourceLabel: Record<TieshenChart["liunian"][number]["textSource"], string> = {
  corrected: "校正后",
  original: "原条文",
  formula: "铁板公式",
  none: "—",
};

export function TieshenPanel({
  chart,
  queryInput,
  keOverride,
  onQueryChange,
  onKeChange,
  onCopyJson,
  jsonCopied,
}: {
  chart: TieshenChart;
  queryInput: string;
  keOverride: "auto" | (typeof KE_NAMES)[number];
  onQueryChange?: (value: string) => void;
  onKeChange?: (value: "auto" | (typeof KE_NAMES)[number]) => void;
  onCopyJson?: () => void;
  jsonCopied?: boolean;
}) {
  const [windowStart, setWindowStart] = useState<number>(1);
  const rows = chart.liunian.filter((row) => row.age >= windowStart && row.age <= windowStart + 9);
  const resolved = chart.coverage.liunian.resolved;

  return (
    <section className="divination-panel divination-panel--taiyi" aria-label="铁板神数 · 邵子神数">
      <div className="divination-panel__topline">
        <span>TIESHEN SHENSHU / ARTICLE INDEX</span>
        <span className="status status--live">
          条文库 {chart.library.size} 条 · 流年命中 {resolved}/108
        </span>
      </div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">条文索引盘 · 未接邵子神数条文源</p>
          <h2>铁板神数 · 邵子神数</h2>
          <p className="divination-panel__subhead">
            先天命数 {chart.keys.congNumber} · 五音 {chart.keys.tone}
            {chart.keys.toneNumber} · 本命数 {chart.keys.mainNumber} · 终局条文 {chart.keys.finalFortuneNumber} · 卦名{" "}
            {chart.keys.hexagram || "未匹配"} · 后天命数 {chart.keys.houTianNumber}
          </p>
        </div>
        <div className="divination-panel__header-actions">
          {onCopyJson ? (
            <button type="button" className="divination-panel__export" onClick={onCopyJson}>
              复制 JSON <span>{jsonCopied ? "✓" : "⧉"}</span>
            </button>
          ) : null}
        </div>
      </header>
      <div className="divination-panel__rule" />

      <div className="taiyi-controls">
        <label>
          求测时间
          <input
            type="datetime-local"
            value={queryInput}
            onChange={(event) => onQueryChange?.(event.target.value)}
          />
        </label>
        <label>
          考刻定分
          <div className="rune-selector">
            {(["auto", ...KE_NAMES] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={value === keOverride ? "is-active" : undefined}
                aria-pressed={value === keOverride}
                onClick={() => onKeChange?.(value)}
              >
                {value === "auto" ? "自动" : value}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="taiyi-facts">
        <div>
          <span>出生四柱</span>
          <b>
            {chart.pillars.birth.year} {chart.pillars.birth.month} {chart.pillars.birth.day} {chart.pillars.birth.time}
          </b>
          <em>
            农历 {chart.lunar.year} {chart.lunar.isLeap ? "闰" : ""}
            {chart.lunar.month} 月 {chart.lunar.day} 日 · {chart.input.genderLabel}命
          </em>
        </div>
        <div>
          <span>求测四柱</span>
          <b>
            {chart.pillars.query.year} {chart.pillars.query.month} {chart.pillars.query.day} {chart.pillars.query.time}
          </b>
          <em>
            {chart.input.queryDatetime}
            {chart.input.queryDerived ? "（缺省＝盘面时间）" : ""}
          </em>
        </div>
        <div>
          <span>先天命数 / 五音</span>
          <b>
            {chart.keys.congNumber} · {chart.keys.tone} {chart.keys.toneNumber}
          </b>
          <em>月份表 + 3 − 时辰表 · 年干干组 {chart.keys.ganGroup}</em>
        </div>
        <div>
          <span>日命数 / 时运数</span>
          <b>
            {chart.keys.dayLife} + {chart.keys.timeLuck} = {chart.keys.sum}
          </b>
          <em>日柱纳音取出生、时柱纳音取求测</em>
        </div>
        <div>
          <span>分刻 / 组别</span>
          <b>
            {chart.keys.keName} · 刻干数 {chart.keys.keGanNumber}
          </b>
          <em>
            {chart.keys.group} · 考刻 {chart.keys.moment}
            {chart.keys.momentMatched ? "" : "（14-7 未命中，回退 Main）"}
          </em>
        </div>
        <div>
          <span>本命数 → 终局条文数</span>
          <b>
            {chart.keys.mainNumber} → {chart.keys.finalFortuneNumber}
          </b>
          <em>
            基数 {chart.keys.base} · 因子 {chart.keys.factor} · 公式 本命数 + {chart.keys.keGanNumber}×48
          </em>
        </div>
        <div>
          <span>卦名 / 后天命数</span>
          <b>
            {chart.keys.hexagram || "未匹配"} · {chart.keys.houTianNumber}
          </b>
          <em>
            {chart.keys.hexagramSource === "detail" ? "14-9 详表" : chart.keys.hexagramSource === "simple" ? "14-8 简表" : "未匹配"} · 三元{" "}
            {chart.keys.sanYuan}
            {chart.keys.wuShuJiGong ? ` · 五数寄宫 ${chart.keys.wuShuJiGong.hexagram}` : ""}
          </em>
        </div>
        <div>
          <span>八卦加则</span>
          <b>
            起 {chart.keys.jiaze.start} → {chart.keys.jiaze.result ?? "—"}
          </b>
          <em>
            {chart.keys.jiaze.steps} 步 · {chart.keys.jiaze.stopped ? "六八即止" : "十步未止"}
          </em>
        </div>
      </div>

      <div className="divination-section-heading">
        <span>本命条文 · 14-10</span>
        <small>
          {chart.benming.table
            ? `基数 ${chart.benming.table.base} / 序数 ${chart.benming.table.seq} · ${chart.benming.hits.length} 条`
            : "该（卦名 / 考刻 / 先天命数）组合未命中"}
        </small>
      </div>
      <div className="taiyi-generals">
        {(chart.benming.hits.length
          ? chart.benming.hits
          : [{ category: "—", fortune: chart.keys.finalFortuneNumber, volume: "", age: "", text: "" }]
        ).map((hit) => (
          <article className="taiyi-general" key={`${hit.category}-${hit.fortune}`}>
            <header>
              <b>{hit.fortune}</b>
              <em>{hit.category}</em>
            </header>
            <span>
              {hit.volume || "—"}
              {hit.age ? ` · 对应年龄 ${hit.age}` : ""}
            </span>
            <p>{hit.text || "条文库中无此编号断词"}</p>
          </article>
        ))}
      </div>

      <div className="divination-section-heading">
        <span>终局条文 / 流年条文</span>
        <small>
          终局 {chart.keys.finalFortuneNumber}
          {chart.native ? "" : "（小于条文库起始 1001，无断词）"} · 所选岁段 {windowStart}–
          {Math.min(windowStart + 9, 108)}
        </small>
      </div>
      <div className="rune-selector">
        {AGE_WINDOWS.map((start) => (
          <button
            key={start}
            type="button"
            className={start === windowStart ? "is-active" : undefined}
            aria-pressed={start === windowStart}
            onClick={() => setWindowStart(start)}
          >
            {start}–{Math.min(start + 9, 108)}
          </button>
        ))}
      </div>

      <div className="taiyi-table">
        <div className="taiyi-table__row taiyi-table__row--head">
          <b>岁</b>
          <b>干支</b>
          <b>五音</b>
          <b>标记</b>
          <b>字母</b>
          <b>落定条文</b>
        </div>
        {rows.map((row) => (
          <div className={`taiyi-table__row${row.textSource === "none" ? "" : " is-active"}`} key={row.age}>
            <b>{row.age}</b>
            <span>{row.ganZhi}</span>
            <span>{row.sound || "—"}</span>
            <span>{row.marker || "—"}</span>
            <span>{row.letter || "—"}</span>
            <em>
              {row.correctedText || row.originalText || row.tiebanText || "本岁末未落到条文（字母/条文编号未覆盖）"}
              {row.textSource === "none" ? "" : `｜${textSourceLabel[row.textSource]}`}
            </em>
          </div>
        ))}
      </div>
      <p className="taiyi-note">
        三种口径并列：原条文（字母 + 虚岁直接查得）、校正后条文（按年龄施加条文校正后查得，一般以此为落定）、铁板公式条文（原条文数 +
        刻干数 × 48）。字母为空表示该岁的五音 / 标记组合未在 14-13 中登记，本页不补造。
      </p>

      <div className="divination-section-heading">
        <span>终局条文断词 / 条文库</span>
        <small>
          {chart.library.name} · {chart.library.license}
        </small>
      </div>
      <div className="taiyi-generals">
        <article className="taiyi-general">
          <header>
            <b>{chart.native ? chart.native.fortune : chart.keys.finalFortuneNumber}</b>
            <em>终局条文</em>
          </header>
          <span>{chart.native ? `${chart.native.volume}${chart.native.age ? ` · 对应年龄 ${chart.native.age}` : ""}` : "—"}</span>
          <p>{chart.native ? chart.native.text : "条文库中无此编号断词（终局条文数常小于条文库起始 1001，属正常）"}</p>
        </article>
        <article className="taiyi-general">
          <header>
            <b>{chart.library.size}</b>
            <em>条文条数</em>
          </header>
          <span>
            {chart.library.license} · {chart.library.commit.slice(0, 12)}
          </span>
          <p>{chart.library.repository}</p>
        </article>
        <article className="taiyi-general">
          <header>
            <b>邵子神数</b>
            <em>未接入</em>
          </header>
          <span>无论文源接入</span>
          <p>{chart.coverage.shaoziShenshu.reason}</p>
        </article>
        <article className="taiyi-general">
          <header>
            <b>六亲条文</b>
            <em>未实现</em>
          </header>
          <span>{Object.entries(SIX_QIN_PILLARS).map(([pillar, palace]) => `${pillar}=${palace}`).join(" · ")}</span>
          <p>{chart.coverage.sixQin.reason}</p>
        </article>
      </div>

      <div className="divination-section-heading">
        <span>未实现（不生成条文）</span>
        <small>TODO</small>
      </div>
      {chart.todo.map((item) => (
        <p className="taiyi-note" key={item}>
          — {item}
        </p>
      ))}

      <p className="divination-panel__note">
        <span>BOUNDARY</span>
        {chart.disclaimer}
      </p>

      <ProvenanceBlock system="tieshen" />
    </section>
  );
}
