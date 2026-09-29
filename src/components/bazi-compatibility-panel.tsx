"use client";

import type { BaziCompatibility } from "@/lib/bazi/compatibility";
import type { NormalizedBaziChart } from "@/lib/bazi/types";
import type { Gender } from "@/lib/profile";
import { BaziPanel } from "./bazi-panel";

type Props = {
  value: BaziCompatibility | null;
  chart: NormalizedBaziChart | null;
  partnerChart: NormalizedBaziChart | null;
  datetime: string;
  gender: Gender;
  onDatetimeChange: (value: string) => void;
  onGenderChange: (value: Gender) => void;
  onPurchase: () => void;
  loading: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const formatDate = (value: string) => {
  if (!value) return "待补充出生时间";
  const [date, time] = value.split("T");
  return `${date.replaceAll("-", ".")} ${time ?? ""}`.trim();
};

const getPillar = (chart: NormalizedBaziChart, key: "day" | "year") =>
  chart.raw.pillars.find((pillar) => pillar.key === key)?.pillar ?? "—";

const getElementSummary = (chart: NormalizedBaziChart) => {
  const values = chart.raw.wuXing ?? [];
  return values.length ? values.slice(0, 4).join(" · ") : "五行资料待补充";
};

function PersonSummary({
  chart,
  label,
  date,
  accent,
}: {
  chart: NormalizedBaziChart;
  label: string;
  date?: string;
  accent: "yellow" | "red";
}) {
  return (
    <article className={`bazi-compatibility-person bazi-compatibility-person--${accent}`}>
      <div className="bazi-compatibility-person__topline">
        <span className="bazi-compatibility-person__index">{label}</span>
        <span className="bazi-compatibility-person__tag">{chart.input.original.gender === "female" ? "女" : "男"} · 本命</span>
      </div>
      <div className="bazi-compatibility-person__core">
        <div className="bazi-compatibility-person__master"><small>日主</small><strong>{chart.raw.dayMaster}</strong></div>
        <div className="bazi-compatibility-person__pillars"><span>日柱 <b>{getPillar(chart, "day")}</b></span><span>年柱 <b>{getPillar(chart, "year")}</b></span></div>
      </div>
      <div className="bazi-compatibility-person__meta"><span>{date ? formatDate(date) : chart.raw.solar}</span><span>{getElementSummary(chart)}</span></div>
    </article>
  );
}

export function BaziCompatibilityPanel({
  value,
  chart,
  partnerChart,
  datetime,
  gender,
  onDatetimeChange,
  onGenderChange,
  onPurchase,
  loading,
  open,
  onOpenChange,
}: Props) {
  const hasResult = Boolean(value && chart && partnerChart);

  return (
    <details className="bazi-compatibility-disclosure" open={open} onToggle={(event) => onOpenChange?.(event.currentTarget.open)}>
      <summary>
        <span className="bazi-compatibility-disclosure__mark">PAIR / 02</span>
        <strong>八字双人合盘</strong>
        <span className="bazi-compatibility-disclosure__hint">比较两人的日主、夫妻宫与五行互动</span>
        <span className="bazi-compatibility-disclosure__toggle" aria-hidden="true">+</span>
      </summary>

      <section className="bazi-compatibility-panel" aria-label="八字双人合盘">
        <header className="bazi-compatibility-hero">
          <div className="bazi-compatibility-hero__copy"><span className="bazi-compatibility-kicker">RELATION LAB / 八字关系实验室</span><h2>把两张盘，读成一段关系</h2><p>先看结构，再看分数。合盘只提供可复盘的互动线索，不替你决定关系。</p></div>
          <button className="bazi-compatibility-cta" type="button" onClick={onPurchase} disabled={loading}><span>{loading ? "正在打开支付" : "解锁 Agent 深度分析"}</span><small>{loading ? "请稍候" : "两张盘面 · ¥9.9"}</small></button>
        </header>

        <section className="bazi-compatibility-editor" aria-label="第二人资料">
          <div className="bazi-compatibility-editor__title"><span className="bazi-compatibility-section-number">01</span><div><strong>补充第二人资料</strong><small>出生时刻越准确，关系结构越可读</small></div></div>
          <div className="bazi-compatibility-editor__fields"><label><span>出生日期与时间</span><input type="datetime-local" value={datetime} onChange={(event) => onDatetimeChange(event.target.value)} /></label><label><span>性别</span><select value={gender} onChange={(event) => onGenderChange(event.target.value as Gender)}><option value="male">男</option><option value="female">女</option></select></label></div>
        </section>

        {!hasResult ? (
          <div className="bazi-compatibility-empty"><span className="bazi-compatibility-empty__glyph">✦</span><div><strong>等待第二张盘面</strong><p>填写出生日期与时间后，系统会生成免费规则版合盘。</p></div></div>
        ) : (
          <>
            <section className="bazi-compatibility-overview" aria-label="关系总览">
              <div className="bazi-compatibility-section-heading"><div><span className="bazi-compatibility-section-number">02</span><div><strong>关系总览</strong><small>两张盘面的第一眼对照</small></div></div><span className="bazi-compatibility-section-heading__rule" /></div>
              <div className="bazi-compatibility-overview__grid"><PersonSummary chart={chart!} label="第一人" accent="yellow" /><div className="bazi-compatibility-score"><span className="bazi-compatibility-score__label">STRUCTURE SCORE</span><strong>{value?.score ?? 0}</strong><span className="bazi-compatibility-score__unit">/ 100</span><p>{value?.headline}</p><i aria-hidden="true"><b style={{ width: `${value?.score ?? 0}%` }} /></i></div><PersonSummary chart={partnerChart!} label="第二人" date={datetime} accent="red" /></div>
            </section>

            <section className="bazi-compatibility-relations" aria-label="关系信号">
              <div className="bazi-compatibility-section-heading"><div><span className="bazi-compatibility-section-number">03</span><div><strong>关系信号</strong><small>从四柱交互里提取出的结构提示</small></div></div><span className="bazi-compatibility-section-heading__rule" /></div>
              {value?.relations.length ? <div className="bazi-compatibility-relations__grid">{value.relations.map((relation, index) => <article className={`is-${relation.tone}`} key={`${relation.type}-${relation.left}-${relation.right}-${index}`}><div className="bazi-compatibility-relation__top"><strong>{relation.type}</strong><span>{String(index + 1).padStart(2, "0")}</span></div><b>{relation.left} <em>×</em> {relation.right}</b><p>{relation.detail}</p></article>)}</div> : <div className="bazi-compatibility-relations__none">四柱之间暂未发现已登记的六合、冲克、刑害破关系，先从现实互动观察。</div>}
            </section>

            <section className="bazi-compatibility-reading" aria-label="合盘解读">
              <div className="bazi-compatibility-reading__column"><div className="bazi-compatibility-section-heading"><div><span className="bazi-compatibility-section-number">04</span><div><strong>盘面依据</strong><small>为什么会得到这个判断</small></div></div></div><ol>{value?.evidence.map((item) => <li key={item}>{item}</li>)}</ol></div>
              <div className="bazi-compatibility-reading__column bazi-compatibility-reading__column--advice"><div className="bazi-compatibility-section-heading"><div><span className="bazi-compatibility-section-number">05</span><div><strong>现实建议</strong><small>把线索变成可执行的动作</small></div></div></div><ol>{value?.suggestions.map((item) => <li key={item}>{item}</li>)}</ol></div>
            </section>

            <section className="bazi-compatibility-charts" aria-label="双方完整八字盘">
              <div className="bazi-compatibility-section-heading"><div><span className="bazi-compatibility-section-number">06</span><div><strong>双方完整盘面</strong><small>需要逐柱核对时再展开</small></div></div></div>
              <div className="bazi-compatibility-charts__grid"><details className="bazi-compatibility-chart"><summary><span>第一人 · {chart!.raw.dayMaster} 日主</span><b>展开盘面 +</b></summary><BaziPanel chart={chart!} /></details><details className="bazi-compatibility-chart"><summary><span>第二人 · {partnerChart!.raw.dayMaster} 日主</span><b>展开盘面 +</b></summary><BaziPanel chart={partnerChart!} /></details></div>
            </section>

            <small className="bazi-compatibility-disclaimer">{value?.disclaimer}</small>
          </>
        )}
      </section>
    </details>
  );
}
