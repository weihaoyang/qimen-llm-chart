"use client";
import { useEffect, useRef, useState } from "react";
import { AssistantRuntimeProvider, useLocalRuntime, ThreadPrimitive, MessagePrimitive, ComposerPrimitive, ActionBarPrimitive, ErrorPrimitive, type ChatModelAdapter, type TextMessagePartProps } from "@assistant-ui/react";
import { AgentMarkdown } from "./agent-markdown";
import type { InspectorPanelProps } from "./inspector-panel";
import styles from "./agent-conversation.module.css";


function TextPart({ text }: TextMessagePartProps) { return <AgentMarkdown content={text} />; }
function UserMessage() { return <MessagePrimitive.Root className={styles.user}><small>你 / QUESTION</small><MessagePrimitive.Parts components={{Text:TextPart}} /></MessagePrimitive.Root>; }
function AssistantMessage() { return <MessagePrimitive.Root className={styles.answer}><small>知几 / ASSISTANT</small><MessagePrimitive.Parts components={{Text:TextPart}} /><MessagePrimitive.Error><ErrorPrimitive.Root className={styles.error}><ErrorPrimitive.Message /></ErrorPrimitive.Root></MessagePrimitive.Error><ActionBarPrimitive.Root className={styles.messageActions}><ActionBarPrimitive.Copy>复制</ActionBarPrimitive.Copy><ActionBarPrimitive.Reload>重新生成 ↻</ActionBarPrimitive.Reload></ActionBarPrimitive.Root></MessagePrimitive.Root>; }

export function AgentConversation(props: InspectorPanelProps) {
  const latest = useRef(props);
  useEffect(() => { latest.current=props; },[props]);
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
        const response=await fetch("/api/agent",{method:"POST",signal:abortSignal,headers:{...(await config.requestHeaders()),"Content-Type":"application/json","X-Agent-Stream":"1"},body:JSON.stringify({...config.requestBody,question,history:history.slice(0,-1).slice(-16).map(m=>({...m,content:m.content.slice(-4000)}))})});
        if(!response.ok) {const body=await response.json().catch(()=>({}));throw new Error(body.error || "对话请求失败，请重试。");}
        if(!response.body) throw new Error("未收到回答流。");
        const reader=response.body.getReader(); const decoder=new TextDecoder();
        try {while(true) {const chunk=await reader.read();if(chunk.done) break;text+=decoder.decode(chunk.value,{stream:true});yield {content:[{type:"text",text}]};} text+=decoder.decode();} finally {reader.releaseLock();}
        if(abortSignal.aborted) return;
        if(!text.trim()) throw new Error("未收到有效回答，请重试。");
        yield {content:[{type:"text",text}]};
        config.onFinish([...history,{role:"assistant",content:text}]);
      } catch(error) {
        config.onError(abortSignal.aborted ? "已停止生成，可以继续追问或重新生成。" : error instanceof Error ? error.message : "对话中断");
        if(!abortSignal.aborted) throw error;
      } finally { if(abortSignal.aborted) { config.onFinish(text ? [...history,{role:"assistant",content:text}] : history,false); config.onError("已停止生成，可以继续追问或重新生成。"); } }
    }
  }));
  const runtime=useLocalRuntime(adapter,{initialMessages:props.agentConversation.map(m=>({role:m.role,content:m.content}))});
  useEffect(()=>{if(props.agentConversation.length && !runtime.thread.getState().messages.length) runtime.thread.reset(props.agentConversation.map(m=>({role:m.role,content:m.content})));},[props.agentConversation,runtime]);
  // External chart/map suggestions populate the same composer; they do not submit twice.
  useEffect(()=>{ if(props.agentQuestion) runtime.thread.composer.setText(props.agentQuestion); },[props.agentQuestion,runtime]);
  return <AssistantRuntimeProvider runtime={runtime}><ThreadPrimitive.Root className={styles.root}>
    <header className={styles.head}><div><small>知几 / DIALOGUE</small><h3>{props.agentTitle ?? "盘面解读"}</h3></div><span>{props.agentUsageAvailable>0 ? `余 ${props.agentUsageAvailable} 轮` : "未开通"}</span></header>
    <div className={styles.context}><span>◈ {({qimen:"奇门",bazi:"八字",ziwei:"紫微",combined:"三盘联合",research:"术数研究"})[props.mode]}盘面上下文</span><small>{props.structuredText ? "已载入" : "等待排盘"}</small></div>
    <ThreadPrimitive.Viewport className={styles.viewport}>
      <ThreadPrimitive.If empty><div className={styles.welcome}><span>从你的问题开始。</span><p>告诉我眼下的选择，我们结合盘面逐步核对。</p><div>{props.agentAngles.slice(0,4).map(a=><button type="button" key={a.label} onClick={()=>runtime.thread.composer.setText(a.question)}>{a.label} ↗</button>)}</div></div></ThreadPrimitive.If>
      <ThreadPrimitive.Messages components={{UserMessage,AssistantMessage}} />
      <ThreadPrimitive.If running><p className={styles.generating} role="status">● 正在生成回答…</p></ThreadPrimitive.If>
      <ThreadPrimitive.ScrollToBottom className={styles.jump}>回到最新 ↓</ThreadPrimitive.ScrollToBottom>
    </ThreadPrimitive.Viewport>
    {props.agentError ? <p className={styles.error} role="status">{props.agentError}</p> : null}
    <ComposerPrimitive.Root className={styles.composer}>
      <ComposerPrimitive.Input className={styles.input} aria-label="发送给 Agent 的问题" placeholder="继续追问，或说说你的具体情况…" maxLength={300} />
      <div className={styles.composerFoot}><small>Enter 发送 · Shift + Enter 换行</small><ThreadPrimitive.If running={false}><ComposerPrimitive.Send disabled={!props.structuredText} className={styles.send}>{props.agentUsageAvailable>0?"发送 ↑":"开通并对话 ↗"}</ComposerPrimitive.Send></ThreadPrimitive.If><ThreadPrimitive.If running><ComposerPrimitive.Cancel className={styles.send}>停止 ■</ComposerPrimitive.Cancel></ThreadPrimitive.If></div>
    </ComposerPrimitive.Root>
    <p className={styles.footnote}>重新生成会重新请求分析。术数解读供参考，请结合现实信息。</p>
  </ThreadPrimitive.Root></AssistantRuntimeProvider>;
}
