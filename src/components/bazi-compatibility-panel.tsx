"use client";

import type { BaziCompatibility } from "@/lib/bazi/compatibility";
import type { NormalizedBaziChart } from "@/lib/bazi/types";
import { getTenGodGroup } from "@/lib/bazi/relations";
import { BAZI_RELATION_GROUPS, getBaziRelationGroup } from "@/lib/bazi/relations-analysis";
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

const PILLAR_ORDER = ["year", "month", "day", "time"] as const;
const PILLAR_LABELS: Record<(typeof PILLAR_ORDER)[number], string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  time: "时柱",
};

const renderTenGod = (tenGod: string, key: string) =>
  tenGod ? (
    <span className="bazi-ten-god-badge" data-ten-god-group={getTenGodGroup(tenGod) ?? "未知"} key={key}>
      {tenGod}
    </span>
  ) : null;

const orderedPillars = (chart: NormalizedBaziChart) =>
  PILLAR_ORDER.map((key) => chart.raw.pillars.find((pillar) => pillar.key === key)).filter(
    (pillar): pillar is NormalizedBaziChart["raw"]["pillars"][number] => Boolean(pillar),
  );

/**
 * 上下对照: both people's four pillars share one aligned grid, so the columns
 * can be read against each other instead of side by side.
 */
function PairPillarTable({ left, right }: { left: NormalizedBaziChart; right: NormalizedBaziChart }) {
  const person = (chart: NormalizedBaziChart, label: string, accent: "yellow" | "red") => {
    const pillars = orderedPillars(chart);
    return (
      <div className={`bazi-pair-person bazi-pair-person--${accent}`}>
        <div className="bazi-pair-person__label">
          <span>{label}</span>
          <strong>{chart.raw.dayMaster} 日主</strong>
        </div>
        <div className="bazi-pair-row bazi-pair-row--ganzhi">
          <span>干支</span>
          {pillars.map((pillar) => <div key={pillar.key}><strong>{pillar.pillar}</strong></div>)}
        </div>
        <div className="bazi-pair-row">
          <span>天干十神</span>
          {pillars.map((pillar) => <div key={pillar.key}>{renderTenGod(pillar.shiShenGan, `${label}-stem-${pillar.key}`)}</div>)}
        </div>
        <div className="bazi-pair-row">
          <span>地支十神</span>
          {pillars.map((pillar) => (
            <div key={pillar.key} className="bazi-pair-gods">
              {pillar.shiShenZhi.length
                ? pillar.shiShenZhi.map((god, index) => renderTenGod(god, `${label}-branch-${pillar.key}-${index}`))
                : <em>—</em>}
            </div>
          ))}
        </div>
        <div className="bazi-pair-row">
          <span>藏干</span>
          {pillars.map((pillar) => <div key={pillar.key}><b>{pillar.hiddenStems.join("") || "—"}</b></div>)}
        </div>
        <div className="bazi-pair-row bazi-pair-row--meta">
          <span>纳音</span>
          {pillars.map((pillar) => <div key={pillar.key}>{pillar.naYin || "—"}</div>)}
        </div>
      </div>
    );
  };

  return (
    <div className="bazi-pair-table" aria-label="双方四柱上下对照">
      <div className="bazi-pair-head">
        <span>柱位</span>
        {PILLAR_ORDER.map((key) => <strong key={key}>{PILLAR_LABELS[key]}</strong>)}
      </div>
      {person(left, "第一人", "yellow")}
      {person(right, "第二人", "red")}
    </div>
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
  const relationGroups = (value?.relations ?? [])
    ? BAZI_RELATION_GROUPS
        .map((group) => ({
          group,
          items: (value?.relations ?? []).filter((relation) => getBaziRelationGroup(relation.type) === group),
        }))
        .filter((bucket) => bucket.items.length > 0)
    : [];

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
              <div className="bazi-compatibility-section-heading"><div><span className="bazi-compatibility-section-number">02</span><div><strong>上下对照</strong><small>两张盘面的四柱逐列对齐</small></div></div><span className="bazi-compatibility-section-heading__rule" /></div>
              <div className="bazi-compatibility-score"><span className="bazi-compatibility-score__label">STRUCTURE SCORE</span><strong>{value?.score ?? 0}</strong><span className="bazi-compatibility-score__unit">/ 100</span><p>{value?.headline}</p><i aria-hidden="true"><b style={{ width: `${value?.score ?? 0}%` }} /></i></div>
              <PairPillarTable left={chart!} right={partnerChart!} />
            </section>

            <section className="bazi-compatibility-relations" aria-label="关系信号">
              <div className="bazi-compatibility-section-heading"><div><span className="bazi-compatibility-section-number">03</span><div><strong>关系信号</strong><small>从四柱交互里提取出的结构提示</small></div></div><span className="bazi-compatibility-section-heading__rule" /></div>
              {relationGroups.length ? <div className="bazi-relation-groups">{relationGroups.map((bucket) => <details className="bazi-relation-group" key={bucket.group} open><summary><strong>{bucket.group}</strong><span>{bucket.items.length}</span></summary><ul className="bazi-relation-list">{bucket.items.map((relation, index) => <li className={`bazi-relation-row is-${relation.tone}`} key={`${relation.type}-${relation.left}-${relation.right}-${index}`}><b className="bazi-relation-row__symbols">{relation.type}</b><span className="bazi-relation-row__pair">{relation.left} × {relation.right}</span><small className="bazi-relation-row__detail">{relation.detail}</small></li>)}</ul></details>)}</div> : <div className="bazi-compatibility-relations__none">四柱之间暂未发现已登记的六合、冲克、刑害破关系，先从现实互动观察。</div>}
            </section>

            <section className="bazi-compatibility-reading" aria-label="合盘解读">
              <div className="bazi-compatibility-reading__column"><div className="bazi-compatibility-section-heading"><div><span className="bazi-compatibility-section-number">04</span><div><strong>盘面依据</strong><small>为什么会得到这个判断</small></div></div></div><ol>{value?.evidence.map((item) => <li key={item}>{item}</li>)}</ol></div>
              <div className="bazi-compatibility-reading__column bazi-compatibility-reading__column--advice"><div className="bazi-compatibility-section-heading"><div><span className="bazi-compatibility-section-number">05</span><div><strong>现实建议</strong><small>把线索变成可执行的动作</small></div></div></div><ol>{value?.suggestions.map((item) => <li key={item}>{item}</li>)}</ol></div>
            </section>

            <section className="bazi-compatibility-charts" aria-label="双方完整八字盘">
              <div className="bazi-compatibility-section-heading"><div><span className="bazi-compatibility-section-number">06</span><div><strong>双方完整盘面</strong><small>自上而下核对每一张盘</small></div></div></div>
              <div className="bazi-compatibility-charts__stack">
                <details className="bazi-compatibility-chart"><summary><span>第一人 · {chart!.raw.dayMaster} 日主</span><b>展开盘面 +</b></summary><BaziPanel chart={chart!} /></details>
                <details className="bazi-compatibility-chart"><summary><span>第二人 · {partnerChart!.raw.dayMaster} 日主</span><b>展开盘面 +</b></summary><BaziPanel chart={partnerChart!} /></details>
              </div>
            </section>

            <small className="bazi-compatibility-disclaimer">{value?.disclaimer}</small>
          </>
        )}
      </section>
    </details>
  );
}
