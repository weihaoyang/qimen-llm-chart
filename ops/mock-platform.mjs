import http from "node:http";

const subjects = {
  "owner-token": "owner-1",
  "advisor-token": "advisor-1",
  "viewer-token": "viewer-1",
  "third-party-token": "third-party-1",
};

const json = (response, status, body) => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const token = (request.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const subjectId = subjects[token] ?? "";
  if (url.pathname.endsWith("/gate")) {
    json(response, subjectId ? 200 : 401, {
      allowed: Boolean(subjectId), mode: subjectId ? "account" : "blocked",
      product_code: "shengtian-banzi", access_scope: "shengtian-banzi-core",
      subject_type: subjectId ? "user" : "", subject_id: subjectId,
      entitlement_source: "test-mock", reason_code: subjectId ? "" : "unauthorized", message: "",
    });
    return;
  }
  if (url.pathname.includes("/usage/")) {
    json(response, 200, { product_code: "shengtian-banzi", available: 99, reserved: 0, consumed: 0, reservation_id: "test-reservation" });
    return;
  }
  json(response, 404, { message: "not found" });
});

server.listen(Number(process.env.MOCK_PLATFORM_PORT ?? 3321), "127.0.0.1");
process.on("SIGTERM", () => server.close(() => process.exit(0)));
