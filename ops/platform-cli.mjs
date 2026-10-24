#!/usr/bin/env node
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const manifest = {
  appUrl: "https://qmdj.singseq.com",
  platformUrl: "https://api.singseq.com",
  productCode: "qimen",
  accessScope: "qimen-core",
};
const CLI_OAUTH_CLIENT = "qimen-cli";
const CLI_OAUTH_REDIRECT_URI = "http://127.0.0.1:47832/oauth/callback";
const DEFAULT_SESSION_FILE = join(homedir(), ".qimen", "platform-session.json");
const DEFAULT_OAUTH_STATE_FILE = join(homedir(), ".qimen", "platform-oauth-state.json");

const trimBase = (value) => String(value || "").replace(/\/+$/, "");

export const resolveConfig = (env = process.env, overrides = {}) => ({
  appUrl: trimBase(overrides.appUrl || env.QIMEN_APP_URL || env.NEXT_PUBLIC_PRODUCT_ORIGIN_URL || manifest.appUrl),
  platformUrl: trimBase(overrides.platformUrl || env.PLATFORM_BASE_URL || env.NEXT_PUBLIC_PLATFORM_BASE_URL || manifest.platformUrl),
  productCode: overrides.productCode || env.PLATFORM_PRODUCT_CODE || env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE || manifest.productCode,
  accessScope: overrides.accessScope || env.PLATFORM_ACCESS_SCOPE || env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE || manifest.accessScope,
  oauthClientId: overrides.oauth_client_id || env.QIMEN_CLI_OAUTH_CLIENT_ID || CLI_OAUTH_CLIENT,
  oauthRedirectUri: overrides.redirect_uri || env.QIMEN_CLI_OAUTH_REDIRECT_URI || CLI_OAUTH_REDIRECT_URI,
  sessionFile: overrides.session_file || env.QIMEN_CLI_SESSION_FILE || DEFAULT_SESSION_FILE,
  oauthStateFile: overrides.oauth_state_file || env.QIMEN_CLI_OAUTH_STATE_FILE || DEFAULT_OAUTH_STATE_FILE,
});

const parseArgs = (argv) => {
  const [command = "status", ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2).replaceAll("-", "_");
    options[key] = rest[index + 1]?.startsWith("--") ? true : (rest[index + 1] ?? true);
    if (options[key] !== true) index += 1;
  }
  return { command: command.replaceAll("_", "-"), options };
};

const authHeaders = (options = {}, env = process.env) => {
  const token = options.token || options.session?.access_token || env.PLATFORM_ACCESS_TOKEN || env.SS_ACCESS_TOKEN || "";
  const cookie = options.cookie || env.PLATFORM_COOKIE || env.QIMEN_PLATFORM_COOKIE || "";
  const csrf = options.csrf_token || env.PLATFORM_CSRF_TOKEN || "";
  const guestToken = options.guest_checkout_token || env.PLATFORM_GUEST_CHECKOUT_TOKEN || "";
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
    ...(csrf ? { "x-csrf-token": csrf } : {}),
    ...(guestToken ? { "x-guest-checkout-token": guestToken } : {}),
  };
};

const readBody = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 1000) }; }
};

export const requestJson = async (url, options = {}, fetchImpl = fetch) => {
  const response = await fetchImpl(url, {
    method: options.method || "GET",
    headers: { ...authHeaders(options, options.env), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: "manual",
  });
  return { status: response.status, ok: response.ok, body: await readBody(response), url: String(url) };
};

const boundaryOk = (status) => status === 401 || status === 403 || status === 405;
const endpoint = (base, path) => `${trimBase(base)}${path.startsWith("/") ? path : `/${path}`}`;
const base64Url = (value) => Buffer.from(value).toString("base64url");
const createOAuthRequest = () => {
  const verifier = base64Url(randomBytes(48));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = base64Url(randomBytes(32));
  return { verifier, challenge, state };
};
const oauthUrl = (config, request) => {
  const url = new URL("https://singseq.com/oauth/authorize");
  url.searchParams.set("client_id", config.oauthClientId);
  url.searchParams.set("product_code", config.productCode);
  url.searchParams.set("access_scope", config.accessScope);
  url.searchParams.set("redirect_uri", config.oauthRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", request.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", request.state);
  return url.toString();
};
const safeWriteJson = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  try { chmodSync(file, 0o600); } catch { /* Windows ACLs are managed by the user profile. */ }
};
const readJson = (file) => {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
};
const saveOAuthState = (config, request) => safeWriteJson(config.oauthStateFile, {
  client_id: config.oauthClientId,
  product_code: config.productCode,
  access_scope: config.accessScope,
  redirect_uri: config.oauthRedirectUri,
  verifier: request.verifier,
  challenge: request.challenge,
  state: request.state,
  created_at: new Date().toISOString(),
});
const loadOAuthState = (config) => {
  const value = readJson(config.oauthStateFile);
  if (!value || value.client_id !== config.oauthClientId || value.product_code !== config.productCode
    || value.redirect_uri !== config.oauthRedirectUri || typeof value.verifier !== "string"
    || typeof value.state !== "string") return null;
  return value;
};
const removeOAuthState = (config) => { try { rmSync(config.oauthStateFile, { force: true }); } catch { /* best effort */ } };
const readStoredSession = (config) => {
  const value = readJson(config.sessionFile);
  if (!value || typeof value.access_token !== "string" || !value.access_token) return null;
  return value;
};
const redactSessionTokens = (value) => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactSessionTokens);
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (["access_token", "refresh_token"].includes(key)) return [key, entry ? "[redacted]" : entry];
    return [key, redactSessionTokens(entry)];
  }));
};
const saveStoredSession = (config, body) => {
  // OAuth-only clients receive bearer credentials in desktop_session. Refresh
  // responses use session, so accept both without persisting profile data.
  const session = body?.desktop_session && typeof body.desktop_session === "object"
    ? body.desktop_session
    : body?.session && typeof body.session === "object" ? body.session : body;
  if (typeof session?.access_token !== "string" || !session.access_token) return false;
  safeWriteJson(config.sessionFile, {
    access_token: session.access_token,
    refresh_token: typeof session.refresh_token === "string" ? session.refresh_token : "",
    expires_at_iso: typeof session.expires_at_iso === "string" ? session.expires_at_iso : "",
    refresh_expires_at_iso: typeof session.refresh_expires_at_iso === "string" ? session.refresh_expires_at_iso : "",
    user_id: typeof session.user_id === "string" ? session.user_id : "",
    phone_number: typeof session.phone_number === "string" ? session.phone_number : "",
    saved_at: new Date().toISOString(),
  });
  return true;
};
const clearStoredSession = (config) => { try { rmSync(config.sessionFile, { force: true }); } catch { /* best effort */ } };
const openExternalUrl = (url) => new Promise((resolve, reject) => {
  const [command, args] = process.platform === "win32"
    ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
    : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.once("error", reject);
  child.once("spawn", () => { child.unref(); resolve(); });
});
export const parseOAuthCallbackParams = (value) => {
  const url = new URL(value, "http://127.0.0.1/");
  const params = new URLSearchParams(url.search || (url.hash ? url.hash.replace(/^#\??/, "") : ""));
  return { code: params.get("code") || "", state: params.get("state") || "" };
};
const oauthCallbackHtml = () => `<!doctype html><meta charset="utf-8"><title>Qimen sign-in</title><p id="status">Returning to the Qimen CLI...</p><script>
const params = new URLSearchParams(location.hash.replace(/^#\\??/, '') || location.search.replace(/^\\?/, ''));
fetch('/oauth/callback/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: params.get('code') || '', state: params.get('state') || '' }) })
  .then(async response => { const body = await response.json().catch(() => ({})); document.getElementById('status').textContent = response.ok ? 'Qimen sign-in complete. You can close this tab.' : (body.message || body.reason_code || 'Qimen sign-in failed. Return to the CLI.'); })
  .catch(() => { document.getElementById('status').textContent = 'Unable to reach the Qimen CLI. Return to the CLI and retry.'; });
</script>`;
export const waitForOAuthCallback = (config, request, fetchImpl, env, {
  openBrowser = openExternalUrl,
  timeoutMs = 120_000,
  signalSource = process,
} = {}) => new Promise((resolve) => {
  let completed = false;
  let settled = false;
  let timer;
  let serverClosed = false;
  const controller = new AbortController();
  const closeServer = () => {
    if (serverClosed) return;
    serverClosed = true;
    if (server.listening) server.close();
  };
  const settle = (result) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    signalSource.removeListener("SIGINT", onInterrupt);
    signalSource.removeListener("SIGTERM", onInterrupt);
    if (!result.ok) controller.abort();
    removeOAuthState(config);
    closeServer();
    resolve(result);
  };
  const onInterrupt = () => settle({
    ok: false,
    command: "login",
    status: 130,
    reason_code: "oauth_login_interrupted",
    message: "Qimen sign-in was interrupted. Start login again.",
  });
  const finish = async (code, state, outgoing) => {
    if (completed) {
      outgoing.writeHead(409, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      outgoing.end(JSON.stringify({ reason_code: "oauth_callback_already_consumed", message: "This sign-in callback has already been used." }));
      return;
    }
    if (!code || state !== request.state) {
      outgoing.writeHead(400, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      outgoing.end(JSON.stringify({ reason_code: "oauth_state_invalid", message: "OAuth state validation failed. Return to the Qimen CLI." }));
      return;
    }
    completed = true;
    closeServer();
    try {
      const result = await runCommand("oauth-exchange", {
        code,
        state,
        registration_confirmed: true,
        session_file: config.sessionFile,
        oauth_state_file: config.oauthStateFile,
      }, env, (input, init) => fetchImpl(input, { ...init, signal: controller.signal }));
      outgoing.writeHead(result.ok ? 200 : 502, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      outgoing.end(JSON.stringify({
        ...(result.ok
          ? { message: "Qimen sign-in complete. You can close this tab and return to the CLI." }
          : { reason_code: result.data?.detail?.reason_code || result.reason_code || "oauth_exchange_failed", message: "Qimen sign-in could not be completed. Return to the CLI and retry." }),
      }));
      settle(result);
    } catch (error) {
      outgoing.writeHead(502, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      outgoing.end(JSON.stringify({ reason_code: "oauth_exchange_failed", message: "Qimen sign-in could not be completed. Return to the CLI and retry." }));
      settle({ ok: false, command: "login", status: 502, reason_code: "oauth_exchange_failed", error: error instanceof Error ? error.message : String(error) });
    }
  };
  const server = createServer(async (incoming, outgoing) => {
    const callback = new URL(incoming.url || "/", `http://${incoming.headers.host || "127.0.0.1"}`);
    const callbackPath = new URL(config.oauthRedirectUri).pathname;
    if (callback.pathname !== callbackPath && callback.pathname !== "/oauth/callback/complete") {
      outgoing.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      outgoing.end("Qimen OAuth callback not found.");
      return;
    }
    if (incoming.method === "GET" && callback.pathname === callbackPath) {
      const { code, state } = parseOAuthCallbackParams(incoming.url || "/");
      if (code || state) {
      void finish(code, state, outgoing);
        return;
      }
      outgoing.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff" });
      outgoing.end(oauthCallbackHtml());
      return;
    }
    if (incoming.method !== "POST" || callback.pathname !== "/oauth/callback/complete"
      || incoming.headers.origin !== `http://127.0.0.1:${new URL(config.oauthRedirectUri).port}`
      || incoming.headers["content-type"]?.split(";")[0] !== "application/json") {
      outgoing.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      outgoing.end("Qimen OAuth callback not found.");
      return;
    }
    let raw = "";
    incoming.setEncoding("utf8");
    incoming.on("data", (chunk) => { raw += chunk; if (raw.length > 8192) incoming.destroy(); });
    incoming.on("end", () => {
      let payload;
      try { payload = JSON.parse(raw); } catch { payload = null; }
      void finish(typeof payload?.code === "string" ? payload.code : "", typeof payload?.state === "string" ? payload.state : "", outgoing);
    });
  });
  signalSource.once("SIGINT", onInterrupt);
  signalSource.once("SIGTERM", onInterrupt);
  server.on("error", (error) => settle({ ok: false, command: "login", status: 500, error: error.message }));
  const redirect = new URL(config.oauthRedirectUri);
  server.listen(Number(redirect.port), "127.0.0.1", async () => {
    timer = setTimeout(() => {
      controller.abort();
      settle({
        ok: false,
        command: "login",
        status: 408,
        reason_code: "oauth_callback_timeout",
        message: "Timed out waiting for the Qimen sign-in callback. Start login again.",
      });
    }, timeoutMs);
    timer.unref?.();
    try {
      await openBrowser(oauthUrl(config, request));
    } catch (error) {
      settle({ ok: false, command: "login", status: 500, reason_code: "browser_launch_failed", error: error instanceof Error ? error.message : String(error) });
    }
  });
});
const helpResult = () => ({ ok: true, command: "help", data: {
  description: "Qimen platform contract CLI. OAuth never copies browser cookies.",
  commands: ["login", "auth-url", "oauth-exchange", "session", "session-refresh", "session-clear", "health", "contract", "plans", "orders", "gate", "usage", "usage-reserve", "usage-commit", "usage-release", "payment-result", "checkout", "ai-contract", "ai-health", "ai-run", "status"],
  oauth: { client_id: CLI_OAUTH_CLIENT, redirect_uri: CLI_OAUTH_REDIRECT_URI, state_file: "QIMEN_CLI_OAUTH_STATE_FILE", session_file: "QIMEN_CLI_SESSION_FILE" },
} });
const readLocalProductContract = () => JSON.parse(readFileSync(new URL("../singseq.product.json", import.meta.url), "utf8"));
const sortedStrings = (values) => [...new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === "string"))].sort();
const createIdempotencyKey = (productCode, options = {}) => String(options.idempotency_key || options.idempotencyKey || `cli-${productCode}-${randomUUID()}`).slice(0, 128);
const extractOrderId = (body) => {
  if (typeof body?.order_id === "string" && body.order_id.trim()) return body.order_id.trim();
  if (typeof body?.order?.order_id === "string" && body.order.order_id.trim()) return body.order.order_id.trim();
  return "";
};
const extractProviderUrl = (body) => [body?.provider_checkout_url, body?.checkout_url, body?.url].find((value) => typeof value === "string" && value.trim())?.trim() || "";

export const runCommand = async (command, rawOptions = {}, env = process.env, fetchImpl = fetch) => {
  const config = resolveConfig(env, rawOptions);
  const options = { ...rawOptions, session: readStoredSession(config), env };
  const health = async () => {
    const [healthResult, versionResult] = await Promise.all([
      requestJson(endpoint(config.appUrl, "/api/health"), options, fetchImpl),
      requestJson(endpoint(config.appUrl, "/api/version"), options, fetchImpl),
    ]);
    return { app: { health: healthResult, version: versionResult }, product_code: config.productCode };
  };
  if (command === "help" || command === "--help" || command === "-h") return helpResult();
  if (command === "health") return { ok: true, command, data: await health() };
  if (command === "auth-url" || command === "oauth-url" || command === "login-url") {
    const request = createOAuthRequest();
    saveOAuthState(config, request);
    return { ok: true, command, status: 200, data: { authorize_url: oauthUrl(config, request), state: request.state, redirect_uri: config.oauthRedirectUri, product_code: config.productCode, access_scope: config.accessScope, session_file: config.sessionFile, oauth_state_file: config.oauthStateFile } };
  }
  if (command === "login") {
    const request = createOAuthRequest();
    saveOAuthState(config, request);
    return waitForOAuthCallback(config, request, fetchImpl, env);
  }
  if (command === "oauth-exchange") {
    const code = String(options.code || "").trim();
    const returnedState = String(options.state || "").trim();
    if (!code || !returnedState) throw new Error("oauth-exchange requires --code <code> and --state <state>");
    const pending = loadOAuthState(config);
    if (!pending || pending.state !== returnedState) {
      return { ok: false, command, status: 400, reason_code: "oauth_state_invalid", message: "OAuth state does not match the pending Qimen CLI login." };
    }
    const result = await requestJson(endpoint(config.platformUrl, "/api/v1/oauth/token"), {
      ...options,
      method: "POST",
      body: { grant_type: "authorization_code", code, client_id: config.oauthClientId, redirect_uri: config.oauthRedirectUri, code_verifier: pending.verifier },
      headers: { "content-type": "application/json" },
    }, fetchImpl);
    if (result.ok) {
      const saved = saveStoredSession(config, result.body);
      removeOAuthState(config);
      return { ok: saved, command, status: result.status, authenticated: saved, session_file: config.sessionFile, data: saved ? { user_id: readStoredSession(config)?.user_id || "", expires_at_iso: readStoredSession(config)?.expires_at_iso || "" } : { reason_code: "oauth_session_missing", message: "Token exchange succeeded but the platform response did not include an access token." }, request: result.url };
    }
    return { ok: false, command, status: result.status, data: result.body, request: result.url };
  }
  if (command === "plans") {
    const result = await requestJson(endpoint(config.platformUrl, `/api/v1/commerce/products/${encodeURIComponent(config.productCode)}/plans`), options, fetchImpl);
    return { ok: result.ok, command, status: result.status, data: result.body, request: result.url };
  }
  if (command === "contract") {
    const [products, plans] = await Promise.all([
      requestJson(endpoint(config.platformUrl, "/api/v1/commerce/products"), options, fetchImpl),
      requestJson(endpoint(config.platformUrl, `/api/v1/commerce/products/${encodeURIComponent(config.productCode)}/plans`), options, fetchImpl),
    ]);
    const local = readLocalProductContract();
    if (!products.ok || !plans.ok) {
      return {
        ok: false,
        command,
        status: !products.ok ? products.status : plans.status,
        data: { product_code: config.productCode, access_scope: config.accessScope, local, platform: { products: products.body, plans: plans.body } },
        requests: [products.url, plans.url],
      };
    }
    const registered = (Array.isArray(products.body?.items) ? products.body.items : []).find((item) => item?.product_code === config.productCode) || null;
    const livePlans = Array.isArray(plans.body?.items) ? plans.body.items : [];
    const mismatches = [];
    if (local.product_code !== config.productCode || local.access_scope !== config.accessScope) mismatches.push("local_product_coordinates_mismatch");
    if (!registered) mismatches.push("platform_product_missing");
    if (registered && registered.status !== "active") mismatches.push("platform_product_inactive");
    if (registered?.access_scope !== config.accessScope) mismatches.push("platform_access_scope_mismatch");
    if (registered && JSON.stringify(sortedStrings(registered.capabilities)) !== JSON.stringify(sortedStrings(local.capabilities))) mismatches.push("platform_capabilities_mismatch");
    if (livePlans.some((plan) => plan.product_code !== config.productCode || plan.access_scope !== config.accessScope)) mismatches.push("platform_plan_coordinates_mismatch");
    const livePlanCodes = sortedStrings(livePlans.map((plan) => plan.plan_code));
    const localPlanCodes = sortedStrings((Array.isArray(local.plans) ? local.plans : []).map((plan) => plan?.plan_code));
    if (JSON.stringify(livePlanCodes) !== JSON.stringify(localPlanCodes)) mismatches.push("platform_plan_set_mismatch");
    return {
      ok: mismatches.length === 0,
      command,
      status: 200,
      data: {
        product_code: config.productCode,
        configured_access_scope: config.accessScope,
        platform: { product: registered, plans: livePlans, channels: Array.isArray(plans.body?.channels) ? plans.body.channels : [] },
        local: { access_scope: local.access_scope, capabilities: local.capabilities, plans: local.plans },
        mismatches,
      },
      requests: [products.url, plans.url],
    };
  }
  if (command === "orders") {
    const result = await requestJson(endpoint(config.platformUrl, `/api/v1/commerce/orders?product_code=${encodeURIComponent(config.productCode)}`), options, fetchImpl);
    return { ok: result.ok || boundaryOk(result.status), command, status: result.status, data: result.body, request: result.url };
  }
  if (command === "session" || command === "auth-status") {
    const hasToken = Boolean(options.token || options.session?.access_token || env.PLATFORM_ACCESS_TOKEN || env.SS_ACCESS_TOKEN);
    const result = await requestJson(
      hasToken ? endpoint(config.platformUrl, "/api/v1/identity/me") : endpoint(config.appUrl, "/api/platform/session"),
      options,
      fetchImpl,
    );
    return { ok: result.ok || boundaryOk(result.status), command, status: result.status, authenticated: result.ok, session_source: hasToken ? "qimen_cli_session_file_or_token" : options.cookie || env.PLATFORM_COOKIE || env.QIMEN_PLATFORM_COOKIE ? "browser_cookie" : "none", data: redactSessionTokens(result.body), request: result.url };
  }
  if (command === "session-clear" || command === "logout") {
    clearStoredSession(config);
    removeOAuthState(config);
    return { ok: true, command, authenticated: false, session_file_removed: config.sessionFile };
  }
  if (command === "session-refresh" || command === "refresh") {
    const stored = readStoredSession(config);
    if (!stored?.refresh_token) return { ok: false, command, status: 401, reason_code: "cli_session_refresh_missing", message: "No saved Qimen CLI refresh token is available." };
    const result = await requestJson(endpoint(config.platformUrl, "/api/v1/identity/refresh"), {
      ...options,
      method: "POST",
      body: { refresh_token: stored.refresh_token },
      headers: { "content-type": "application/json" },
    }, fetchImpl);
    if (!result.ok) return { ok: false, command, status: result.status, data: redactSessionTokens(result.body), request: result.url };
    const saved = saveStoredSession(config, result.body);
    return { ok: saved, command, status: result.status, authenticated: saved, session_file: config.sessionFile, data: saved ? { user_id: readStoredSession(config)?.user_id || "", expires_at_iso: readStoredSession(config)?.expires_at_iso || "" } : { reason_code: "oauth_session_missing", message: "Platform refresh succeeded but did not return an access token." }, request: result.url };
  }
  if (command === "gate") {
    const result = await requestJson(endpoint(config.platformUrl, `/api/v1/entitlement/products/${encodeURIComponent(config.productCode)}/gate?access_scope=${encodeURIComponent(config.accessScope)}`), options, fetchImpl);
    return { ok: result.ok || boundaryOk(result.status), command, status: result.status, allowed: result.ok && result.body?.allowed === true, data: result.body, request: result.url };
  }
  if (command === "entitlement") return runCommand("gate", rawOptions, env, fetchImpl);
  if (["usage", "usage-reserve", "usage-commit", "usage-release"].includes(command)) {
    const planCode = String(options.plan_code || options.plan || "").trim();
    const reservationId = String(options.reservation_id || options.reservation || "").trim();
    if (command === "usage-reserve" && !planCode) throw new Error("usage-reserve requires --plan-code <plan>");
    if ((command === "usage-commit" || command === "usage-release") && !reservationId) throw new Error(`${command} requires --reservation-id <id>`);
    const suffix = command === "usage"
      ? `/api/v1/entitlement/products/${encodeURIComponent(config.productCode)}/usage${planCode ? `?plan_code=${encodeURIComponent(planCode)}` : ""}`
      : command === "usage-reserve"
        ? `/api/v1/entitlement/products/${encodeURIComponent(config.productCode)}/usage/reserve?plan_code=${encodeURIComponent(planCode)}`
        : `/api/v1/entitlement/products/${encodeURIComponent(config.productCode)}/usage/${encodeURIComponent(reservationId)}/${command.slice("usage-".length)}${planCode ? `?plan_code=${encodeURIComponent(planCode)}` : ""}`;
    const result = await requestJson(endpoint(config.platformUrl, suffix), { ...options, method: command === "usage" ? "GET" : "POST", body: command === "usage" ? undefined : {}, headers: command === "usage" ? undefined : { "content-type": "application/json" } }, fetchImpl);
    return { ok: result.ok || boundaryOk(result.status), command, status: result.status, data: result.body, request: result.url };
  }
  if (command === "payment-result") {
    const orderId = String(options.order_id || options.orderId || "").trim();
    if (!orderId) throw new Error("payment-result requires --order-id <id>");
    const result = await requestJson(endpoint(config.platformUrl, `/api/v1/commerce/payment-result/${encodeURIComponent(orderId)}?product_code=${encodeURIComponent(config.productCode)}`), options, fetchImpl);
    return { ok: result.ok || boundaryOk(result.status), command, status: result.status, data: result.body, request: result.url };
  }
  if (command === "checkout") {
    const planCode = String(options.plan_code || options.plan || "").trim();
    if (!planCode) throw new Error("checkout requires --plan-code <plan>");
    const paymentChannel = String(options.payment_channel || options.channel || "alipay").trim();
    const paymentScene = String(options.payment_scene || options.scene || "web").trim();
    if (!["web", "wap"].includes(paymentScene)) throw new Error("checkout --payment-scene must be web or wap");
    const idempotencyKey = createIdempotencyKey(config.productCode, options);
    const planResult = await requestJson(endpoint(config.platformUrl, `/api/v1/commerce/products/${encodeURIComponent(config.productCode)}/plans`), options, fetchImpl);
    if (!planResult.ok) return { ok: false, command, status: planResult.status, data: planResult.body, request: planResult.url };
    const items = Array.isArray(planResult.body?.items) ? planResult.body.items : [];
    if (items.length && !items.some((item) => item?.plan_code === planCode)) return { ok: false, command, status: 422, data: { reason_code: "plan_not_found", plan_code: planCode, product_code: config.productCode } };
    const orderResult = await requestJson(endpoint(config.platformUrl, "/api/v1/commerce/orders"), { ...options, method: "POST", body: { product_code: config.productCode, plan_code: planCode, payment_channel: paymentChannel, idempotency_key: idempotencyKey }, headers: { "content-type": "application/json" } }, fetchImpl);
    if (!orderResult.ok) return { ok: false, command, status: orderResult.status, data: orderResult.body, idempotency_key: idempotencyKey, request: orderResult.url };
    const orderId = extractOrderId(orderResult.body);
    if (!orderId) return { ok: false, command, status: 502, data: { reason_code: "order_id_missing", order: orderResult.body }, idempotency_key: idempotencyKey };
    const returnUrl = String(options.return_url || options.return_url_template || `${config.appUrl}/billing/result?order_id=${encodeURIComponent(orderId)}&product_code=${encodeURIComponent(config.productCode)}`).replace("{order_id}", encodeURIComponent(orderId));
    const paymentResult = await requestJson(endpoint(config.platformUrl, "/api/v1/commerce/payment-attempts"), { ...options, method: "POST", body: { order_id: orderId, product_code: config.productCode, payment_channel: paymentChannel, payment_scene: paymentScene, return_url: returnUrl }, headers: { "content-type": "application/json" } }, fetchImpl);
    return { ok: paymentResult.ok, command, status: paymentResult.status, idempotency_key: idempotencyKey, order_id: orderId, payment_attempt_id: paymentResult.body?.payment_attempt_id || "", provider_checkout_url: extractProviderUrl(paymentResult.body), return_url: returnUrl, data: { plans: planResult.body, order: orderResult.body, payment_attempt: paymentResult.body }, request: paymentResult.url };
  }
  if (command === "ai-contract") {
    return { ok: true, command, data: { product_code: config.productCode, access_scope: config.accessScope, route: "/api/agent", gate_required: true, plans: ["qimen-analysis-10", "qimen-kline-precise-1"], lifecycle: ["gate", "reserve", "provider", "commit_or_release", "report_token_usage", "audit"], required_args: ["--mode", "--structured-text", "--json-payload"] } };
  }
  if (command === "ai-health") {
    const app = await health();
    const route = await requestJson(endpoint(config.appUrl, "/api/agent"), options, fetchImpl);
    return { ok: app.app.health.ok && app.app.version.ok && (route.ok || boundaryOk(route.status)), command, data: { ...app, ai_route: { status: route.status, reachable: route.ok || boundaryOk(route.status), expected_method: "POST", response: route.body } } };
  }
  if (command === "ai-run" || command === "ai-analysis") {
    const mode = String(options.mode || "").trim();
    const structuredText = String(options.structured_text || "").trim();
    const jsonPayload = String(options.json_payload || "").trim();
    if (!mode) throw new Error(`${command} requires --mode <workbench-mode>`);
    if (!structuredText) throw new Error(`${command} requires --structured-text <text>`);
    if (!jsonPayload) throw new Error(`${command} requires --json-payload <valid-json>`);
    try { JSON.parse(jsonPayload); } catch { throw new Error("ai-run requires --json-payload to be valid JSON"); }
    const body = {
      mode,
      structuredText,
      jsonPayload,
      ...(options.question ? { question: String(options.question) } : {}),
      ...(options.focus ? { focus: String(options.focus) } : {}),
      ...(options.research_tool ? { researchTool: String(options.research_tool) } : {}),
      ...(options.analysis_product ? { analysisProduct: String(options.analysis_product) } : {}),
      ...(options.conversation_mode ? { conversationMode: String(options.conversation_mode) } : {}),
    };
    const result = await requestJson(endpoint(config.appUrl, "/api/agent"), { ...options, method: "POST", body, headers: { "content-type": "application/json" } }, fetchImpl);
    return { ok: result.ok, command, status: result.status, data: result.body, request: result.url };
  }
  if (command === "status") {
    const [healthData, plans, session, gate] = await Promise.all([
      health(),
      runCommand("plans", rawOptions, env, fetchImpl),
      runCommand("session", rawOptions, env, fetchImpl),
      runCommand("gate", rawOptions, env, fetchImpl),
    ]);
    return { ok: healthData.app.health.ok && healthData.app.version.ok && plans.ok && session.ok && gate.ok, command, data: { health: healthData, plans, session, gate } };
  }
  throw new Error(`unknown command: ${command}`);
};

export const main = async (argv = process.argv.slice(2), env = process.env, fetchImpl = fetch) => {
  const { command, options } = parseArgs(argv);
  try {
    const result = await runCommand(command, options, env, fetchImpl);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.ok ? 0 : 1;
  } catch (error) {
    const result = { ok: false, command, error: error instanceof Error ? error.message : String(error) };
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 1;
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  process.exitCode = await main();
}
