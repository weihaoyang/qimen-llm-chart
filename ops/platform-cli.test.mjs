import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "./platform-cli.mjs";

const mockFetch = (routes) => async (input, init = {}) => {
  const url = String(input);
  const route = routes.find((item) => url.includes(item.match));
  assert.ok(route, `unexpected request ${url}`);
  if (route.assert) route.assert(init, url);
  return new Response(JSON.stringify(route.body ?? {}), { status: route.status ?? 200, headers: { "content-type": "application/json" } });
};

const env = { PLATFORM_BASE_URL: "https://api.example.test", PLATFORM_PRODUCT_CODE: "qimen", PLATFORM_ACCESS_SCOPE: "qimen-core", QIMEN_APP_URL: "https://qimen.example.test" };

test("plans uses the registered qimen product and never writes", async () => {
  const result = await runCommand("plans", {}, env, mockFetch([{ match: "/commerce/products/qimen/plans", body: { items: [], channels: [] }, assert: (init) => assert.equal(init.method, "GET") }]));
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
});

test("orders and usage lifecycle stay product-scoped", async () => {
  const calls = [];
  const fetcher = mockFetch([
    { match: "/commerce/orders?product_code=qimen", body: { items: [] }, assert: (init, url) => { calls.push([init.method, url]); } },
    { match: "/usage?plan_code=qimen-analysis-10", body: { product_code: "qimen", plan_code: "qimen-analysis-10" }, assert: (init, url) => { calls.push([init.method, url]); } },
    { match: "/usage/reserve?plan_code=qimen-analysis-10", body: { product_code: "qimen", reservation_id: "reservation-1" }, assert: (init, url) => { calls.push([init.method, url]); assert.equal(init.method, "POST"); } },
    { match: "/usage/reservation-1/commit?plan_code=qimen-analysis-10", body: { product_code: "qimen", reservation_id: "reservation-1" }, assert: (init, url) => { calls.push([init.method, url]); assert.equal(init.method, "POST"); } },
    { match: "/usage/reservation-1/release", body: { product_code: "qimen", reservation_id: "reservation-1" }, assert: (init, url) => { calls.push([init.method, url]); assert.equal(init.method, "POST"); } },
  ]);
  await runCommand("orders", {}, env, fetcher);
  await runCommand("usage", { plan_code: "qimen-analysis-10" }, env, fetcher);
  await runCommand("usage-reserve", { plan_code: "qimen-analysis-10" }, env, fetcher);
  await runCommand("usage-commit", { reservation_id: "reservation-1", plan_code: "qimen-analysis-10" }, env, fetcher);
  await runCommand("usage-release", { reservation_id: "reservation-1" }, env, fetcher);
  assert.deepEqual(calls.map(([method]) => method), ["GET", "GET", "POST", "POST", "POST"]);
});

test("CLI auth-url creates a contract-complete PKCE request without a local registration flag", async () => {
  const dir = mkdtempSync(join(tmpdir(), "qimen-cli-auth-"));
  const result = await runCommand("auth-url", { session_file: join(dir, "session.json"), oauth_state_file: join(dir, "oauth.json") }, env);
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  const url = new URL(result.data.authorize_url);
  assert.equal(url.origin + url.pathname, "https://singseq.com/oauth/authorize");
  assert.equal(url.searchParams.get("client_id"), "qimen-cli");
  assert.equal(url.searchParams.get("product_code"), "qimen");
  assert.equal(url.searchParams.get("access_scope"), "qimen-core");
  assert.equal(url.searchParams.get("redirect_uri"), "http://127.0.0.1:47832/oauth/callback");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.match(url.searchParams.get("code_challenge"), /^[A-Za-z0-9_-]{43}$/);
  assert.match(url.searchParams.get("state"), /^[A-Za-z0-9_-]{43}$/);
  assert.equal(JSON.parse(readFileSync(join(dir, "oauth.json"), "utf8")).state, url.searchParams.get("state"));
  rmSync(dir, { recursive: true, force: true });
});

test("OAuth exchange sends the pending request to the platform and surfaces its real registration error", async () => {
  const dir = mkdtempSync(join(tmpdir(), "qimen-cli-exchange-"));
  const oauthStateFile = join(dir, "oauth.json");
  const auth = await runCommand("auth-url", { session_file: join(dir, "session.json"), oauth_state_file: oauthStateFile }, env);
  const state = new URL(auth.data.authorize_url).searchParams.get("state");
  const result = await runCommand("oauth-exchange", { code: "browser-code", state, session_file: join(dir, "session.json"), oauth_state_file: oauthStateFile }, env, mockFetch([{ match: "/api/v1/oauth/token", status: 400, body: { detail: { reason_code: "identity_oauth_client_mismatch" } }, assert: (init) => assert.equal(init.method, "POST") }]));
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.data.detail.reason_code, "identity_oauth_client_mismatch");
  rmSync(dir, { recursive: true, force: true });
});

test("registered OAuth exchange validates state and persists returned platform session for later CLI reads", async () => {
  const dir = mkdtempSync(join(tmpdir(), "qimen-cli-session-"));
  const sessionFile = join(dir, "session.json");
  const oauthStateFile = join(dir, "oauth.json");
  const auth = await runCommand("auth-url", { session_file: sessionFile, oauth_state_file: oauthStateFile }, env);
  const state = new URL(auth.data.authorize_url).searchParams.get("state");
  const wrongState = await runCommand("oauth-exchange", {
    code: "oauth-code", state: "wrong-state",
    session_file: sessionFile, oauth_state_file: oauthStateFile,
  }, env, async () => { throw new Error("wrong OAuth state must not contact token endpoint"); });
  assert.equal(wrongState.reason_code, "oauth_state_invalid");

  const exchange = await runCommand("oauth-exchange", {
    code: "oauth-code", state,
    session_file: sessionFile, oauth_state_file: oauthStateFile,
  }, env, mockFetch([{
    match: "/api/v1/oauth/token",
    body: { session: { access_token: "ssp_at_cli", refresh_token: "ssp_rt_cli", user_id: "user-1", expires_at_iso: "2030-01-01T00:00:00Z" } },
    assert: (init) => {
      assert.equal(init.method, "POST");
      assert.deepEqual(JSON.parse(init.body), {
        grant_type: "authorization_code", code: "oauth-code", client_id: "qimen-cli",
        redirect_uri: "http://127.0.0.1:47832/oauth/callback",
        code_verifier: JSON.parse(readFileSync(oauthStateFile, "utf8")).verifier,
      });
    },
  }]));
  assert.equal(exchange.ok, true);
  assert.equal(JSON.parse(readFileSync(sessionFile, "utf8")).refresh_token, "ssp_rt_cli");
  const session = await runCommand("session", { session_file: sessionFile }, env, mockFetch([{
    match: "/api/v1/identity/me",
    body: { session: { access_token: "ssp_at_cli", refresh_token: "ssp_rt_cli" }, profile: { user_id: "user-1" } },
    assert: (init) => assert.equal(init.headers.Authorization, "Bearer ssp_at_cli"),
  }]));
  assert.equal(session.authenticated, true);
  assert.deepEqual(session.data.session, { access_token: "[redacted]", refresh_token: "[redacted]" });
  const refreshed = await runCommand("session-refresh", { session_file: sessionFile }, env, mockFetch([{
    match: "/api/v1/identity/refresh",
    body: { session: { access_token: "ssp_at_next", refresh_token: "ssp_rt_next", user_id: "user-1" } },
    assert: (init) => {
      assert.equal(init.method, "POST");
      assert.deepEqual(JSON.parse(init.body), { refresh_token: "ssp_rt_cli" });
    },
  }]));
  assert.equal(refreshed.ok, true);
  assert.equal(JSON.parse(readFileSync(sessionFile, "utf8")).access_token, "ssp_at_next");
  const cleared = await runCommand("session-clear", { session_file: sessionFile, oauth_state_file: oauthStateFile }, env);
  assert.equal(cleared.ok, true);
  rmSync(dir, { recursive: true, force: true });
});

test("help lists the supported commands", async () => {
  const result = await runCommand("help", {}, env);
  assert.equal(result.ok, true);
  assert.ok(result.data.commands.includes("auth-url"));
  assert.ok(result.data.commands.includes("session-clear"));
});

test("checkout validates plans, forwards one idempotency key, then creates payment", async () => {
  const calls = [];
  const result = await runCommand("checkout", { plan_code: "qimen-analysis-10", payment_channel: "alipay", idempotency_key: "stable-key", return_url: "https://qimen.example.test/billing/result?order_id={order_id}" }, env, mockFetch([
    { match: "/commerce/products/qimen/plans", body: { items: [{ plan_code: "qimen-analysis-10" }] }, assert: (init) => calls.push([init.method, "plans"]) },
    { match: "/commerce/orders", body: { order: { order_id: "order-1" } }, assert: (init) => { calls.push([init.method, "order"]); assert.deepEqual(JSON.parse(init.body), { product_code: "qimen", plan_code: "qimen-analysis-10", payment_channel: "alipay", idempotency_key: "stable-key" }); } },
    { match: "/commerce/payment-attempts", body: { payment_attempt_id: "attempt-1", provider_checkout_url: "https://pay.test/1" }, assert: (init) => { calls.push([init.method, "payment"]); assert.deepEqual(JSON.parse(init.body), { order_id: "order-1", product_code: "qimen", payment_channel: "alipay", payment_scene: "web", return_url: "https://qimen.example.test/billing/result?order_id=order-1" }); } },
  ]));
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [["GET", "plans"], ["POST", "order"], ["POST", "payment"]]);
  assert.equal(result.provider_checkout_url, "https://pay.test/1");
});

test("ai-contract exposes the server lifecycle and required inputs", async () => {
  const result = await runCommand("ai-contract", {}, env);
  assert.equal(result.data.route, "/api/agent");
  assert.deepEqual(result.data.plans, ["qimen-analysis-10", "qimen-kline-precise-1"]);
  assert.equal(result.data.gate_required, true);
});

test("anonymous gate is a successful boundary result and stays denied", async () => {
  const result = await runCommand("gate", {}, env, mockFetch([{ match: "/gate?access_scope=qimen-core", status: 401, body: { reason_code: "identity_session_invalid" } }]));
  assert.equal(result.ok, true);
  assert.equal(result.allowed, false);
  assert.equal(result.status, 401);
});

test("payment result requires an explicit order and forwards bearer only", async () => {
  const result = await runCommand("payment-result", { order_id: "order-1", token: "token-1" }, env, mockFetch([{ match: "/payment-result/order-1", body: { payment_status: "paid" }, assert: (init) => { assert.equal(init.method, "GET"); assert.equal(init.headers.Authorization, "Bearer token-1"); } }]));
  assert.equal(result.data.payment_status, "paid");
});

test("ai-health probes route reachability without posting an inference", async () => {
  const result = await runCommand("ai-health", {}, env, mockFetch([
    { match: "/api/health", body: { ok: true } },
    { match: "/api/version", body: { service: "qmdj" } },
    { match: "/api/agent", status: 405, body: { error: "method_not_allowed" }, assert: (init) => assert.equal(init.method, "GET") },
  ]));
  assert.equal(result.ok, true);
  assert.equal(result.data.ai_route.expected_method, "POST");
});

test("ai-run posts the real agent contract and forwards auth", async () => {
  const result = await runCommand("ai-run", {
    mode: "qimen",
    structured_text: "盘面摘要",
    json_payload: JSON.stringify({ chart: "qimen" }),
    question: "请分析",
    token: "token-1",
  }, env, mockFetch([{ match: "/api/agent", body: { answer: "ok" }, assert: (init) => {
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, "Bearer token-1");
    assert.equal(init.headers["content-type"], "application/json");
    assert.deepEqual(JSON.parse(init.body), { mode: "qimen", structuredText: "盘面摘要", jsonPayload: '{"chart":"qimen"}', question: "请分析" });
  } }]));
  assert.equal(result.ok, true);
  assert.equal(result.data.answer, "ok");
});

test("ai-run preserves provider and entitlement failures", async () => {
  const result = await runCommand("ai-run", { mode: "qimen", structured_text: "盘面", json_payload: "{}" }, env, mockFetch([{ match: "/api/agent", status: 402, body: { reasonCode: "usage_credit_required" } }]));
  assert.equal(result.ok, false);
  assert.equal(result.status, 402);
  assert.equal(result.data.reasonCode, "usage_credit_required");
});
