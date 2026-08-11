"use client";

import type { KlinePoint, KlineScale, KlineSeries } from "@/lib/qimen/kline";
import type { AgentConversationMessage } from "@/lib/agent/chat";

export type DecisionTreeSnapshot = {
  root: { activeWindow: string; evidence: string; source: string };
  branches: Array<{ key: string; title: string; assumptions: string[]; firstAction: string; cost: string; risks: string[]; validationDate: string | null; stopCondition: string }>;
};

type DecisionTreePanelProps = { life: KlineSeries; relationshipScales?: Partial<Record<KlineScale, KlineSeries>>; question?: string; conversation?: readonly AgentConversationMessage[]; embedded?: boolean; savedSnapshot?: DecisionTreeSnapshot | null; savedVersion?: number | null; onSave?: (snapshot: DecisionTreeSnapshot) => void; saveLabel?: string };

const pointWeight = (point: KlinePoint) => Math.abs(point.delta) * 2 + (point.high - point.low) * 0.45 + point.evidence.length * 0.7 + (point.keyPoint ? 4 : 0);
const strongest = (series: KlineSeries | undefined) => series?.points.reduce<KlinePoint | undefined>((best, point) => !best || pointWeight(point) > pointWeight(best) ? point : best, undefined);

const dateText = (point?: KlinePoint) => point ? point.datetime.replace("T", " ") : "等待序列";

const compactFact = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 80);

/**
 * Only the user's own words can become a reality fact.  Model output may
 * illuminate a question, but it is never treated as evidence for a branch.
 */
export const collectRealityFacts = (question?: string, conversation: readonly AgentConversationMessage[] = []) => {
  const facts = [question ?? "", ...conversation.filter((message) => message.role === "user").map((message) => message.content)]
    .map(compactFact)
    .filter(Boolean);
  return facts.filter((fact, index) => facts.indexOf(fact) === index).slice(-3);
};

export const buildDecisionTreeSnapshot = (
  life: KlineSeries,
  relationshipScales?: Partial<Record<KlineScale, KlineSeries>>,
  question?: string,
  conversation: readonly AgentConversationMessage[] = [],
): DecisionTreeSnapshot => {
  const lifePoint = strongest(life);
  const relationshipEntries = (["double-hour", "day", "month", "year"] as const).map((scale) => ({ scale, point: strongest(relationshipScales?.[scale]) })).filter((item): item is { scale: KlineScale; point: KlinePoint } => Boolean(item.point));
  const relationshipPoint = relationshipEntries.sort((a, b) => pointWeight(b.point) - pointWeight(a.point))[0]?.point;
  const anchor = lifePoint && relationshipPoint ? (pointWeight(lifePoint) >= pointWeight(relationshipPoint) ? lifePoint : relationshipPoint) : lifePoint ?? relationshipPoint;
  const scaleLabel = relationshipEntries.find((item) => item.point === relationshipPoint)?.scale;
  const realityFacts = collectRealityFacts(question, conversation);
  const primaryFact = realityFacts.at(-1);
  const activeWindow = anchor ? dateText(anchor) : "等待生成序列";
  const rootEvidence = primaryFact ?? anchor?.evidence[0] ?? "序列盘证据将汇聚到这里。";
  const rootSource = primaryFact ? "现实事实 · 访谈" : scaleLabel ? `感情 · ${scaleLabel}线` : "人生 · 八字运年";
  const realityAssumptions = realityFacts.map((fact) => `访谈事实：${fact}`);
  return {
    root: { activeWindow, evidence: rootEvidence, source: rootSource },
    branches: [
      { key: "advance", title: "推进", assumptions: [...realityAssumptions, ...(lifePoint?.evidence.slice(0, 2) ?? [])].slice(0, 4), firstAction: primaryFact ? `围绕“${primaryFact}”做一个可在本周完成的最小动作。` : "把有利条件变成一个可兑现的动作。", cost: "承担推进后的资源与关系投入。", risks: ["把趋势误当作保证"], validationDate: lifePoint?.datetime ?? null, stopCondition: "关键条件连续两次未满足时，暂停扩大投入。" },
      { key: "verify", title: "验证", assumptions: [...realityAssumptions, ...(relationshipPoint?.evidence.slice(0, 2) ?? [])].slice(0, 4), firstAction: primaryFact ? `先为“${primaryFact}”补一条能被独立核验的事实。` : "先补一个事实，再决定是否承担更大代价。", cost: "接受延后决策带来的机会成本。", risks: ["因等待错过窗口"], validationDate: relationshipPoint?.datetime ?? null, stopCondition: "关键事实无法获得时，切换到保护路径。" },
      { key: "protect", title: "保护", assumptions: [...realityAssumptions, ...(anchor?.evidence.slice(0, 2) ?? [])].slice(0, 4), firstAction: primaryFact ? `为“${primaryFact}”设定一个不可越过的底线与退出条件。` : "降低不可逆承诺，保留退出与复盘的余地。", cost: "放弃一部分即时收益与确定感。", risks: ["过度防御导致停滞"], validationDate: anchor?.datetime ?? null, stopCondition: "退出条件不再成立且事实改善时，重新进入验证。" },
    ],
  };
};

function DecisionBranch({ branch, tone }: { branch: DecisionTreeSnapshot["branches"][number]; tone: "advance" | "verify" | "protect" }) {
  const supportingFact = branch.assumptions[0] || branch.risks[0] || "等待现实反馈补充证据";
  return <article className={`decision-tree__branch is-${tone}`}><header><span>{branch.title}</span><b>{branch.validationDate ? branch.validationDate.replace("T", " ") : "待验证"}</b></header><strong>{branch.firstAction}</strong><p>{supportingFact} · 停止条件：{branch.stopCondition}</p></article>;
}

export function DecisionTreePanel({ life, relationshipScales, question, conversation, embedded = false, savedSnapshot, savedVersion, onSave, saveLabel }: DecisionTreePanelProps) {
  const snapshot = buildDecisionTreeSnapshot(life, relationshipScales, question, conversation);
  const displayed = savedSnapshot ?? snapshot;
  const displayedBranches = (["advance", "verify", "protect"] as const).map((key, index) => displayed.branches.find((branch) => branch.key === key) ?? displayed.branches[index] ?? snapshot.branches[index]);
  return <section className={embedded ? "decision-tree-page decision-tree-page--embedded" : "decision-tree-page"} aria-label="命运决策树">
    <section className="decision-tree" aria-label="关键选择树">
      <header className="decision-tree__hero"><div><span>DECISION TREE / 选择结构{savedVersion ? ` · V${savedVersion}` : ""}</span><h2>命运给出条件，落子由你完成。</h2><p>这里不输出一个宿命答案。它把八字的长期结构、奇门的时间窗口和现实选择放到同一棵树上，让你看到每一步需要承担什么。</p></div><div className="decision-tree__anchor"><span>{savedSnapshot ? "已保存的关键窗口" : "当前关键窗口"}</span><strong>{displayed.root.activeWindow}</strong><small>{displayed.root.source}</small>{onSave ? <button type="button" onClick={() => onSave(snapshot)}>{saveLabel ?? (savedSnapshot ? "保存当前证据为新版本" : "保存这棵树")}</button> : null}</div></header>
      <div className="decision-tree__diagram">
        <div className="decision-tree__root"><span>证据起点</span><strong>{displayed.root.source}</strong><p>{displayed.root.evidence}</p></div>
        <div className="decision-tree__trunk" aria-hidden="true" />
        <div className="decision-tree__junction"><span>关键窗口</span><strong>{displayed.root.activeWindow}</strong><p>{displayed.root.evidence}</p></div>
        <div className="decision-tree__split" aria-hidden="true" />
        <div className="decision-tree__branches"><DecisionBranch branch={displayedBranches[0]} tone="advance" /><DecisionBranch branch={displayedBranches[1]} tone="verify" /><DecisionBranch branch={displayedBranches[2]} tone="protect" /></div>
      </div>
      <footer className="decision-tree__footer"><strong>胜天半子，不是逃离命盘。</strong><span>是看清每条路的代价后，仍然选择一条愿意承担的路。</span></footer>
    </section>
  </section>;
}
