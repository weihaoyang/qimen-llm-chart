"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  PlatformHttpError,
  type AdminInvitationCode,
  type AdminInvitationCodeCreatePayload,
} from "@singularity-sequence/web-sdk";
import { createPlatformClient } from "@/lib/platform/client";

type AdminInvitationPanelProps = {
  accessToken: string;
  productCode: string;
  planCode: string;
};

type AdminState = "checking" | "authorized" | "unauthenticated" | "denied" | "error";

type Draft = {
  usageQuantity: string;
  maxRedemptions: string;
  expiresInDays: string;
  label: string;
};

const DEFAULT_DRAFT: Draft = {
  usageQuantity: "10",
  maxRedemptions: "1",
  expiresInDays: "30",
  label: "",
};

const asStatusMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const formatExpiry = (value: string) => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
};

export function AdminInvitationPanel({ accessToken, productCode, planCode }: AdminInvitationPanelProps) {
  const [state, setState] = useState<AdminState>("checking");
  const [role, setRole] = useState<"owner" | "admin" | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rawCode, setRawCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [items, setItems] = useState<AdminInvitationCode[]>([]);
  const [total, setTotal] = useState(0);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);

  const loadCodes = async (token = accessToken) => {
    const client = createPlatformClient({ accessToken: token });
    const result = await client.listAdminInvitationCodes(100, 0, productCode, planCode);
    setItems(result.items);
    setTotal(result.total);
  };

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      setState("checking");
      setRole(null);
      setOpen(false);
      setRawCode("");
      setCopied(false);
      setMessage(null);
      try {
        const client = createPlatformClient({ accessToken });
        const session = await client.getAdminSession();
        if (cancelled) return;
        setRole(session.role);
        setState("authorized");
        try {
          await loadCodes(accessToken);
        } catch {
          if (!cancelled) {
            setMessage("邀请码列表暂时无法刷新；可稍后重试。");
          }
        }
      } catch (error) {
        if (cancelled) return;
        const status = error instanceof PlatformHttpError ? error.status : 0;
        setState(status === 401 ? "unauthenticated" : status === 403 ? "denied" : "error");
      }
    };

    void probe();
    return () => {
      cancelled = true;
    };
    // The access token and configured product/plan are the identity boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, productCode, planCode]);

  if (state !== "authorized") return null;

  const createCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    const payload: AdminInvitationCodeCreatePayload = {
      product_code: productCode,
      plan_code: planCode,
      usage_quantity: Number(draft.usageQuantity),
      max_redemptions: Number(draft.maxRedemptions),
      expires_in_days: Number(draft.expiresInDays),
      ...(draft.label.trim() ? { label: draft.label.trim() } : {}),
    };
    if (!Number.isInteger(payload.usage_quantity) || payload.usage_quantity < 1 || payload.usage_quantity > 100) {
      setMessage("每人次数必须是 1–100 的整数。");
      return;
    }
    if (!Number.isInteger(payload.max_redemptions) || payload.max_redemptions < 1 || payload.max_redemptions > 10000) {
      setMessage("可兑换人数必须是 1–10000 的整数。");
      return;
    }
    if (!Number.isInteger(payload.expires_in_days) || payload.expires_in_days < 0 || payload.expires_in_days > 3650) {
      setMessage("有效天数必须是 0–3650 的整数，0 表示长期有效。");
      return;
    }

    setLoading(true);
    setMessage(null);
    setRawCode("");
    setCopied(false);
    try {
      const result = await createPlatformClient({ accessToken }).createAdminInvitationCode(payload);
      setRawCode(result.code);
      setMessage("邀请码已创建。原文只显示这一次，请立即复制并安全交付。平台不会再次返回原文。");
      try {
        await loadCodes();
      } catch {
        setMessage("邀请码已创建。原文只显示这一次，请立即复制并安全交付；列表将在下次刷新时同步。");
      }
    } catch (error) {
      setMessage(`创建失败：${asStatusMessage(error, "平台暂时不可用")}`);
    } finally {
      setLoading(false);
    }
  };

  const revokeCode = async (invitationId: string) => {
    if (!window.confirm("确定撤销这个邀请码吗？尚未兑换的用户将无法继续使用。")) return;
    setLoading(true);
    setMessage(null);
    try {
      await createPlatformClient({ accessToken }).revokeAdminInvitationCode(invitationId);
      setRawCode("");
      setMessage("邀请码已撤销。");
      try {
        await loadCodes();
      } catch {
        setMessage("邀请码已撤销；列表将在下次刷新时同步。");
      }
    } catch (error) {
      setMessage(`撤销失败：${asStatusMessage(error, "平台暂时不可用")}`);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!rawCode || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(rawCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="admin-invitation-wrap">
      <button type="button" className="platform-account__button admin-invitation-button" aria-expanded={open} aria-haspopup="dialog" onClick={() => {
        if (open) {
          setRawCode("");
          setCopied(false);
        }
        setOpen(!open);
      }}>
        管理员 · 邀请码
      </button>
      {open ? (
        <section className="admin-invitation-popover" role="dialog" aria-label="管理员邀请码管理">
          <div className="admin-invitation-popover__head">
            <div><span>ADMIN / INVITATIONS</span><strong>一键创建胜天半子 Key</strong></div>
            <em>{role}</em>
          </div>
          <p className="admin-invitation-popover__hint">平台负责生成、校验、限次、撤销和审计；原文只在创建成功后展示一次。</p>
          <form className="admin-invitation-form" onSubmit={(event) => void createCode(event)}>
            <label>每人次数<input type="number" min="1" max="100" value={draft.usageQuantity} onChange={(event) => setDraft((current) => ({ ...current, usageQuantity: event.target.value }))} /></label>
            <label>可兑换人数<input type="number" min="1" max="10000" value={draft.maxRedemptions} onChange={(event) => setDraft((current) => ({ ...current, maxRedemptions: event.target.value }))} /></label>
            <label>有效天数<input type="number" min="0" max="3650" value={draft.expiresInDays} onChange={(event) => setDraft((current) => ({ ...current, expiresInDays: event.target.value }))} /><small>0 = 长期</small></label>
            <label className="admin-invitation-form__wide">备注<input maxLength={160} value={draft.label} placeholder="例如：内测用户" onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} /></label>
            <button type="submit" className="platform-account__button is-primary" disabled={loading}>{loading ? "处理中…" : "创建邀请码"}</button>
          </form>
          {rawCode ? <div className="admin-invitation-raw" role="status"><small>新邀请码（只显示这一次）</small><strong>{rawCode}</strong><button type="button" className="platform-account__button" onClick={() => void copyCode()}>{copied ? "已复制" : "复制 Key"}</button></div> : null}
          {message ? <p className="admin-invitation-message" role="status">{message}</p> : null}
          <div className="admin-invitation-list-head"><strong>已创建 {total} 个</strong><button type="button" onClick={() => void loadCodes()} disabled={loading}>刷新</button></div>
          <div className="admin-invitation-list">{items.length ? items.map((item) => <div className="admin-invitation-row" key={item.id}><div><strong>{item.code_hint}</strong><small>{item.usage_quantity} 次/人 · {item.redemption_count}/{item.max_redemptions} · {item.label || "无备注"}</small></div><div><span className={`admin-invitation-status is-${item.status}`}>{item.status}</span><small>{formatExpiry(item.expires_at_iso)}</small></div>{item.status === "active" ? <button type="button" onClick={() => void revokeCode(item.id)} disabled={loading}>撤销</button> : null}</div>) : <span className="admin-invitation-empty">暂无邀请码。</span>}</div>
        </section>
      ) : null}
    </div>
  );
}
