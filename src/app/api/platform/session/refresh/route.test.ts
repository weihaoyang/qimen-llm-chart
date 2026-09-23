import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/config", () => ({
  requirePlatformServerConfig: () => ({
    baseUrl: "https://platform.example.com",
    productCode: "shengtian-banzi",
  }),
}));

const REFRESH = "bridge-refresh-0123456789abcdef";
const NEW_ACCESS = "rotated-access-0123456789abcdef";
const NEW_REFRESH = "rotated-refresh-0123456789abcdef";

const platformResponse = (
  body: unknown,
  status = 200,
  cookies: Record<string, string> = {},
) => {
  const headers = new Headers({ "content-type": "application/json" });
  for (const [name, value] of Object.entries(cookies)) {
    headers.append("set-cookie", `${name}=${value}; Path=/; HttpOnly`);
  }
  return new Response(JSON.stringify(body), { status, headers });
};

const post = (cookie?: string) => {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new Request("http://local/api/platform/session/refresh", { method: "POST", headers });
};

describe("POST /api/platform/session/refresh", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    fetchSpy.mockReset();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rotates the refresh token upstream and installs the new pair", async () => {
    fetchSpy.mockResolvedValue(
      platformResponse(
        { session: { user_id: "u_1" }, csrf_token: "rotated-csrf" },
        200,
        { ssp_access: NEW_ACCESS, ssp_refresh: NEW_REFRESH },
      ),
    );

    const { POST } = await import("./route");
    const response = await POST(post(`qmdj_platform_refresh=${REFRESH}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: { user_id: "u_1" },
      csrf_token: "rotated-csrf",
    });

    const [url, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://platform.example.com/api/v1/identity/refresh");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ refresh_token: REFRESH });

    const cookies = response.headers.getSetCookie();
    expect(cookies.find((value) => value.startsWith("qmdj_platform_access="))).toContain(NEW_ACCESS);
    expect(cookies.find((value) => value.startsWith("qmdj_platform_refresh="))).toContain(NEW_REFRESH);
    expect(cookies.find((value) => value.startsWith("qmdj_platform_csrf="))).toContain("rotated-csrf");
  });

  it("keeps the presented refresh token when the platform does not rotate it", async () => {
    fetchSpy.mockResolvedValue(
      platformResponse({ session: { user_id: "u_1" } }, 200, { ssp_access: NEW_ACCESS }),
    );

    const { POST } = await import("./route");
    const response = await POST(post(`qmdj_platform_refresh=${REFRESH}`));

    expect(response.status).toBe(200);
    const cookies = response.headers.getSetCookie();
    expect(cookies.find((value) => value.startsWith("qmdj_platform_refresh="))).toContain(REFRESH);
  });

  it("fails closed when the platform rejects the refresh token", async () => {
    fetchSpy.mockResolvedValue(platformResponse({ message: "invalid_grant" }, 401));

    const { POST } = await import("./route");
    const response = await POST(post(`qmdj_platform_refresh=${REFRESH}`));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "平台登录已过期。" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("fails closed when the platform reports success without issuing a usable token", async () => {
    fetchSpy.mockResolvedValue(platformResponse({ session: { user_id: "u_1" } }, 200));

    const { POST } = await import("./route");
    const response = await POST(post(`qmdj_platform_refresh=${REFRESH}`));

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("does not call the platform when there is no refresh cookie", async () => {
    const { POST } = await import("./route");

    expect((await POST(post())).status).toBe(401);
    expect((await POST(post("qmdj_platform_refresh=short"))).status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
