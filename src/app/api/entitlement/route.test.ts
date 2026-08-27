import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSubjectError } from "@/lib/agent/account-subject";

const { requireSubject, fetchUsage } = vi.hoisted(() => ({ requireSubject: vi.fn(), fetchUsage: vi.fn() }));
vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class extends Error { constructor(public status: number, message: string) { super(message); } },
  requireAccountSubject: requireSubject,
}));
vi.mock("@/lib/platform/server", () => ({
  AGENT_PLAN_CODE: "agent",
  fetchPlatformUsage: fetchUsage,
  readBearerToken: () => "token",
  readCookieValue: () => "csrf",
  readPlatformCookieHeader: () => "ssp_access=token",
}));

describe("GET /api/entitlement", () => {
  beforeEach(() => { requireSubject.mockReset(); fetchUsage.mockReset(); });

  it("returns only platform-owned usage balance", async () => {
    requireSubject.mockResolvedValue({ subjectType: "user", subjectId: "u-1" });
    fetchUsage.mockResolvedValue({ product_code: "shengtian-banzi", available: 20, reserved: 3, consumed: 7 });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://local/api/entitlement", { headers: { authorization: "Bearer token" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ usage: { product_code: "shengtian-banzi", available: 20, reserved: 3, consumed: 7 } });
    expect(fetchUsage).toHaveBeenCalledWith("token", { planCode: "agent" });
  });

  it("fails closed when account authentication is missing", async () => {
    const error = new AccountSubjectError(401, "请先登录平台账户。");
    requireSubject.mockRejectedValue(error);
    const { GET } = await import("./route");
    const response = await GET(new Request("http://local/api/entitlement"));
    expect(response.status).toBe(401);
    expect(fetchUsage).not.toHaveBeenCalled();
  });
});
