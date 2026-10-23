#!/usr/bin/env node
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const manifest = {
  appUrl: "https://qmdj.singseq.com",
  platformUrl: "https://api.singseq.com",
  productCode: "qimen",
  accessScope: "qimen-core",
};

const trimBase = (value) => String(value || "").replace(/\/+$/, "");

export const resolveConfig = (env = process.env, overrides = {}) => ({
  appUrl: trimBase(overrides.appUrl || env.QIMEN_APP_URL || env.NEXT_PUBLIC_PRODUCT_ORIGIN_URL || manifest.appUrl),
  platformUrl: trimBase(overrides.platformUrl || env.PLATFORM_BASE_URL || env.NEXT_PUBLIC_PLATFORM_BASE_URL || manifest.platformUrl),
  productCode: overrides.productCode || env.PLATFORM_PRODUCT_CODE || env.NEXT_PUBLIC_PLATFORM_PRODUCT_CODE || manifest.productCode,
  accessScope: overrides.accessScope || env.PLATFORM_ACCESS_SCOPE || env.NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE || manifest.accessScope,
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
  const token = options.token || env.PLATFORM_ACCESS_TOKEN || env.SS_ACCESS_TOKEN || "";
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
const createIdempotencyKey = (productCode, options = {}) => String(options.idempotency_key || options.idempotencyKey || `cli-${productCode}-${randomUUID()}`).slice(0, 128);
const extractOrderId = (body) => {
  if (typeof body?.order_id === "string" && body.order_id.trim()) return body.order_id.trim();
  if (typeof body?.order?.order_id === "string" && body.order.order_id.trim()) return body.order.order_id.trim();
  return "";
};
const extractProviderUrl = (body) => [body?.provider_checkout_url, body?.checkout_url, body?.url].find((value) => typeof value === "string" && value.trim())?.trim() || "";

export const runCommand = async (command, rawOptions = {}, env = process.env, fetchImpl = fetch) => {
  const config = resolveConfig(env, rawOptions);
  const options = { ...rawOptions, env };
  const health = async () => {
    const [healthResult, versionResult] = await Promise.all([
      requestJson(endpoint(config.appUrl, "/api/health"), options, fetchImpl),
      requestJson(endpoint(config.appUrl, "/api/version"), options, fetchImpl),
    ]);
    return { app: { health: healthResult, version: versionResult }, product_code: config.productCode };
  };
  if (command === "health") return { ok: true, command, data: await health() };
  if (command === "auth-url" || command === "oauth-url" || command === "login-url") {
    const request = createOAuthRequest();
    const redirectUri = String(options.redirect_uri || options.redirect_url || `${config.appUrl}/auth/callback`).trim();
    const loginUrl = String(options.login_url || "https://singseq.com/oauth/authorize");
    const url = new URL(loginUrl, /^https?:\/\//i.test(loginUrl) ? undefined : config.platformUrl);
    url.searchParams.set("client_id", config.productCode);
    url.searchParams.set("product_code", config.productCode);
    url.searchParams.set("access_scope", config.accessScope);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("code_challenge", request.challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", request.state);
    return { ok: true, command, data: { url: url.toString(), redirect_uri: redirectUri, code_verifier: request.verifier, code_challenge: request.challenge, state: request.state, product_code: config.productCode, access_scope: config.accessScope } };
  }
  if (command === "oauth-exchange") {
    const code = String(options.code || "").trim();
    const verifier = String(options.code_verifier || options.verifier || "").trim();
    if (!code || !verifier) throw new Error("oauth-exchange requires --code <code> and --code-verifier <verifier>");
    const redirectUri = String(options.redirect_uri || options.redirect_url || `${config.appUrl}/auth/callback`).trim();
    const result = await requestJson(endpoint(config.platformUrl, "/api/v1/oauth/token"), { ...options, method: "POST", body: { grant_type: "authorization_code", code, client_id: config.productCode, redirect_uri: redirectUri, code_verifier: verifier }, headers: { "content-type": "application/json" } }, fetchImpl);
    return { ok: result.ok, command, status: result.status, data: result.body, request: result.url };
  }
  if (command === "plans") {
    const result = await requestJson(endpoint(config.platformUrl, `/api/v1/commerce/products/${encodeURIComponent(config.productCode)}/plans`), options, fetchImpl);
    return { ok: result.ok, command, status: result.status, data: result.body, request: result.url };
  }
  if (command === "orders") {
    const result = await requestJson(endpoint(config.platformUrl, `/api/v1/commerce/orders?product_code=${encodeURIComponent(config.productCode)}`), options, fetchImpl);
    return { ok: result.ok || boundaryOk(result.status), command, status: result.status, data: result.body, request: result.url };
  }
  if (command === "session" || command === "auth-status") {
    const hasToken = Boolean(options.token || env.PLATFORM_ACCESS_TOKEN || env.SS_ACCESS_TOKEN);
    const result = await requestJson(
      hasToken ? endpoint(config.platformUrl, "/api/v1/identity/me") : endpoint(config.appUrl, "/api/platform/session"),
      options,
      fetchImpl,
    );
    return { ok: result.ok || boundaryOk(result.status), command, status: result.status, authenticated: result.ok, data: result.body, request: result.url };
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
