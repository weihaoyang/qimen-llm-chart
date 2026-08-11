"use client";

import { useState, type FormEvent } from "react";
import { BookOpen, Trash2 } from "lucide-react";

type ObservationEntry = {
  id: string;
  createdAt: string;
  question: string;
  choice: string;
  reviewAt: string;
};

const STORAGE_KEY = "qmdj.observation-journal.v1";

const loadEntries = (): ObservationEntry[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((item): item is ObservationEntry =>
      item && typeof item.id === "string" && typeof item.question === "string" && typeof item.choice === "string",
    ).slice(0, 30) : [];
  } catch {
    return [];
  }
};

export function ObservationJournal() {
  const [entries, setEntries] = useState<ObservationEntry[]>(() => typeof window === "undefined" ? [] : loadEntries());
  const [question, setQuestion] = useState("");
  const [choice, setChoice] = useState("");
  const [reviewAt, setReviewAt] = useState("");

  const persist = (nextEntries: ObservationEntry[]) => {
    setEntries(nextEntries);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim() || !choice.trim()) return;
    const entry: ObservationEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      question: question.trim(),
      choice: choice.trim(),
      reviewAt,
    };
    persist([entry, ...entries].slice(0, 30));
    setQuestion("");
    setChoice("");
    setReviewAt("");
  };

  return (
    <section className="observation-journal" aria-label="落子记录">
      <div className="observation-journal__head">
        <div>
          <span><BookOpen size={15} aria-hidden="true" /> 落子记录</span>
          <h2>观测之后，留下你的选择。</h2>
          <p>记录当下的问题、准备承担的行动，以及下一次回看它的时间。仅保存在此浏览器，不上传至账户或平台。</p>
        </div>
        <strong suppressHydrationWarning>{entries.length} 条</strong>
      </div>

      <form className="observation-journal__form" onSubmit={submit}>
        <label>
          <span>此刻要解决什么</span>
          <textarea value={question} maxLength={160} placeholder="例如：是否在本月推进这次合作？" onChange={(event) => setQuestion(event.target.value)} />
        </label>
        <label>
          <span>我决定怎么做</span>
          <textarea value={choice} maxLength={240} placeholder="例如：先完成预算与退出条件，再在本周给出答复。" onChange={(event) => setChoice(event.target.value)} />
        </label>
        <label className="observation-journal__review">
          <span>下次复盘</span>
          <input type="date" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} />
        </label>
        <button type="submit" disabled={!question.trim() || !choice.trim()}>记录这一子</button>
      </form>

      {entries.length > 0 ? (
        <div className="observation-journal__entries">
          {entries.map((entry) => (
            <article key={entry.id}>
              <div><time>{entry.createdAt.slice(0, 10)}</time>{entry.reviewAt ? <time>复盘 {entry.reviewAt}</time> : null}</div>
              <strong>{entry.question}</strong>
              <p>{entry.choice}</p>
              <button type="button" aria-label="删除此记录" onClick={() => persist(entries.filter((item) => item.id !== entry.id))}><Trash2 size={15} /></button>
            </article>
          ))}
        </div>
      ) : <p className="observation-journal__empty">第一条记录从一个你愿意承担的具体行动开始。</p>}
    </section>
  );
}
