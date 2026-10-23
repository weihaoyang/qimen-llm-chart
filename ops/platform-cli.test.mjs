import test from "node:test";
import assert from "node:assert/strict";
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

test("auth-url emits the complete PKCE contract", async () => {
  const result = await runCommand("auth-url", {}, env);
  const url = new URL(result.data.url);
  assert.equal(url.searchParams.get("client_id"), "qimen");
  assert.equal(url.searchParams.get("product_code"), "qimen");
  assert.equal(url.searchParams.get("access_scope"), "qimen-core");
  assert.equal(url.searchParams.get("redirect_uri"), "https://qimen.example.test/auth/callback");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("code_challenge").length, 43);
  assert.equal(url.searchParams.get("state").length, 43);
  assert.equal(result.data.code_verifier.length >= 43, true);
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
