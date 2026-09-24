"use client";

import type { BaziCompatibility } from "@/lib/bazi/compatibility";
import type { NormalizedBaziChart } from "@/lib/bazi/types";
import type { Gender } from "@/lib/profile";
import { BaziPanel } from "./bazi-panel";

type Props = { value: BaziCompatibility | null; chart: NormalizedBaziChart | null; partnerChart: NormalizedBaziChart | null; datetime: string; gender: Gender; onDatetimeChange: (value: string) => void; onGenderChange: (value: Gender) => void; onPurchase: () => void; loading: boolean; open?: boolean; onOpenChange?: (open: boolean) => void };

export function BaziCompatibilityPanel({ value, chart, partnerChart, datetime, gender, onDatetimeChange, onGenderChange, onPurchase, loading, open, onOpenChange }: Props) {
  return <details className="bazi-compatibility-disclosure" open={open} onToggle={(event) => onOpenChange?.(event.currentTarget.open)}>
    <summary><strong>双人合盘</strong><span>按需展开关系工具</span></summary>
    <section className="bazi-compatibility-panel" aria-label="八字双人合盘">
      <div className="bazi-compatibility-panel__head"><div><span>关系工具 · 八字</span><h2>双人合盘</h2><p>分别计算两人的八字，再比较日主、夫妻宫与五行互动；不把分数当成关系结论。</p></div><button type="button" onClick={onPurchase} disabled={loading}>{loading ? "正在打开支付" : "将两张盘面送入 Agent · ¥9.9"}</button></div>
      <div className="bazi-compatibility-panel__inputs"><label>第二人日期时间<input type="datetime-local" value={datetime} onChange={(event) => onDatetimeChange(event.target.value)} /></label><label>性别<select value={gender} onChange={(event) => onGenderChange(event.target.value as Gender)}><option value="male">男</option><option value="female">女</option></select></label></div>
      {value && chart && partnerChart ? <>
        <div className="bazi-compatibility-charts" aria-label="双方完整八字盘"><article><header><span>第一人</span><strong>{chart.raw.dayMaster} 日主</strong></header><BaziPanel chart={chart} /></article><article><header><span>第二人</span><strong>{partnerChart.raw.dayMaster} 日主</strong></header><BaziPanel chart={partnerChart} /></article></div>
        <div className="bazi-compatibility-relations"><header><span>关系结构</span><strong>六合 · 冲克 · 刑害破</strong></header><div className="bazi-compatibility-relations__grid">{value.relations.length ? value.relations.map((relation, index) => <article className={`is-${relation.tone}`} key={`${relation.type}-${relation.left}-${relation.right}-${index}`}><strong>{relation.type}</strong><span>{relation.left} × {relation.right}</span><p>{relation.detail}</p></article>) : <p>四柱之间暂未发现已登记的六合、冲克、刑害破关系。</p>}</div></div>
        <div className="bazi-compatibility-panel__score"><strong>{value.score}</strong><span>{value.headline}</span></div><div className="bazi-compatibility-panel__grid"><article><h3>盘面依据</h3>{value.evidence.map((item) => <p key={item}>{item}</p>)}</article><article><h3>现实建议</h3>{value.suggestions.map((item) => <p key={item}>{item}</p>)}</article></div><small>{value.disclaimer}</small>
      </> : <div className="bazi-compatibility-panel__empty">填写第二人的出生日期时间后生成免费规则版，展开后显示双方完整八字盘与六合、冲克关系。</div>}
    </section>
  </details>;
}
