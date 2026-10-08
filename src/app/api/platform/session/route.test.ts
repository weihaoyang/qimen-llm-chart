import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/config", () => ({
  requirePlatformServerConfig: () => ({
    baseUrl: "https://platform.example.com",
    productCode: "shengtian-banzi",
  }),
}));

const ACCESS = "bridge-access-0123456789abcdef";
const REFRESH = "bridge-refresh-0123456789abcdef";
const CSRF = "bridge-csrf-0123456789abcdef";

const request = (cookie?: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  return new Request("http://local/api/platform/session", { ...init, headers });
};

describe("GET /api/platform/session", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    fetchSpy.mockReset();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the cookie-backed access token without calling the platform", async () => {
    const { GET } = await import("./route");
    const response = await GET(request(`theme=dark; qmdj_platform_access=${ACCESS}; qmdj_platform_csrf=${CSRF}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: { access_token: ACCESS, csrf_token: CSRF },
      csrf_token: CSRF,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Regression guard for the non-idempotent-GET defect: a browser, a link
  // prefetcher or an intermediary cache may issue this request speculatively,
  // and rotating here would invalidate the caller's refresh token.
  it("does not rotate the session — no upstream call and no Set-Cookie", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      request(`qmdj_platform_access=${ACCESS}; qmdj_platform_refresh=${REFRESH}; qmdj_platform_csrf=${CSRF}`),
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("never hands the refresh token back to JavaScript", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      request(`qmdj_platform_access=${ACCESS}; qmdj_platform_refresh=${REFRESH}`),
    );

    expect(await response.text()).not.toContain(REFRESH);
  });

  it("reports an expired session when the access cookie is absent or malformed", async () => {
    const { GET } = await import("./route");
    for (const cookie of [undefined, "qmdj_platform_access=too-short"]) {
      const response = await GET(request(cookie));
      expect(response.status).toBe(401);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/platform/session", () => {
  it("installs the supplied token pair into httpOnly bridge cookies", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request(undefined, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ access_token: ACCESS, refresh_token: REFRESH, csrf_token: CSRF }),
      }),
    );

    expect(response.status).toBe(200);
    const cookies = response.headers.getSetCookie();
    const accessCookie = cookies.find((value) => value.startsWith("qmdj_platform_access="));
    expect(accessCookie).toContain(ACCESS);
    expect(accessCookie).toContain("HttpOnly");
    expect(accessCookie).toContain("Max-Age=3600");
    const refreshCookie = cookies.find((value) => value.startsWith("qmdj_platform_refresh="));
    expect(refreshCookie).toContain(REFRESH);
    expect(refreshCookie).toContain("HttpOnly");
    // The CSRF cookie is the one value the browser SDK must be able to read.
    const csrfCookie = cookies.find((value) => value.startsWith("qmdj_platform_csrf="));
    expect(csrfCookie).toContain(CSRF);
    expect(csrfCookie).not.toContain("HttpOnly");
  });

  it("rejects an incomplete token pair", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request(undefined, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ access_token: ACCESS, refresh_token: "short" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("DELETE /api/platform/session", () => {
  it("expires every bridge cookie", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(request());

    expect(response.status).toBe(200);
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(3);
    for (const name of ["qmdj_platform_access", "qmdj_platform_refresh", "qmdj_platform_csrf"]) {
      const cleared = cookies.find((value) => value.startsWith(`${name}=`));
      expect(cleared).toBeDefined();
      expect(cleared).toContain("Max-Age=0");
    }
  });
});

// SameSite=Lax does not stop a top-level cross-site <form> POST, and the body
// token is attacker-chosen, so a CSRF token cannot help — Origin is the only
// reliable signal that a write to the bridge is first-party.
describe("bridge write Origin guard", () => {
  const withOrigin = (origin: string | undefined, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (origin) headers.set("origin", origin);
    return new Request("http://local/api/platform/session", { ...init, headers });
  };

  const tokenBody = JSON.stringify({ access_token: ACCESS, refresh_token: REFRESH, csrf_token: CSRF });
  const writeInit: RequestInit = { method: "POST", headers: { "content-type": "application/json" }, body: tokenBody };

  it("rejects a cross-site Origin on every write method", async () => {
    const { PUT, POST, DELETE } = await import("./route");

    expect((await PUT(withOrigin("https://evil.example", writeInit))).status).toBe(403);
    expect((await POST(withOrigin("https://evil.example", writeInit))).status).toBe(403);
    expect((await DELETE(withOrigin("https://evil.example", { method: "DELETE" }))).status).toBe(403);
  });

  it("accepts the request's own Origin", async () => {
    const { POST } = await import("./route");
    const response = await POST(withOrigin("http://local", writeInit));

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().some((value) => value.startsWith("qmdj_platform_access="))).toBe(true);
  });

  it("accepts an absent Origin (same-origin fetch, curl, the test client)", async () => {
    const { DELETE } = await import("./route");
    expect((await DELETE(withOrigin(undefined, { method: "DELETE" }))).status).toBe(200);
  });

  it("trusts a proxied Host when the request URL is internal", async () => {
    const { DELETE } = await import("./route");
    const headers = new Headers({
      origin: "https://qmdj.singseq.com",
      host: "qmdj.singseq.com",
      "x-forwarded-proto": "https",
    });
    const request = new Request("http://internal:3000/api/platform/session", { method: "DELETE", headers });

    expect((await DELETE(request)).status).toBe(200);
  });
});

