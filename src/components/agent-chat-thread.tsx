"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { AgentMarkdown } from "@/components/agent-markdown";
import type { AgentConversationMessage } from "@/lib/agent/chat";

type Props = {
  chatId: string;
  initialMessages: readonly AgentConversationMessage[];
  requestBody: Record<string, unknown>;
  requestHeaders: () => Promise<Record<string, string>>;
  submitNonce: number;
  question: string;
  disabled?: boolean;
  onStart: () => void;
  onFinish: (messages: AgentConversationMessage[]) => void;
  onError: (message: string) => void;
};

const toUiMessages = (messages: readonly AgentConversationMessage[]): UIMessage[] =>
  messages.map((message, index) => ({
    id: `persisted-${index}-${message.role}`,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  }));

const textOf = (message: UIMessage) => message.parts
  .filter((part): part is Extract<UIMessage["parts"][number], { type: "text" }> => part.type === "text")
  .map((part) => part.text)
  .join("");

/**
 * Official AI SDK chat state/transport. It owns message identity, streaming
 * status, aborts and follow-up history; the product only supplies its
 * entitlement headers and chart context.
 */
export function AgentChatThread({
  chatId,
  initialMessages,
  requestBody,
  requestHeaders,
  submitNonce,
  question,
  disabled = false,
  onStart,
  onFinish,
  onError,
}: Props) {
  const seeded = useMemo(() => toUiMessages(initialMessages), [initialMessages]);
  const lastSeed = useRef("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef(requestBody);
  const headersRef = useRef(requestHeaders);
  useEffect(() => { bodyRef.current = requestBody; }, [requestBody]);
  useEffect(() => { headersRef.current = requestHeaders; }, [requestHeaders]);
  // The transport is intentionally created once; refs are read only when a
  // request is actually sent, so entitlement/chart changes never reset chat.
  // eslint-disable-next-line react-hooks/refs
  const [transport] = useState(() => new TextStreamChatTransport<UIMessage>({
    api: "/api/agent",
    headers: async () => ({ ...(await headersRef.current()), "X-Agent-Stream": "1" }),
    body: () => bodyRef.current,
  }));
  const { messages, sendMessage, status, error, setMessages } = useChat<UIMessage>({
    id: chatId,
    messages: seeded,
    transport,
    onFinish: ({ messages: completed }) => {
      const normalized = completed
        .filter((message): message is UIMessage & { role: "user" | "assistant" } => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role, content: textOf(message) }));
      onFinish(normalized);
    },
    onError: (nextError) => onError(nextError.message || "流式回答中断，请重试。"),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const signature = initialMessages.map((item) => `${item.role}:${item.content}`).join("\n");
    if (!busy && signature !== lastSeed.current) {
      lastSeed.current = signature;
      setMessages(seeded);
    }
  }, [busy, initialMessages, seeded, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const lastSubmitted = useRef(0);
  useEffect(() => {
    if (submitNonce <= 0 || submitNonce === lastSubmitted.current || disabled || busy || !question.trim()) return;
    lastSubmitted.current = submitNonce;
    onStart();
    void sendMessage({ text: question.trim() });
  }, [busy, disabled, onStart, question, sendMessage, submitNonce]);

  return (
    <div className="agent-thread agent-thread--sdk" aria-live="polite">
      {messages.map((message) => (
        <article className={`agent-thread__message agent-thread__message--${message.role}`} key={message.id}>
          <span>{message.role === "user" ? "你的问题" : "研究回答"}</span>
          <div className="agent-result"><AgentMarkdown content={textOf(message)} /></div>
        </article>
      ))}
      {busy ? <div className="agent-thread__streaming"><span className="agent-spin" />正在生成，可继续滚动查看…</div> : null}
      {error ? <div className="agent-thread__error">{error.message}</div> : null}
      <div ref={bottomRef} />
    </div>
  );
}
