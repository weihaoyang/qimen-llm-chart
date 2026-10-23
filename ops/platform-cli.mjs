#!/usr/bin/env node
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
  if (command === "plans") {
    const result = await requestJson(endpoint(config.platformUrl, `/api/v1/commerce/products/${encodeURIComponent(config.productCode)}/plans`), options, fetchImpl);
    return { ok: result.ok, command, status: result.status, data: result.body, request: result.url };
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
  if (command === "payment-result") {
    const orderId = String(options.order_id || options.orderId || "").trim();
    if (!orderId) throw new Error("payment-result requires --order-id <id>");
    const result = await requestJson(endpoint(config.platformUrl, `/api/v1/commerce/payment-result/${encodeURIComponent(orderId)}?product_code=${encodeURIComponent(config.productCode)}`), options, fetchImpl);
    return { ok: result.ok || boundaryOk(result.status), command, status: result.status, data: result.body, request: result.url };
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
