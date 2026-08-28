"use client";

import React, { useCallback, useEffect, useState } from "react";
import { LogIn, LogOut, LoaderCircle, UserRound } from "lucide-react";
import {
  buildPlatformOAuthLoginUrl,
  resolvePlatformClientConfig,
} from "../../lib/platform/config";
import {
  createPlatformOAuthRequest,
  restorePlatformAccessState,
  savePlatformOAuthRequest,
} from "../../lib/platform/browser";
import { clearPlatformSession, loadPlatformSession } from "../../lib/platform/session";
import { createPlatformClient } from "../../lib/platform/client";

type AccountStatus = "checking" | "guest" | "authenticated";

type PlatformAccountBarProps = {
  compact?: boolean;
};

/**
 * The reference UI used to tell an unauthenticated user to log in without
 * exposing a login action. Keep identity owned by Consumer Platform and make
 * the OAuth entrypoint available in both the catalog and the active workspace.
 */
export const PlatformAccountBar: React.FC<PlatformAccountBarProps> = ({ compact = false }) => {
  const [status, setStatus] = useState<AccountStatus>("checking");
  const [displayName, setDisplayName] = useState("");
  const [session, setSession] = useState<Awaited<ReturnType<typeof restorePlatformAccessState>>["session"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const config = resolvePlatformClientConfig();

  const restore = useCallback(async () => {
    const stored = loadPlatformSession();
    if (!stored) {
      setStatus("guest");
      setSession(null);
      return;
    }
    try {
      const access = await restorePlatformAccessState(stored);
      setSession(access.session);
      setDisplayName(access.profile.display_name || access.profile.phone_number || "平台账户");
      setStatus("authenticated");
      setError(null);
    } catch (restoreError) {
      clearPlatformSession();
      setSession(null);
      setStatus("guest");
      setError(restoreError instanceof Error ? restoreError.message : "平台登录状态已失效，请重新登录。");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void restore().catch((restoreError) => {
        if (!active) return;
        setStatus("guest");
        setError(restoreError instanceof Error ? restoreError.message : "平台登录状态读取失败。");
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [restore]);

  const handleLogin = async () => {
    if (typeof window === "undefined") return;
    if (!config) {
      setError("缺少平台接入配置，暂时无法登录。");
      return;
    }
    try {
      setError(null);
      const redirectUri = `${window.location.origin}/auth/platform-callback`;
      const oauthRequest = await createPlatformOAuthRequest();
      savePlatformOAuthRequest(oauthRequest);
      window.location.assign(buildPlatformOAuthLoginUrl({
        baseUrl: config.baseUrl,
        loginUrl: config.loginUrl,
        clientId: config.productCode,
        productCode: config.productCode,
        accessScope: config.accessScope,
        redirectUri,
        codeChallenge: oauthRequest.challenge,
        state: oauthRequest.state,
      }));
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "无法发起平台登录，请重试。");
    }
  };

  const handleLogout = async () => {
    try {
      if (session?.access_token) {
        await createPlatformClient({
          accessToken: session.access_token,
          csrfToken: session.csrf_token,
        }).logout();
      }
    } catch {
      // Clear the local bridge even when the upstream session has expired.
    }
    await fetch("/api/platform/session", { method: "DELETE", credentials: "include" }).catch(() => undefined);
    clearPlatformSession();
    setSession(null);
    setDisplayName("");
    setStatus("guest");
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      window.location.reload();
    }
  };

  if (status === "checking") {
    return (
      <span className={compact ? "inline-flex items-center gap-1.5 text-[10px] text-slate-400" : "inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-xs text-slate-400"}>
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        {!compact && "正在读取平台账户…"}
      </span>
    );
  }

  if (status === "authenticated") {
    return (
      <div className={compact ? "flex items-center gap-1.5" : "flex flex-wrap items-center gap-2"} aria-label="平台账户">
        <span className={compact ? "inline-flex max-w-32 items-center gap-1 truncate text-[10px] text-slate-300" : "inline-flex items-center gap-1.5 rounded-xl border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200"} title={displayName}>
          <UserRound className="h-3.5 w-3.5 text-emerald-400" />
          <span className="truncate">{displayName || "平台账户"}</span>
        </span>
        <button type="button" onClick={() => void handleLogout()} className={compact ? "inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-black/40 px-2 py-1 text-[10px] text-slate-400 hover:text-white" : "inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-xs text-slate-300 hover:text-white"}>
          <LogOut className="h-3.5 w-3.5" />
          退出
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? "flex items-center gap-1.5" : "flex flex-wrap items-center gap-2"} aria-label="平台账户">
      {!compact && <span className="text-xs text-slate-500">游客模式</span>}
      <button type="button" onClick={() => void handleLogin()} className={compact ? "inline-flex items-center gap-1 rounded-lg border border-cyan-700/60 bg-cyan-950/50 px-2 py-1 text-[10px] font-bold text-cyan-200 hover:bg-cyan-900/60" : "inline-flex items-center gap-1.5 rounded-xl border border-cyan-700/60 bg-cyan-950/50 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-900/60"}>
        <LogIn className="h-3.5 w-3.5" />
        登录平台账户
      </button>
      {error && <span role="alert" className="w-full text-[10px] text-amber-300">{error}</span>}
    </div>
  );
};
