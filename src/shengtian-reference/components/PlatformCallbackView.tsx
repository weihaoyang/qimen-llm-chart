"use client";

import React, { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import {
  consumePlatformOAuthRequest,
  parsePlatformOAuthCallback,
  restorePlatformAccessState,
} from '../../lib/platform/browser';
import { requirePlatformClientConfig } from '../../lib/platform/config';
import { clearPlatformSession, savePlatformSession } from '../../lib/platform/session';

export const PlatformCallbackView: React.FC = () => {
  const [message, setMessage] = useState('正在恢复平台登录状态。');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const callback = parsePlatformOAuthCallback(window.location.hash)
        ?? parsePlatformOAuthCallback(window.location.search);
      if (!callback) {
        setFailed(true);
        setMessage('登录回跳参数不完整，请返回首页重新发起登录。');
        return;
      }
      try {
        requirePlatformClientConfig();
        const oauthRequest = consumePlatformOAuthRequest(callback.state);
        if (!oauthRequest) throw new Error('登录授权已过期或来源校验失败，请返回首页重新登录。');
        const redirectUri = `${window.location.origin}/auth/platform-callback`;
        const response = await fetch('/api/platform/session', {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: callback.code, verifier: oauthRequest.verifier, redirect_uri: redirectUri }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.session) throw new Error(result.error ?? '平台登录交换失败，请重试。');
        const session = { ...result.session, access_token: '', refresh_token: '', csrf_token: result.csrf_token ?? '' };
        savePlatformSession(session);
        await restorePlatformAccessState(session);
        window.history.replaceState({}, document.title, window.location.pathname);
        if (active) window.location.replace('/');
      } catch (error) {
        clearPlatformSession();
        if (!active) return;
        setFailed(true);
        setMessage(error instanceof Error ? error.message : '恢复平台登录失败。');
      }
    };
    void restore();
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-[#04070d] text-slate-100 tactical-grid grid place-items-center px-6">
      <section className="surface-card w-full max-w-lg rounded-3xl border border-white/[0.12] p-8 text-center shadow-2xl">
        {!failed ? <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-cyan-300" /> : null}
        <p className="mt-5 font-mono-code text-xs tracking-[0.25em] text-cyan-400">PLATFORM SESSION</p>
        <h1 className="mt-3 text-2xl font-black">平台登录回跳</h1>
        <p role={failed ? 'alert' : 'status'} className="mt-4 text-sm leading-6 text-slate-300">{message}</p>
        {failed ? <a href="/" className="mt-6 inline-flex rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold hover:bg-cyan-500">返回工作台</a> : null}
      </section>
    </main>
  );
};
