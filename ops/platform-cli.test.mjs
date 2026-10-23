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
