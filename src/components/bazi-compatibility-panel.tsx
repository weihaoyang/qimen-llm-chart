"use client";

import type { BaziCompatibility } from "@/lib/bazi/compatibility";
import type { Gender } from "@/lib/profile";

type Props = { value: BaziCompatibility | null; datetime: string; gender: Gender; onDatetimeChange: (value: string) => void; onGenderChange: (value: Gender) => void; onPurchase: () => void; loading: boolean };

export function BaziCompatibilityPanel({ value, datetime, gender, onDatetimeChange, onGenderChange, onPurchase, loading }: Props) {
  return <section className="bazi-compatibility-panel" aria-label="八字双人合盘">
    <div className="bazi-compatibility-panel__head"><div><span>关系工具 · 八字</span><h2>双人合盘</h2><p>分别计算两人的八字，再比较日主、夫妻宫与五行互动；不把分数当成关系结论。</p></div><button type="button" onClick={onPurchase} disabled={loading}>{loading ? "正在打开支付" : "AI 合盘分析 · ¥9.9"}</button></div>
    <div className="bazi-compatibility-panel__inputs"><label>第二人日期时间<input type="datetime-local" value={datetime} onChange={(event) => onDatetimeChange(event.target.value)} /></label><label>性别<select value={gender} onChange={(event) => onGenderChange(event.target.value as Gender)}><option value="male">男</option><option value="female">女</option></select></label></div>
    {value ? <><div className="bazi-compatibility-panel__score"><strong>{value.score}</strong><span>{value.headline}</span></div><div className="bazi-compatibility-panel__grid"><article><h3>盘面依据</h3>{value.evidence.map((item) => <p key={item}>{item}</p>)}</article><article><h3>现实建议</h3>{value.suggestions.map((item) => <p key={item}>{item}</p>)}</article></div><small>{value.disclaimer}</small></> : <div className="bazi-compatibility-panel__empty">填写第二人的出生日期时间后生成免费规则版，AI 详细分析共用 ¥9.9 的 10 轮研究对话。</div>}
  </section>;
}
