"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";

type Review = { id:string; outcome:string; facts:string; whatChanged:string; nextAdjustment:string; reviewedAt:string };

type AgentReviewPanelProps = { caseId: string; accessToken?: string; selectedBranchId?: string | null };

export function AgentReviewPanel({ caseId, accessToken, selectedBranchId }: AgentReviewPanelProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [outcome, setOutcome] = useState("");
  const [facts, setFacts] = useState("");
  const [whatChanged, setWhatChanged] = useState("");
  const [nextAdjustment, setNextAdjustment] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!caseId || !accessToken) return;
    let cancelled = false;
    fetch(`/api/agent/cases/${caseId}/reviews`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" })
      .then(async (response) => { const data = await response.json().catch(() => ({})) as { reviews?:Review[]; error?:string }; if (!response.ok) throw new Error(data.error || "读取复盘失败"); return data.reviews ?? []; })
      .then((items) => { if (!cancelled) setReviews(items); })
      .catch((error) => { if (!cancelled) setStatus(error instanceof Error ? error.message : "读取复盘失败"); });
    return () => { cancelled = true; };
  }, [accessToken, caseId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caseId || !accessToken || !outcome.trim() || saving) return;
    setSaving(true); setStatus("正在写入复盘…");
    try {
      const response = await fetch(`/api/agent/cases/${caseId}/reviews`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ branchId: selectedBranchId ?? undefined, outcome, facts, whatChanged, nextAdjustment }) });
      const data = await response.json().catch(() => ({})) as { review?:Review; error?:string };
      if (!response.ok || !data.review) { setStatus(data.error || "保存复盘失败"); return; }
      setReviews((current) => [data.review!, ...current]);
      setOutcome(""); setFacts(""); setWhatChanged(""); setNextAdjustment(""); setStatus("复盘已写入正式工作区");
    } finally { setSaving(false); }
  };

  const reviewCount = caseId && accessToken ? reviews.length : 0;
  return <details className="agent-review-panel">
    <summary><span><RotateCcw size={13} /> 行动复盘</span><strong>{reviewCount} 次</strong></summary>
    <div className="agent-review-panel__body">
      {!accessToken ? <p>登录并保存人生议题后，才能建立跨设备复盘记录。</p> : !caseId ? <p>先保存这一局，再记录真实结果与下一步调整。</p> : <>
        <form onSubmit={submit}>
          <label><span>实际发生了什么 *</span><textarea maxLength={6000} value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="只写结果，不替过去找解释。" /></label>
          <label><span>新增事实</span><textarea maxLength={6000} value={facts} onChange={(event) => setFacts(event.target.value)} placeholder="哪些事实能被独立核验？" /></label>
          <label><span>判断发生了什么变化</span><textarea maxLength={6000} value={whatChanged} onChange={(event) => setWhatChanged(event.target.value)} placeholder="原假设哪里成立，哪里失效？" /></label>
          <label><span>下一次调整</span><textarea maxLength={6000} value={nextAdjustment} onChange={(event) => setNextAdjustment(event.target.value)} placeholder="下一个最小动作与停止条件。" /></label>
          <button type="submit" disabled={!outcome.trim() || saving}>{saving ? "写入中…" : "完成本次复盘"}</button>
          {status ? <small role="status">{status}</small> : null}
        </form>
        {reviews.slice(0, 3).map((review) => <article key={review.id}><header><CheckCircle2 size={12} /><time>{review.reviewedAt.slice(0, 10)}</time></header><strong>{review.outcome}</strong>{review.nextAdjustment ? <p>下一步：{review.nextAdjustment}</p> : null}</article>)}
      </>}
    </div>
  </details>;
}
