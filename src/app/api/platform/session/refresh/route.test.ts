import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshOAuthTokenMock = vi.hoisted(() => vi.fn());
vi.mock("@singseq/platform-sdk", () => ({ refreshOAuthToken: refreshOAuthTokenMock }));

vi.mock("@/lib/platform/config", () => ({
  requirePlatformServerConfig: () => ({
    baseUrl: "https://platform.example.com",
    productCode: "qimen",
    clientId: "qimen-web",
  }),
}));

const REFRESH = "bridge-refresh-0123456789abcdef";
const NEW_ACCESS = "rotated-access-0123456789abcdef";
const NEW_REFRESH = "rotated-refresh-0123456789abcdef";

const post = (cookie?: string) => {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new Request("http://local/api/platform/session/refresh", { method: "POST", headers });
};

describe("POST /api/platform/session/refresh", () => {
  beforeEach(() => {
    refreshOAuthTokenMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rotates the refresh token upstream and installs the new pair", async () => {
    refreshOAuthTokenMock.mockResolvedValue({ access_token: NEW_ACCESS, refresh_token: NEW_REFRESH, expires_in: 3600, token_type: "Bearer" });

    const { POST } = await import("./route");
    const response = await POST(post(`qmdj_platform_refresh=${REFRESH}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ session: { access_token: NEW_ACCESS }, csrf_token: "" });
    expect(refreshOAuthTokenMock).toHaveBeenCalledWith({ baseUrl: "https://platform.example.com", clientId: "qimen-web", refreshToken: REFRESH });

    const cookies = response.headers.getSetCookie();
    expect(cookies.find((value) => value.startsWith("qmdj_platform_access="))).toContain(NEW_ACCESS);
    expect(cookies.find((value) => value.startsWith("qmdj_platform_refresh="))).toContain(NEW_REFRESH);
    expect(cookies.some((value) => value.startsWith("qmdj_platform_csrf="))).toBe(false);
  });

  it("keeps the presented refresh token when the platform does not rotate it", async () => {
    refreshOAuthTokenMock.mockResolvedValue({ access_token: NEW_ACCESS, refresh_token: REFRESH, expires_in: 3600, token_type: "Bearer" });

    const { POST } = await import("./route");
    const response = await POST(post(`qmdj_platform_refresh=${REFRESH}`));

    expect(response.status).toBe(200);
    const cookies = response.headers.getSetCookie();
    expect(cookies.find((value) => value.startsWith("qmdj_platform_refresh="))).toContain(REFRESH);
  });

  it("fails closed when the platform rejects the refresh token", async () => {
    refreshOAuthTokenMock.mockRejectedValue(Object.assign(new Error("invalid grant"), { status: 401 }));

    const { POST } = await import("./route");
    const response = await POST(post(`qmdj_platform_refresh=${REFRESH}`));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "平台登录已过期。" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("fails closed when the platform reports success without issuing a usable token", async () => {
    refreshOAuthTokenMock.mockResolvedValue({ access_token: "", refresh_token: "", expires_in: 3600, token_type: "Bearer" });

    const { POST } = await import("./route");
    const response = await POST(post(`qmdj_platform_refresh=${REFRESH}`));

    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("does not call the platform when there is no refresh cookie", async () => {
    const { POST } = await import("./route");

    expect((await POST(post())).status).toBe(401);
    expect((await POST(post("qmdj_platform_refresh=short"))).status).toBe(401);
    expect(refreshOAuthTokenMock).not.toHaveBeenCalled();
  });
});

describe("bridge refresh Origin guard", () => {
  beforeEach(() => {
    refreshOAuthTokenMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const withOrigin = (origin: string, cookie: string) =>
    new Request("http://local/api/platform/session/refresh", {
      method: "POST",
      headers: { origin, cookie },
    });

  it("rejects a cross-site Origin before touching the platform or the cookie", async () => {
    const { POST } = await import("./route");
    const response = await POST(withOrigin("https://evil.example", `qmdj_platform_refresh=${REFRESH}`));

    expect(response.status).toBe(403);
    expect(refreshOAuthTokenMock).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("accepts the request's own Origin", async () => {
    refreshOAuthTokenMock.mockResolvedValue({ access_token: NEW_ACCESS, refresh_token: NEW_REFRESH, expires_in: 3600, token_type: "Bearer" });
    const { POST } = await import("./route");
    const response = await POST(withOrigin("http://local", `qmdj_platform_refresh=${REFRESH}`));

    expect(response.status).toBe(200);
  });
});
