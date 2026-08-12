"use client";

import { CalendarClock, ChevronRight, CircleDot, GitBranch, LockKeyhole, Orbit, PanelRightOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AGENT_INTERVIEW_START_LABEL, type AgentConversationMessage } from "@/lib/agent/chat";
import type { KlineScale, KlineSeries } from "@/lib/qimen/kline";
import type { WorkbenchMode } from "@/lib/workbench/types";
import { DecisionTreePanel, type DecisionTreeSnapshot } from "./decision-tree-panel";
import { AgentReviewPanel } from "./agent-review-panel";

type AgentCommandCenterProps = {
  mode: WorkbenchMode;
  onModeChange: (mode: WorkbenchMode) => void;
  inspector: ReactNode;
  life: KlineSeries;
  relationshipScales?: Partial<Record<KlineScale, KlineSeries>>;
  question: string;
  conversationCount: number;
  canPersist: boolean;
  evidenceText: string;
  evidenceJson: string;
  conversation: AgentConversationMessage[];
  accessToken?: string;
  onLogin: () => void;
  onCaseRestore: (value: { question: string; conversation: AgentConversationMessage[]; mode?: WorkbenchMode; evidence?: { sourceText:string; structuredJson:unknown } | null }) => void;
};

type SavedCase = { id:string; title:string; question:string; status:"active"|"decided"|"archived"; deadline:string|null; createdAt:string; updatedAt:string };
type SavedTree = { version: number; snapshot: DecisionTreeSnapshot };

const SOURCE_MODES: Array<{ mode: WorkbenchMode; label: string; note: string }> = [
  { mode: "qimen", label: "奇门", note: "当前时机" },
  { mode: "bazi", label: "八字", note: "长期结构" },
  { mode: "ziwei", label: "紫微", note: "宫位关系" },
  { mode: "combined", label: "三盘", note: "交叉验证" },
];

export function AgentCommandCenter({ mode, onModeChange, inspector, life, relationshipScales, question, conversationCount, canPersist, evidenceText, evidenceJson, conversation, accessToken, onLogin, onCaseRestore }: AgentCommandCenterProps) {
  const [evidenceTab, setEvidenceTab] = useState<"reality" | "qimen" | "bazi" | "ziwei" | "kline">("reality");
  const [cases, setCases] = useState<SavedCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState("");
  const [savedTurnCount, setSavedTurnCount] = useState(0);
  const [persistenceStatus, setPersistenceStatus] = useState("");
  const [treeSaving, setTreeSaving] = useState(false);
  const [savedTree, setSavedTree] = useState<SavedTree | null>(null);
  const [selectedBranchKey, setSelectedBranchKey] = useState<string | null>(null);
  const [branchSaving, setBranchSaving] = useState(false);
  const [savedEvidence, setSavedEvidence] = useState<{ mode:string; sourceText:string; structuredJson:unknown } | null>(null);
  const autoSavingRef = useRef(false);
  const firstUserQuestion = conversation.find((message) => message.role === "user")?.content.trim();
  const persistedQuestion = question.trim() || (firstUserQuestion === AGENT_INTERVIEW_START_LABEL ? "" : firstUserQuestion) || "未命名人生议题";
  const issueTitle = persistedQuestion === "未命名人生议题" ? "新的决策议题" : persistedQuestion;
  const activeCase = cases.find((item) => item.id === activeCaseId) ?? null;
  const headers = useMemo(() => ({ Authorization: `Bearer ${accessToken ?? ""}`, "Content-Type": "application/json" }), [accessToken]);
  const interviewRound = Math.floor(conversationCount / 2);

  const restoreCase = useCallback(async (item: SavedCase) => {
    if (!accessToken) return;
    setPersistenceStatus("正在恢复工作区…");
    const authorization = { Authorization: `Bearer ${accessToken}` };
    const [turnResponse, treeResponse, evidenceResponse] = await Promise.all([
      fetch(`/api/agent/cases/${item.id}/turns`, { headers: authorization, cache: "no-store" }),
      fetch(`/api/agent/cases/${item.id}/tree`, { headers: authorization, cache: "no-store" }),
      fetch(`/api/agent/cases/${item.id}/evidence`, { headers: authorization, cache: "no-store" }),
    ]);
    const turnData = await turnResponse.json().catch(() => ({})) as { turns?: Array<{ role:"user"|"assistant"; content:string }>; error?:string };
    if (!turnResponse.ok || !turnData.turns) { setPersistenceStatus(turnData.error || "恢复访谈失败"); return; }
    const treeData = await treeResponse.json().catch(() => ({})) as { version?:number|null; tree?: { root?:DecisionTreeSnapshot["root"]; branches?:DecisionTreeSnapshot["branches"] } | null };
    if (treeResponse.ok && treeData.version && treeData.tree?.root && Array.isArray(treeData.tree.branches)) {
      setSavedTree({ version: treeData.version, snapshot: { root: treeData.tree.root, branches: treeData.tree.branches } });
      setSelectedBranchKey(treeData.tree.branches.find((branch) => branch.selectedAt)?.key ?? null);
    } else { setSavedTree(null); setSelectedBranchKey(null); }
    const evidenceData = await evidenceResponse.json().catch(() => ({})) as { evidence?: { mode:string; sourceText:string; structuredJson:unknown } | null };
    setSavedEvidence(evidenceResponse.ok ? evidenceData.evidence ?? null : null);
    const restoredConversation = turnData.turns.map((turn) => ({ role: turn.role, content: turn.content }));
    setActiveCaseId(item.id);
    setSavedTurnCount(restoredConversation.length);
    const restoredMode = (["qimen", "bazi", "ziwei", "combined", "research"] as WorkbenchMode[]).includes(evidenceData.evidence?.mode as WorkbenchMode) ? evidenceData.evidence?.mode as WorkbenchMode : mode;
    onCaseRestore({ question: item.question, conversation: restoredConversation, mode: restoredMode, evidence: evidenceData.evidence ?? null });
    setPersistenceStatus(treeData.version ? `已恢复服务器工作区 · 决策树 V${treeData.version}` : "已恢复服务器工作区");
  }, [accessToken, mode, onCaseRestore]);

  useEffect(() => {
    if (!canPersist || !accessToken) return;
    let cancelled = false;
    fetch("/api/agent/cases", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?:string }).error || "读取失败"); return response.json() as Promise<{ cases:SavedCase[] }>; })
      .then((data) => { if (!cancelled) { setCases(data.cases); const first = data.cases[0]; if (first) void restoreCase(first); } })
      .catch((error) => { if (!cancelled) setPersistenceStatus(error instanceof Error ? error.message : "读取议题失败"); });
    return () => { cancelled = true; };
  }, [accessToken, canPersist, restoreCase]);

  const createWorkspace = useCallback(async (preserveConversation = false): Promise<string | null> => {
    if (!accessToken) { setPersistenceStatus("请先登录平台账户。"); return null; }
    setPersistenceStatus("正在建立安全工作区…");
    const response = await fetch("/api/agent/cases", { method:"POST", headers, body:JSON.stringify({ title:issueTitle.slice(0,120), question:persistedQuestion.slice(0,2000) }) });
    const data = await response.json().catch(() => ({})) as { case?:SavedCase; error?:string };
    if (!response.ok || !data.case) { setPersistenceStatus(data.error || "创建失败"); return null; }
    let snapshotSaved = false;
    let savedSnapshot: { sourceText: string; structuredJson: unknown } | null = null;
    try {
      const structuredJson = JSON.parse(evidenceJson);
      const evidenceResponse = await fetch(`/api/agent/cases/${data.case.id}/evidence`, { method: "POST", headers, body: JSON.stringify({ mode, sourceText: evidenceText, structuredJson }) });
      snapshotSaved = evidenceResponse.ok;
      if (snapshotSaved) {
        savedSnapshot = { sourceText: evidenceText, structuredJson };
        setSavedEvidence({ mode, ...savedSnapshot });
      }
    } catch { snapshotSaved = false; }
    setCases((current) => [data.case!, ...current]); setActiveCaseId(data.case.id); setSavedTurnCount(0); setSavedTree(null); setSelectedBranchKey(null); if (!preserveConversation) onCaseRestore({ question: data.case.question, conversation: [], mode, evidence: savedSnapshot }); setPersistenceStatus(snapshotSaved ? "工作区与盘面证据已写入服务器" : "工作区已建立，盘面证据尚未保存");
    return data.case.id;
  }, [accessToken, evidenceJson, evidenceText, headers, issueTitle, mode, onCaseRestore, persistedQuestion]);

  const saveWorkspace = useCallback(async () => {
    if (!accessToken) { setPersistenceStatus("请先登录平台账户。"); return; }
    let caseId = activeCaseId;
    if (!caseId) { caseId = await createWorkspace(true) ?? ""; if (!caseId) return; }
    setPersistenceStatus("正在保存访谈…");
    for (const [offset, message] of conversation.slice(savedTurnCount).entries()) {
      const absoluteIndex = savedTurnCount + offset;
      const phase = ["issue", "facts", "constraints", "options", "costs", "action"][Math.min(5, Math.floor(absoluteIndex / 2))];
      const response = await fetch(`/api/agent/cases/${caseId}/turns`, { method:"POST", headers, body:JSON.stringify({ role:message.role, content:message.content, phase }) });
      if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?:string }; setPersistenceStatus(body.error || "保存访谈失败"); return; }
    }
    setSavedTurnCount(conversation.length); setPersistenceStatus("已保存到正式工作区");
  }, [accessToken, activeCaseId, conversation, createWorkspace, headers, savedTurnCount]);
  useEffect(() => {
    if (!canPersist || !accessToken || conversation.length === 0 || autoSavingRef.current || (activeCaseId && conversation.length <= savedTurnCount)) return;
    autoSavingRef.current = true;
    void saveWorkspace().finally(() => { autoSavingRef.current = false; });
  }, [accessToken, activeCaseId, canPersist, conversation.length, savedTurnCount, saveWorkspace]);
  const saveDecisionTree = async (snapshot: DecisionTreeSnapshot) => {
    if (treeSaving) return;
    if (!accessToken) { setPersistenceStatus("请先登录平台账户后保存决策树。"); return; }
    let caseId = activeCaseId;
    if (!caseId) { caseId = await createWorkspace() ?? ""; if (!caseId) return; }
    setTreeSaving(true); setPersistenceStatus("正在保存决策树版本…");
    try {
      const response = await fetch(`/api/agent/cases/${caseId}/tree`, { method: "POST", headers, body: JSON.stringify(snapshot) });
      const data = await response.json().catch(() => ({})) as { tree?: { version?: number; branches?: Array<{ id: string; key: string }> }; error?: string };
      if (response.ok && data.tree?.version) {
        const branchIds = new Map((data.tree.branches ?? []).map((branch) => [branch.key, branch.id]));
        setSavedTree({ version: data.tree.version, snapshot: { ...snapshot, branches: snapshot.branches.map((branch) => ({ ...branch, id: branchIds.get(branch.key) })) } });
        setSelectedBranchKey(null);
        setPersistenceStatus(`决策树已保存 · V${data.tree.version}`);
      } else setPersistenceStatus(data.error || "保存决策树失败");
    } finally { setTreeSaving(false); }
  };
  const selectBranch = async (key: string) => {
    const branch = savedTree?.snapshot.branches.find((item) => item.key === key);
    setSelectedBranchKey(key);
    if (!branch?.id || !activeCaseId || !accessToken) { setPersistenceStatus("已在本地选择；保存决策树后可写入工作区。"); return; }
    if (branchSaving) return;
    setBranchSaving(true); setPersistenceStatus("正在写入当前路径…");
    try {
      const response = await fetch(`/api/agent/cases/${activeCaseId}/tree/selection`, { method: "POST", headers, body: JSON.stringify({ branchId: branch.id }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) setPersistenceStatus(data.error || "保存当前路径失败"); else setPersistenceStatus("当前路径已写入工作区");
    } finally { setBranchSaving(false); }
  };
  const evidencePreview = evidenceTab === "reality"
    ? `当前议题：${issueTitle}\n已完成 ${interviewRound} 轮访谈；事实、约束与代价会随回答逐步写入决策树。`
    : evidenceTab === "kline"
      ? [`人生 K 线：${life.points.length} 个运年点`, ...life.keyPoints.slice(0, 3).map((point) => `${point.datetime.slice(0, 10)} · ${point.phase} · ${point.keyPoint || "结构变化"}`)].join("\n")
      : (savedEvidence?.sourceText ?? evidenceText).split("\n").filter(Boolean).slice(0, 8).join("\n") || "当前盘面尚无可用证据。";
  const selectEvidence = (tab: "reality" | "qimen" | "bazi" | "ziwei" | "kline") => {
    setEvidenceTab(tab);
    if (tab === "qimen" || tab === "bazi" || tab === "ziwei") onModeChange(tab);
  };
  return <main className="agent-command" aria-label="胜天半子 Agent 决策控制室">
    <header className="agent-command__bar">
      <div><span>胜天半子 / AGENT</span><strong>人生决策控制室</strong></div>
      <div className="agent-command__bar-status"><span><CircleDot size={14} /> {persistenceStatus || "观测进行中"}</span>{canPersist ? <button type="button" onClick={saveWorkspace}>保存这一局 <ChevronRight size={15} /></button> : <button type="button" onClick={onLogin}>登录后保存 <ChevronRight size={15} /></button>}</div>
    </header>
    <div className="agent-command__grid">
      <aside className="agent-command__cases">
        <div className="agent-command__section-title"><span>人生议题</span><button type="button" aria-label="新建人生议题" onClick={() => { void createWorkspace(); }}>+</button></div>
        <article className="agent-command__case is-current"><small>{activeCaseId ? "服务器工作区" : "当前临时工作区"}</small><strong>{activeCase?.title ?? issueTitle}</strong><p><CalendarClock size={13} /> {activeCase?.deadline ? new Date(activeCase.deadline).toLocaleDateString("zh-CN") : "尚未设置决策期限"}</p></article>
        {(canPersist ? cases : []).filter((item) => item.id !== activeCaseId).slice(0,4).map((item) => <button type="button" className="agent-command__case agent-command__case-button" key={item.id} onClick={() => { void restoreCase(item); }}><small>{new Date(item.updatedAt).toLocaleDateString("zh-CN")}</small><strong>{item.title}</strong></button>)}
        <div className="agent-command__section-title is-secondary"><span>证据来源</span><PanelRightOpen size={14} /></div>
        <nav className="agent-command__sources" aria-label="选择 Agent 证据来源">{SOURCE_MODES.map((source) => <button type="button" key={source.mode} className={mode === source.mode ? "is-active" : ""} onClick={() => onModeChange(source.mode)}><strong>{source.label}</strong><span>{source.note}</span></button>)}</nav>
        <div className="agent-command__privacy"><LockKeyhole size={15} /><span>{canPersist ? "已登录：议题、访谈与决策树可保存" : "当前为临时工作区；登录后才可保存议题"}</span></div>
      </aside>
      <section className="agent-command__interview">
        <div className="agent-command__interview-head"><div><span>AI 访谈</span><h1>先把问题问清楚。</h1><p>每次只处理一个问题。事实、限制、选项与代价会逐步成为右侧的选择结构。</p></div><strong>{interviewRound}<small>轮对话</small></strong></div>
        <div className="agent-command__steps" aria-label="人生议题访谈步骤">{["议题", "事实", "约束", "选项", "代价", "行动"].map((label, index) => <span className={index <= Math.min(5, interviewRound) ? "is-active" : ""} key={label}><b>{index + 1}</b>{label}</span>)}</div>
        <div className="agent-command__conversation">{inspector}</div>
      </section>
      <aside className="agent-command__model">
        <div className="agent-command__model-head"><div><span><GitBranch size={14} /> 可能性树</span><strong>选择不是结论，是可复盘的路径。</strong></div><Orbit size={20} /></div>
        <DecisionTreePanel life={life} relationshipScales={relationshipScales} question={question} conversation={conversation} embedded savedSnapshot={savedTree?.snapshot} savedVersion={savedTree?.version} selectedBranchKey={selectedBranchKey} onSelectBranch={selectBranch} onSave={canPersist ? saveDecisionTree : undefined} saveLabel={treeSaving ? "正在存档…" : savedTree ? "保存当前证据为新版本" : "保存这棵树"} />
        <section className="agent-command__evidence"><div><strong>证据抽屉</strong><span>只有与当前议题有关的字段才会进入树节点。</span></div><div className="agent-command__evidence-tabs"><button type="button" className={evidenceTab === "reality" ? "is-active" : ""} onClick={() => selectEvidence("reality")}>现实事实</button><button type="button" className={evidenceTab === "bazi" ? "is-active" : ""} onClick={() => selectEvidence("bazi")}>八字</button><button type="button" className={evidenceTab === "qimen" ? "is-active" : ""} onClick={() => selectEvidence("qimen")}>奇门</button><button type="button" className={evidenceTab === "ziwei" ? "is-active" : ""} onClick={() => selectEvidence("ziwei")}>紫微</button><button type="button" className={evidenceTab === "kline" ? "is-active" : ""} onClick={() => selectEvidence("kline")}>K 线</button></div><pre className="agent-command__evidence-preview">{evidencePreview}</pre></section>
        <AgentReviewPanel caseId={activeCaseId} accessToken={accessToken} selectedBranchId={savedTree?.snapshot.branches.find((branch) => branch.key === selectedBranchKey)?.id ?? null} />
      </aside>
    </div>
  </main>;
}
