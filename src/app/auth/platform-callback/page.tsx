"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  consumePlatformOAuthRequest,
  parsePlatformOAuthCallback,
  restorePlatformAccessState,
} from "@/lib/platform/browser";
import { savePlatformFlashMessage } from "@/lib/platform/flash";
import { createPlatformClient } from "@/lib/platform/client";
import { requirePlatformClientConfig } from "@/lib/platform/config";
import { clearPlatformSession, savePlatformSession } from "@/lib/platform/session";

export default function PlatformCallbackPage() {
  const [message, setMessage] = useState("正在恢复平台登录状态。");

  useEffect(() => {
    let active = true;

    const run = async () => {
      const callback = parsePlatformOAuthCallback(window.location.hash)
        ?? parsePlatformOAuthCallback(window.location.search);
      if (!callback) {
        setMessage("登录回跳参数不完整，请返回首页重新发起登录。");
        return;
      }

      try {
        const config = requirePlatformClientConfig();
        const oauthRequest = consumePlatformOAuthRequest(callback.state);
        if (!oauthRequest) {
          throw new Error("登录授权已过期或来源校验失败，请返回首页重新登录。");
        }
        const redirectUri = `${window.location.origin}/auth/platform-callback`;
        const result = await createPlatformClient().exchangeOAuthCode(
          callback.code,
          config.productCode,
          redirectUri,
          oauthRequest.verifier,
        );
        const session = {
          ...result.session,
          access_token: "",
          refresh_token: "",
          csrf_token: result.csrf_token,
        };
        savePlatformSession(session);
        await restorePlatformAccessState(session);
        window.history.replaceState({}, document.title, window.location.pathname);
        if (!active) {
          return;
        }
        savePlatformFlashMessage({
          type: "success",
          text: "平台登录已恢复，可以继续查看套餐或使用已开通能力。",
        });
        window.location.replace("/");
      } catch (error) {
        clearPlatformSession();
        if (!active) {
          return;
        }
        savePlatformFlashMessage({
          type: "error",
          text: error instanceof Error ? error.message : "恢复平台登录失败。",
        });
        setMessage(error instanceof Error ? error.message : "恢复平台登录失败。");
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="platform-result-page">
      <div className="platform-result-card">
        <LoaderCircle className="agent-spin" />
        <h1>平台登录回跳</h1>
        <p>{message}</p>
        <Link href="/">返回工作台</Link>
      </div>
    </main>
  );
}
