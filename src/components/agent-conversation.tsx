"use client";
import { useEffect, useRef, useState } from "react";
import { AssistantRuntimeProvider, useLocalRuntime, ThreadPrimitive, MessagePrimitive, ComposerPrimitive, ActionBarPrimitive, ErrorPrimitive, type ChatModelAdapter, type TextMessagePartProps } from "@assistant-ui/react";
import { AgentMarkdown } from "./agent-markdown";
import type { InspectorPanelProps } from "./inspector-panel";
import type { AgentConversationMessage, AgentConversationMode, AgentStreamEvent, AgentToolEvent } from "@/lib/agent/chat";
import styles from "./agent-conversation.module.css";


function TextPart({ text }: TextMessagePartProps) { return <AgentMarkdown content={text} />; }
function UserMessage() { return <MessagePrimitive.Root className={styles.user}><small>你 / QUESTION</small><MessagePrimitive.Parts components={{Text:TextPart}} /></MessagePrimitive.Root>; }
function AssistantMessage() { return <MessagePrimitive.Root className={styles.answer}><small>知几 / ASSISTANT</small><MessagePrimitive.Parts components={{Text:TextPart}} /><MessagePrimitive.Error><ErrorPrimitive.Root className={styles.error}><ErrorPrimitive.Message /></ErrorPrimitive.Root></MessagePrimitive.Error><ActionBarPrimitive.Root className={styles.messageActions}><ActionBarPrimitive.Copy>复制</ActionBarPrimitive.Copy><ActionBarPrimitive.Reload>重新生成 ↻</ActionBarPrimitive.Reload></ActionBarPrimitive.Root></MessagePrimitive.Root>; }

export function AgentConversation(props: InspectorPanelProps) {
  const latest = useRef(props);
  useEffect(() => { latest.current=props; },[props]);
  const storageKey = `qmdj-agent-history:${props.mode}`;
  const activeSessionId = useRef<string | null>(null);
  const [activeSessionIdState, setActiveSessionIdState] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedSessions, setSavedSessions] = useState<Array<{ id: string; title: string; messages: AgentConversationMessage[]; updatedAt: number; status?: "active" | "decided" | "archived" }>>(() => {
    if (typeof window === "undefined") return [];
    try { const value = JSON.parse(localStorage.getItem(storageKey) || "[]"); return Array.isArray(value) ? value.slice(0, 20) : []; } catch { return []; }
  });
  const [recalcDate, setRecalcDate] = useState("");
  const [conversationMode, setConversationMode] = useState<AgentConversationMode>(props.conversationMode ?? "free");
  const [toolStatus, setToolStatus] = useState("");
  const [toolEvents, setToolEvents] = useState<AgentToolEvent[]>(() => [...(props.toolEvents ?? [])]);
  const [syncStatus, setSyncStatus] = useState<"local" | "syncing" | "synced" | "failed">(props.platformStatus === "authenticated" ? "syncing" : "local");
  const cloudLoaded = useRef(false);
  useEffect(() => {
    if (props.platformStatus !== "authenticated" || !props.agentStreamConfig || cloudLoaded.current) return;
    cloudLoaded.current = true;
    setSyncStatus("syncing");
    void (async () => {
      try {
        const headers = await props.agentStreamConfig?.requestHeaders();
        const response = await fetch("/api/agent/cases", { headers });
        if (!response.ok) { setSyncStatus("failed"); return; }
        const result = await response.json() as { cases?: Array<{ id: string; title: string; updatedAt: string; status?: "active" | "decided" | "archived" }> };
        const cases = result.cases ?? [];
        const cloud = await Promise.all(cases.slice(0, 20).map(async (item) => {
          const turnsResponse = await fetch(`/api/agent/cases/${item.id}/turns`, { headers });
          if (!turnsResponse.ok) return null;
          const turnsResult = await turnsResponse.json() as { turns?: Array<{ role: "user" | "assistant"; content: string }> };
          const messages = (turnsResult.turns ?? []).map(({ role, content }) => ({ role, content }));
          return messages.length ? { id: item.id, title: item.title, messages, updatedAt: new Date(item.updatedAt).getTime(), status: item.status } : null;
        }));
        setSavedSessions((current) => {
          const merged = [...cloud.filter(Boolean) as Array<{ id: string; title: string; messages: AgentConversationMessage[]; updatedAt: number; status?: "active" | "decided" | "archived" }>, ...current].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 20);
          localStorage.setItem(storageKey, JSON.stringify(merged));
          return merged;
        });
        setSyncStatus("synced");
      } catch { setSyncStatus("failed"); /* local sessions remain available when cloud recovery fails */ }
    })();
  }, [props.platformStatus, props.agentStreamConfig, storageKey]);
  const updateCloudCase = async (id: string, input: { title?: string; status?: "active" | "decided" | "archived" }) => {
    const config = latest.current.agentStreamConfig;
    if (latest.current.platformStatus !== "authenticated" || !config) return;
    const caseKey = `${storageKey}:case:${id}`;
    const caseId = localStorage.getItem(caseKey) ?? id;
    try {
      const response = await fetch(`/api/agent/cases/${caseId}`, { method: "PATCH", headers: { ...(await config.requestHeaders()), "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) throw new Error("case update failed");
      setSyncStatus("synced");
    } catch { setSyncStatus("failed"); /* local state remains usable when the session expires */ }
  };
  const renameSession = (session: { id: string; title: string }) => {
    const title = window.prompt("会话名称", session.title)?.trim();
    if (!title || title === session.title) return;
    setSavedSessions((items) => { const next = items.map((item) => item.id === session.id ? { ...item, title } : item); localStorage.setItem(storageKey, JSON.stringify(next)); return next; });
    void updateCloudCase(session.id, { title });
  };
  const archiveSession = (session: { id: string }) => {
    setSavedSessions((items) => { const next = items.map((item) => item.id === session.id ? { ...item, status: "archived" as const } : item); localStorage.setItem(storageKey, JSON.stringify(next)); return next; });
    void updateCloudCase(session.id, { status: "archived" });
  };
  const deleteSession = async (session: { id: string }) => {
    setSavedSessions((items) => { const next = items.filter((item) => item.id !== session.id); localStorage.setItem(storageKey, JSON.stringify(next)); return next; });
    try {
      const config = latest.current.agentStreamConfig;
      const caseId = localStorage.getItem(`${storageKey}:case:${session.id}`) ?? session.id;
      if (latest.current.platformStatus === "authenticated" && config) await fetch(`/api/agent/cases/${caseId}`, { method: "DELETE", headers: await config.requestHeaders() });
    } catch { /* local deletion still applies */ }
  };
  const saveSession = async (messages: AgentConversationMessage[]) => {
    if (!messages.length) return;
    const title = messages.find((m) => m.role === "user")?.content.slice(0, 32) || "新会话";
    const key = messages.find((m) => m.role === "user")?.content ?? "";
    const sessionId = activeSessionId.current ?? crypto.randomUUID();
    activeSessionId.current = sessionId;
    setActiveSessionIdState(sessionId);
    const next = [{ id: sessionId, title, messages, updatedAt: Date.now(), status: "active" as const }, ...savedSessions.filter((session) => session.id !== sessionId)].slice(0, 20);
    setSavedSessions(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* optional */ }
    const config = latest.current.agentStreamConfig;
    if (latest.current.platformStatus !== "authenticated" || !config) { setSyncStatus("local"); return; }
    setSyncStatus("syncing");
    try {
      const headers = { ...(await config.requestHeaders()), "Content-Type": "application/json" };
      const caseKey = `${storageKey}:case:${next[0].id}`;
      let caseId = localStorage.getItem(caseKey);
      if (!caseId) {
        const response = await fetch("/api/agent/cases", { method: "POST", headers, body: JSON.stringify({ title: title || "盘面会话", question: key || "盘面分析会话" }) });
        if (!response.ok) return;
        const result = await response.json();
        caseId = result.case?.id;
        if (!caseId) return;
        localStorage.setItem(caseKey, caseId);
      }
      const cursorKey = `${caseKey}:turns`;
      const cursor = Number(localStorage.getItem(cursorKey) || "0");
      for (const message of messages.slice(cursor)) {
        const response = await fetch(`/api/agent/cases/${caseId}/turns`, { method: "POST", headers, body: JSON.stringify({ role: message.role, content: message.content, phase: "issue" }) });
        if (!response.ok) break;
        localStorage.setItem(cursorKey, String(Number(localStorage.getItem(cursorKey) || "0") + 1));
      }
      const evidenceResponse = await fetch(`/api/agent/cases/${caseId}/evidence`, { method: "POST", headers, body: JSON.stringify({ mode: latest.current.mode, sourceText: latest.current.structuredText, structuredJson: JSON.parse(latest.current.jsonPayload || "{}") }) });
      if (!evidenceResponse.ok) throw new Error("evidence sync failed");
      setSyncStatus("synced");
    } catch { setSyncStatus("failed"); /* local history remains available if the platform session expires */ }
  };
  const [adapter] = useState<ChatModelAdapter>(() => ({
    async *run({messages,abortSignal}) {
      const current=latest.current;
      const config=current.agentStreamConfig;
      const history=messages.filter(m=>m.role==="user"||m.role==="assistant").map(m=>({role:m.role as "user"|"assistant",content:m.content.filter(p=>p.type==="text").map(p=>p.text).join("")})).filter(m=>m.content);
      const question=history.at(-1)?.content ?? "";
      if(!config) { current.onAgentQuestionChange(question); current.onAgentAnalyze(question); throw new Error("请完成权益开通后，点击重新生成继续本次问题。"); }
      config.onStart();
      let text="";
      try {
        const response=await fetch("/api/agent",{method:"POST",signal:abortSignal,headers:{...(await config.requestHeaders()),"Content-Type":"application/json","X-Agent-Stream":"1"},body:JSON.stringify({...config.requestBody,conversationMode,question,history:history.slice(0,-1).slice(-16).map(m=>({...m,content:m.content.slice(-4000)}))})});
        if(!response.ok) {const body=await response.json().catch(()=>({}));throw new Error(body.error || "对话请求失败，请重试。");}
        if(!response.body) throw new Error("未收到回答流。");
        const reader=response.body.getReader(); const decoder=new TextDecoder(); let pending="";
        try {
          while(true) {
            const chunk=await reader.read();
            if(chunk.done) break;
            pending += decoder.decode(chunk.value,{stream:true});
            const lines=pending.split("\n"); pending=lines.pop() ?? "";
            for(const line of lines) {
              if(!line.trim()) continue;
              const event=JSON.parse(line) as AgentStreamEvent;
              if (event.type === "tool_start" || event.type === "tool_result" || event.type === "chart_update") {
                setToolEvents((current) => [...current, event].slice(-8));
                config.onToolEvent?.(event);
                current.onToolEvent?.(event);
              }
              if(event.type === "text_delta") { text += event.text; yield {content:[{type:"text",text}]}; }
              if(event.type === "tool_start") setToolStatus(`正在调用 ${event.toolName}…`);
              if(event.type === "tool_result") setToolStatus(event.status === "error" ? `工具失败：${event.summary}` : event.summary);
              if(event.type === "chart_update") { setToolStatus(event.summary); config.onChartContextUpdate?.(event); }
              if(event.type === "message_done") setToolStatus("");
              if(event.type === "error") throw new Error(event.message);
            }
          }
          pending += decoder.decode();
          if(pending.trim()) {
            const event=JSON.parse(pending) as AgentStreamEvent;
            if(event.type === "text_delta") { text += event.text; yield {content:[{type:"text",text}]}; }
          }
        } finally { reader.releaseLock(); }
        if(abortSignal.aborted) return;
        if(!text.trim()) throw new Error("未收到有效回答，请重试。");
        yield {content:[{type:"text",text}]};
        const completed = [...history,{role:"assistant",content:text}] as AgentConversationMessage[];
        config.onFinish(completed);
        void saveSession(completed);
      } catch(error) {
        config.onError(abortSignal.aborted ? "已停止生成，可以继续追问或重新生成。" : error instanceof Error ? error.message : "对话中断");
        if(!abortSignal.aborted) throw error;
      } finally { if(abortSignal.aborted) { config.onFinish(text ? [...history,{role:"assistant",content:text}] : history,false); config.onError("已停止生成，可以继续追问或重新生成。"); } }
    }
  }));
  const runtime=useLocalRuntime(adapter,{initialMessages:props.agentConversation.map(m=>({role:m.role,content:m.content}))});
  const quickPrompts = Array.from(new Set([
    ...props.agentFollowUps,
    ...props.agentAngles.slice(0, 4).map((angle) => angle.question),
  ])).slice(0, 6);
  useEffect(()=>{if(props.agentConversation.length && !runtime.thread.getState().messages.length) runtime.thread.reset(props.agentConversation.map(m=>({role:m.role,content:m.content})));},[props.agentConversation,runtime]);
  // External chart/map suggestions populate the same composer; they do not submit twice.
  useEffect(()=>{ if(props.agentQuestion) runtime.thread.composer.setText(props.agentQuestion); },[props.agentQuestion,runtime]);
  return <AssistantRuntimeProvider runtime={runtime}><ThreadPrimitive.Root className={styles.root}>
    <header className={styles.head}><div><small>知几 / DIALOGUE</small><h3>{props.agentTitle ?? "盘面解读"}</h3></div><div className={styles.headActions}><span className={styles.syncStatus}>{syncStatus === "synced" ? "云端已同步" : syncStatus === "syncing" ? "同步中" : syncStatus === "failed" ? "云端同步失败，已保留本地草稿" : "本地会话"}</span><button type="button" onClick={() => setHistoryOpen((value) => !value)}>历史会话</button><span>{props.agentUsageAvailable>0 ? `余 ${props.agentUsageAvailable} 轮` : "未开通"}</span></div></header>
    {historyOpen ? <aside className={styles.history}><div className={styles.historyHead}><strong>历史会话</strong><button type="button" onClick={() => { activeSessionId.current = null; setActiveSessionIdState(null); runtime.thread.reset([]); setHistoryOpen(false); }}>新建</button></div>{savedSessions.length ? savedSessions.map((session) => <div className={`${styles.historyRow} ${activeSessionIdState === session.id ? styles.historyCurrent : ""}`} key={session.id}><button type="button" className={styles.historyItem} onClick={() => { activeSessionId.current = session.id; setActiveSessionIdState(session.id); runtime.thread.reset(session.messages.map((m) => ({ role: m.role, content: m.content }))); setHistoryOpen(false); }}><strong>{session.title}</strong><small>{activeSessionIdState === session.id ? "当前会话 · " : ""}{session.status === "archived" ? "已归档 · " : ""}{new Date(session.updatedAt).toLocaleString("zh-CN")}</small></button><div className={styles.historyActions}><button type="button" aria-label="重命名会话" onClick={() => renameSession(session)}>改名</button><button type="button" aria-label="归档会话" onClick={() => archiveSession(session)}>归档</button><button type="button" aria-label="删除会话" onClick={() => void deleteSession(session)}>删除</button></div></div>) : <small className={styles.historyEmpty}>暂无历史会话</small>}</aside> : null}
    <div className={styles.context}><span>◈ {({qimen:"奇门",bazi:"八字",ziwei:"紫微",combined:"三盘联合",research:"术数研究",astro:"星盘", "human-design":"人类图", tarot:"塔罗"})[props.mode]}盘面上下文</span><small>{props.structuredText ? "已载入" : "等待排盘"}</small></div>
    <div className={styles.modeRail} aria-label="Agent 工作模式">{([ ["free", "自由对话"], ["interview", "人生访谈"], ["calibration", "出生校时"], ["recalculate", "重新排盘"] ] as const).map(([value, label]) => <button key={value} type="button" className={conversationMode === value ? styles.modeActive : ""} onClick={() => { setConversationMode(value); props.onConversationModeChange?.(value); }}>{label}</button>)}</div>
    {toolEvents.some((event) => event.type === "tool_start" || event.type === "tool_result" || event.type === "chart_update") ? <div className={styles.toolCards} aria-label="工具调用记录">{toolEvents.filter((event) => event.type === "tool_start" || event.type === "tool_result" || event.type === "chart_update").slice(-4).map((event, index) => <div className={styles.toolCard} key={`${event.type}-${index}`}><strong>{event.type === "tool_start" ? `调用 ${event.toolName}` : event.type === "tool_result" ? `${event.toolName} · ${event.status === "success" ? "完成" : "失败"}` : "盘面已更新"}</strong><span>{event.type === "tool_start" ? `关键参数：${event.inputSummary ?? "参数已校验"}` : event.summary}</span>{event.type === "chart_update" && event.calibration ? <><small>候选时辰：{event.calibration.candidates.map((candidate: { time: string }) => candidate.time).join("、")}。{event.calibration.evidence ? `已确认：${event.calibration.evidence}。` : ""}{event.calibration.instruction}</small><div className={styles.toolCardActions}>{event.calibration.candidates.map((candidate) => <button type="button" key={candidate.time} onClick={() => props.onChartContextUpdate?.({ ...event, profile: candidate.profile, structuredText: candidate.structuredText, jsonPayload: candidate.jsonPayload })}>应用 {candidate.time}</button>)}</div></> : null}{event.type === "chart_update" ? <div className={styles.toolCardActions}><button type="button" onClick={() => props.onChartContextUpdate?.(event)}>应用到当前盘面</button><button type="button" onClick={() => props.agentStreamConfig?.onRestoreChartContext?.()}>恢复上一盘面</button></div> : null}</div>)}</div> : null}
    {props.onRecalculate ? <div className={styles.tools}><strong>工具</strong><input type="datetime-local" value={recalcDate} onChange={(event) => setRecalcDate(event.target.value)} aria-label="新的排盘时间" /><button type="button" onClick={() => { if (recalcDate) props.onRecalculate?.(recalcDate); }}>重新计算并注入</button></div> : null}
    <ThreadPrimitive.Viewport className={styles.viewport}>
      <ThreadPrimitive.If empty><div className={styles.welcome}><span>从你的问题开始。</span><p>告诉我眼下的选择，我们结合盘面逐步核对。</p><div>{props.agentAngles.slice(0,4).map(a=><button type="button" key={a.label} onClick={()=>runtime.thread.composer.setText(a.question)}>{a.label} ↗</button>)}{props.mode === "bazi" ? <button type="button" onClick={()=>runtime.thread.composer.setText("我不确定自己的出生时辰，请通过前事和稳定性格帮我校时。我的公历生日、性别和时区是：____。候选时辰是：____、____。请先建立候选盘，再每次只问我一个能区分候选的核验问题。")}>开始校时 ↗</button> : null}</div></div></ThreadPrimitive.If>
      <ThreadPrimitive.Messages components={{UserMessage,AssistantMessage}} />
      <ThreadPrimitive.If running><p className={styles.generating} role="status">● 正在生成回答…</p></ThreadPrimitive.If>
      {toolStatus ? <p className={styles.toolStatus} role="status">◇ {toolStatus}</p> : null}
      <ThreadPrimitive.ScrollToBottom className={styles.jump}>回到最新 ↓</ThreadPrimitive.ScrollToBottom>
    </ThreadPrimitive.Viewport>
    {props.agentError ? <p className={styles.error} role="status">{props.agentError}</p> : null}
    <ComposerPrimitive.Root className={styles.composer}>
      {quickPrompts.length ? <div className={styles.quickPrompts} aria-label="快捷追问">
        {quickPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => runtime.thread.composer.setText(prompt)}>{prompt}</button>)}
      </div> : null}
      <ComposerPrimitive.Input className={styles.input} aria-label="发送给 Agent 的问题" placeholder="继续追问，或说说你的具体情况…" maxLength={2000} />
      <div className={styles.composerFoot}><small>Enter 发送 · Shift + Enter 换行</small><ThreadPrimitive.If running={false}><ComposerPrimitive.Send disabled={!props.structuredText} className={styles.send}>{props.agentUsageAvailable>0?"发送 ↑":"开通并对话 ↗"}</ComposerPrimitive.Send></ThreadPrimitive.If><ThreadPrimitive.If running><ComposerPrimitive.Cancel className={styles.send}>停止 ■</ComposerPrimitive.Cancel></ThreadPrimitive.If></div>
    </ComposerPrimitive.Root>
    <p className={styles.footnote}>重新生成会重新请求分析。术数解读供参考，请结合现实信息。</p>
  </ThreadPrimitive.Root></AssistantRuntimeProvider>;
}
