"use client";

import type { KlinePoint, KlineScale, KlineSeries } from "@/lib/qimen/kline";
import type { AgentConversationMessage } from "@/lib/agent/chat";

export type DecisionTreeSnapshot = {
  root: { activeWindow: string; evidence: string; source: string };
  branches: Array<{ id?: string; key: string; title: string; assumptions: string[]; firstAction: string; cost: string; risks: string[]; validationDate: string | null; stopCondition: string; selectedAt?: string | null }>;
};

export type DecisionReadiness = {
  label: string;
  headline: string;
  nextStep: string;
  facts: string[];
  canChoose: boolean;
};

type DecisionTreePanelProps = { life: KlineSeries; relationshipScales?: Partial<Record<KlineScale, KlineSeries>>; question?: string; conversation?: readonly AgentConversationMessage[]; embedded?: boolean; savedSnapshot?: DecisionTreeSnapshot | null; savedVersion?: number | null; selectedBranchKey?: string | null; onSelectBranch?: (key: string) => void; onSave?: (snapshot: DecisionTreeSnapshot) => void; saveLabel?: string };

const pointWeight = (point: KlinePoint) => Math.abs(point.delta) * 2 + (point.high - point.low) * 0.45 + point.evidence.length * 0.7 + (point.keyPoint ? 4 : 0);
const strongest = (series: KlineSeries | undefined) => series?.points.reduce<KlinePoint | undefined>((best, point) => !best || pointWeight(point) > pointWeight(best) ? point : best, undefined);

const dateText = (point?: KlinePoint) => point ? point.datetime.replace("T", " ") : "等待序列";

const compactFact = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 80);

/**
 * Only the user's own words can become a reality fact.  Model output may
 * illuminate a question, but it is never treated as evidence for a branch.
 */
export const collectRealityFacts = (_question?: string, conversation: readonly AgentConversationMessage[] = []) => {
  const userMessages = conversation.filter((message) => message.role === "user");
  // The first user message names the issue.  Only later answers are facts;
  // the current unsent question is intentionally excluded from the tree.
  const facts = userMessages.slice(1)
    .map((message) => message.content)
    .map(compactFact)
    .filter(Boolean);
  return facts.filter((fact, index) => facts.indexOf(fact) === index).slice(-3);
};

/**
 * A decision is only ready when the user has supplied independently checkable
 * reality facts. This keeps the product useful without treating a chart or an
 * assistant answer as a substitute for evidence.
 */
export const buildDecisionReadiness = (
  question?: string,
  conversation: readonly AgentConversationMessage[] = [],
): DecisionReadiness => {
  const facts = collectRealityFacts(question, conversation);
  if (facts.length === 0) {
    return {
      label: "还不能下结论",
      headline: "先补一条现实事实，再谈哪条路更好。",
      nextStep: "回答对话里的第一个问题：现在已经确定发生了什么？",
      facts,
      canChoose: false,
    };
  }
  if (facts.length === 1) {
    return {
      label: "先验证，不急着选",
      headline: "已有一个事实；再找一条独立证据，判断会更可靠。",
      nextStep: "把这条事实交叉核验，或补充它会改变什么。",
      facts,
      canChoose: false,
    };
  }
  return {
    label: facts.length >= 3 ? "可以选择一条路" : "可以开始比较路径",
    headline: facts.length >= 3
      ? "条件已经足够具体，可以选一条愿意承担代价的路径。"
      : "已有两条事实；比较三条路的代价后，再决定是否落子。",
    nextStep: facts.length >= 3
      ? "打开判断树，选定一个本周能完成的最小动作，并设好停止条件。"
      : "再补一条会改变决定的关键事实，或先进入判断树做情景比较。",
    facts,
    canChoose: facts.length >= 3,
  };
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
  const realityFacts = collectRealityFacts(question, conversation);
  const primaryFact = realityFacts.at(-1);
  // Before the user has supplied a follow-up answer, there is no real-world
  // evidence to connect to a distant K-line point.  Show the interview state
  // honestly instead of manufacturing a "key window" from a future year.
  const isInterviewGrounded = Boolean(primaryFact);
  const activeWindow = isInterviewGrounded && anchor ? dateText(anchor) : "待访谈定位";
  const rootEvidence = primaryFact ?? "先补一条能独立核验的现实事实，再让盘面与趋势参与选择。";
  const rootSource = primaryFact ? "现实事实 · 访谈" : "尚待现实事实";
  const realityAssumptions = realityFacts.map((fact) => `访谈事实：${fact}`);
  return {
    root: { activeWindow, evidence: rootEvidence, source: rootSource },
    branches: [
      { key: "advance", title: "推进", assumptions: [...realityAssumptions, ...(isInterviewGrounded ? lifePoint?.evidence.slice(0, 2) ?? [] : [])].slice(0, 4), firstAction: primaryFact ? `围绕“${primaryFact}”做一个可在本周完成的最小动作。` : "先说清你已经拥有的条件，再判断是否值得推进。", cost: "承担推进后的资源与关系投入。", risks: ["把趋势误当作保证"], validationDate: isInterviewGrounded ? lifePoint?.datetime ?? null : null, stopCondition: "关键条件连续两次未满足时，暂停扩大投入。" },
      { key: "verify", title: "验证", assumptions: [...realityAssumptions, ...(isInterviewGrounded ? relationshipPoint?.evidence.slice(0, 2) ?? [] : [])].slice(0, 4), firstAction: primaryFact ? `先为“${primaryFact}”补一条能被独立核验的事实。` : "先补一个事实，再决定是否承担更大代价。", cost: "接受延后决策带来的机会成本。", risks: ["因等待错过窗口"], validationDate: isInterviewGrounded ? relationshipPoint?.datetime ?? null : null, stopCondition: "关键事实无法获得时，切换到保护路径。" },
      { key: "protect", title: "保护", assumptions: [...realityAssumptions, ...(isInterviewGrounded ? anchor?.evidence.slice(0, 2) ?? [] : [])].slice(0, 4), firstAction: primaryFact ? `为“${primaryFact}”设定一个不可越过的底线与退出条件。` : "先写下不可承受的损失与退出条件。", cost: "放弃一部分即时收益与确定感。", risks: ["过度防御导致停滞"], validationDate: isInterviewGrounded ? anchor?.datetime ?? null : null, stopCondition: "退出条件不再成立且事实改善时，重新进入验证。" },
    ],
  };
};

function DecisionBranch({ branch, tone, selected, onSelect }: { branch: DecisionTreeSnapshot["branches"][number]; tone: "advance" | "verify" | "protect"; selected: boolean; onSelect?: () => void }) {
  const supportingFact = branch.assumptions[0] || branch.risks[0] || "等待现实反馈补充证据";
  const detail = <details className="decision-tree__branch-detail"><summary>条件、代价与风险</summary><dl><div><dt>成立条件</dt><dd>{branch.assumptions.length ? branch.assumptions.join("；") : "等待现实反馈补充条件"}</dd></div><div><dt>需要承担</dt><dd>{branch.cost}</dd></div><div><dt>主要风险</dt><dd>{branch.risks.join("；") || "尚待补充"}</dd></div><div><dt>停止条件</dt><dd>{branch.stopCondition}</dd></div></dl></details>;
  const content = <><header><span>{branch.title}</span><b>{selected ? "已选择" : branch.validationDate ? branch.validationDate.replace("T", " ") : "待验证"}</b></header><strong>{branch.firstAction}</strong><p>{supportingFact}</p>{detail}</>;
  return onSelect ? <button type="button" className={`decision-tree__branch is-${tone}${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={onSelect}>{content}</button> : <article className={`decision-tree__branch is-${tone}${selected ? " is-selected" : ""}`}>{content}</article>;
}

export function DecisionTreePanel({ life, relationshipScales, question, conversation, embedded = false, savedSnapshot, savedVersion, selectedBranchKey, onSelectBranch, onSave, saveLabel }: DecisionTreePanelProps) {
  const snapshot = buildDecisionTreeSnapshot(life, relationshipScales, question, conversation);
  const displayed = savedSnapshot ?? snapshot;
  const displayedBranches = (["advance", "verify", "protect"] as const).map((key, index) => displayed.branches.find((branch) => branch.key === key) ?? displayed.branches[index] ?? snapshot.branches[index]);
  return <section className={embedded ? "decision-tree-page decision-tree-page--embedded" : "decision-tree-page"} aria-label="三种可能路径">
    <section className="decision-tree" aria-label="关键选择树">
      <header className="decision-tree__hero"><div><span>可能路径{savedVersion ? ` · 已保存 ${savedVersion} 次` : ""}</span><h2>看清条件，再决定怎样走。</h2><p>这里不替你宣布结果。它把长期趋势、当下时机与现实选择放在一起，让你看到每一步要承担什么。</p></div><div className="decision-tree__anchor"><span>{savedSnapshot ? "上次保存的关键时间" : "当前关键时间"}</span><strong>{displayed.root.activeWindow}</strong><small>{displayed.root.source}</small>{onSave ? <button type="button" onClick={() => onSave(snapshot)}>{saveLabel ?? (savedSnapshot ? "保存当前判断" : "保存判断")}</button> : null}</div></header>
      <div className="decision-tree__diagram">
        <div className="decision-tree__root"><span>从你的现实开始</span><strong>{displayed.root.source}</strong><p>{displayed.root.evidence}</p></div>
        <div className="decision-tree__trunk" aria-hidden="true" />
        <div className="decision-tree__junction"><span>关键窗口</span><strong>{displayed.root.activeWindow}</strong><p>{displayed.root.evidence}</p></div>
        <div className="decision-tree__split" aria-hidden="true" />
        <div className="decision-tree__branches" aria-label="选择一条决策路径"><DecisionBranch branch={displayedBranches[0]} tone="advance" selected={selectedBranchKey === displayedBranches[0].key} onSelect={onSelectBranch ? () => onSelectBranch(displayedBranches[0].key) : undefined} /><DecisionBranch branch={displayedBranches[1]} tone="verify" selected={selectedBranchKey === displayedBranches[1].key} onSelect={onSelectBranch ? () => onSelectBranch(displayedBranches[1].key) : undefined} /><DecisionBranch branch={displayedBranches[2]} tone="protect" selected={selectedBranchKey === displayedBranches[2].key} onSelect={onSelectBranch ? () => onSelectBranch(displayedBranches[2].key) : undefined} /></div>
      </div>
      <footer className="decision-tree__footer"><strong>胜天半子，不是替你做选择。</strong><span>是看清每条路的代价后，选择一条愿意承担的路。</span></footer>
    </section>
  </section>;
}
