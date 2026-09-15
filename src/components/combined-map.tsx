"use client";

import { useState, type ReactNode } from "react";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import type { NormalizedBaziChart } from "@/lib/bazi/types";
import type { NormalizedZiweiChart } from "@/lib/ziwei/types";
import styles from "./combined-map.module.css";

const topics = [{ name: "事业", palace: "官禄" }, { name: "财务", palace: "财帛" }, { name: "关系", palace: "夫妻" }, { name: "迁移", palace: "迁移" }];
const sources = ["八字", "奇门", "紫微"];
type Props = { qimen: NormalizedQimenChart | null; bazi: NormalizedBaziChart | null; ziwei: NormalizedZiweiChart | null; agent: ReactNode; onQuestion: (question: string) => void };

export function CombinedMap({ qimen, bazi, ziwei, agent, onQuestion }: Props) {
  const [topic, setTopic] = useState(0);
  const [source, setSource] = useState(0);
  const [period, setPeriod] = useState(0);
  const [question, setQuestion] = useState("");
  const [path, setPath] = useState(1);
  const palace = ziwei?.raw.palaces.find(p => p.name.includes(topics[topic].palace));
  const periods = bazi?.raw.yun.daYun ?? [];
  const selectedPeriod = periods[period];
  const evidence = [
    bazi ? [`四柱 · ${bazi.raw.baZi.join(" / ")}`, `日主 · ${bazi.raw.dayMaster}`, selectedPeriod ? `大运 · ${selectedPeriod.ganZhi}（${selectedPeriod.startYear}—${selectedPeriod.endYear}）` : "大运资料未生成"] : ["八字尚未生成，请调整盘面资料"],
    qimen ? [`起局 · ${qimen.input.datetime}`, `${qimen.raw.ju.type}${qimen.raw.ju.number}局 · ${qimen.raw.yuan}`, `值符 · ${qimen.raw.zhiFu.star} / ${qimen.raw.zhiFu.position}宫`, `值使 · ${qimen.raw.zhiShi.gate} / ${qimen.raw.zhiShi.position}宫`] : ["奇门尚未生成，请调整盘面资料"],
    palace ? [`${palace.name}宫 · ${palace.heavenlyStem}${palace.earthlyBranch}`, `主星 · ${palace.majorStars.map(s => `${s.name}${s.brightness ? `（${s.brightness}）` : ""}${s.mutagen ? ` 化${s.mutagen}` : ""}`).join("、") || "无主星"}`, `本命大限 · ${palace.decadal.range.join("—")}岁`] : ["该领域的紫微宫位资料未生成"],
  ];
  const send = (intent: string) => onQuestion(`${question.trim() || `我想分析${topics[topic].name}方面的决策`}。${intent}。请分别引用奇门、八字与紫微的盘面事实，区分一致、分歧和资料不足；不要虚构成功率或把术数解读当作确定事实。当前查阅的八字大运：${selectedPeriod?.ganZhi ?? "未选择"}，${selectedPeriod?.startYear ?? ""}—${selectedPeriod?.endYear ?? ""}；这不代表奇门已重新起局或紫微已切换流年。`);
  return <main className={styles.workspace} aria-label="三盘推演地图">
    <header className={styles.heading}><div><span>THREE PERSPECTIVES / ONE QUESTION</span><h2>三盘推演地图<span>↗</span></h2></div><p>长期结构 / 当下情境 / 人生领域</p></header>
    <form className={styles.question} onSubmit={e => { e.preventDefault(); send("请开始联合推演"); }}><input aria-label="联合推演问题" value={question} onChange={e => setQuestion(e.target.value)} placeholder="你正在面对什么选择？例如：今年是否适合换工作" maxLength={220} /><button type="submit">带入 Agent ↗</button></form>
    <div className={styles.columns}><div className={styles.reading}>
      <section className={styles.panel}><div className={styles.sectionTitle}><span>01 / 关联地图</span><small>点击节点查看原始依据</small></div>
        <div className={styles.topics}>{topics.map((t,i) => <button key={t.name} aria-pressed={topic===i} onClick={() => setTopic(i)}>{t.name}</button>)}</div>
        <div className={styles.map}>
          <svg viewBox="0 0 600 330" preserveAspectRatio="none" aria-hidden="true"><path d="M300 55 L110 260 L490 260 Z" /><path className={styles.spokes} d="M300 55 L300 170 M110 260 L300 170 M490 260 L300 170" /></svg>
          <div className={styles.center}><small>当前议题</small><strong>{topics[topic].name}</strong><span>三种视角 · 待联合解读</span></div>
          {sources.map((s,i) => <button key={s} className={`${styles.node} ${styles[`node${i}`]}`} aria-pressed={source===i} onClick={() => setSource(i)}><small>0{i+1} / {i===0 ? "长期结构" : i===1 ? "当下情境" : "领域落点"}</small><strong>{s} {i===0 ? "△" : i===1 ? "□" : "○"}</strong><span>{i===0 ? bazi?.raw.dayMaster ?? "待生成" : i===1 ? qimen ? `${qimen.raw.ju.type}${qimen.raw.ju.number}局` : "待生成" : palace?.name ?? "待生成"}</span></button>)}
        </div><p className={styles.note}>连线表示资料关联；一致与分歧由联合解读给出，不以连线数量代表支持度。</p>
        <div className={styles.evidence} aria-live="polite"><h3>{sources[source]} / 原始依据</h3>{evidence[source].map(item => <p key={item}>{item}</p>)}<button onClick={() => send(`请重点解释${sources[source]}在${topics[topic].name}问题上的依据，以及与另外两盘的关系`)}>解释这些依据 ↗</button></div>
      </section>
      <section className={styles.panel}><div className={styles.sectionTitle}><span>02 / 时间坐标</span><small>各盘保留自身时间尺度</small></div><div className={styles.periods} aria-label="八字大运">{periods.map((p,i) => <button key={`${p.index}-${i}`} aria-pressed={period===i} onClick={() => setPeriod(i)}><small>{p.startYear}—{p.endYear}</small><strong>{p.ganZhi}</strong><span>{p.startAge}—{p.endAge}岁</span></button>)}</div><div className={styles.track}><b>八字</b><span>{selectedPeriod ? `${selectedPeriod.startYear}—${selectedPeriod.endYear} · ${selectedPeriod.ganZhi}大运` : "暂无大运数据"}</span></div><div className={styles.track}><b>紫微</b><span>{palace ? `${palace.name}宫 · 本命大限 ${palace.decadal.range.join("—")}岁` : "暂无宫位数据"}</span></div><div className={styles.track}><b>奇门</b><span>◆ {qimen?.input.datetime ?? "未起局"} · 当前起局</span></div><p className={styles.note}>选择大运更新查阅依据；调整出生资料或起局时间请使用顶部“调整盘面”。</p></section>
      <section className={styles.panel}><div className={styles.sectionTitle}><span>03 / 行动比较</span><small>选择路径，交给 Agent 逐项取证</small></div><div className={styles.paths}>{["立即行动", "先做试探", "延后决定"].map((p,i) => <button key={p} aria-pressed={path===i} onClick={() => { setPath(i); send(`请评估“${p}”路径，列出盘面依据、现实约束、最小行动和改变判断的条件，并与另外两条路径比较`); }}><small>PATH / 0{i+1}</small><strong>{p} ↗</strong><span>{["核对前提与不可逆成本", "设计小规模验证与退出条件", "明确等待什么、何时重评"][i]}</span></button>)}</div></section>
    </div><aside className={styles.agent} aria-label="联合解读与追问"><div className={styles.sectionTitle}><span>联合解读 / AGENT</span><small>预测性解读 · 可追溯依据</small></div>{agent}</aside></div>
  </main>;
}

