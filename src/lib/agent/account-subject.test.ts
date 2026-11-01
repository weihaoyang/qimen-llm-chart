import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ account: vi.fn(), cookieValue: vi.fn(() => "") }));

vi.mock("@/lib/platform/server", () => ({
  fetchPlatformAccount: mocks.account,
  readBearerToken: (value: string | null) => (value?.startsWith("Bearer ") ? value.slice(7) : null),
  readCookieValue: mocks.cookieValue,
}));

import { AccountSubjectError, requireAccountSubject } from "./account-subject";

const request = (authorization?: string, cookie?: string) => {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);
  return new Request("http://local/api/agent", { method: "POST", headers });
};

describe("requireAccountSubject", () => {
  beforeEach(() => {
    mocks.account.mockReset();
  });

  it("derives identity from the platform account endpoint rather than from the request", async () => {
    mocks.account.mockResolvedValue({ subject_id: "user-7", name: "User" });

    const subject = await requireAccountSubject(request("Bearer token-1"));

    expect(mocks.account).toHaveBeenCalledWith("token-1");
    expect(subject).toEqual({ subjectType: "user", subjectId: "user-7" });
  });

  it("uses the canonical account subject", async () => {
    mocks.account.mockResolvedValue({ subject_id: "u-1", name: "User" });

    expect(await requireAccountSubject(request("Bearer token-1"))).toEqual({
      subjectType: "user",
      subjectId: "u-1",
    });
  });

  it("rejects a request that carries no credential without calling the platform", async () => {
    await expect(requireAccountSubject(request())).rejects.toBeInstanceOf(AccountSubjectError);
    expect(mocks.account).not.toHaveBeenCalled();
  });

  it("rejects an account response that carries no subject", async () => {
    mocks.account.mockResolvedValue({ subject_id: "" });

    await expect(requireAccountSubject(request("Bearer token-1"))).rejects.toThrow("平台账户身份无效，请重新登录。");
  });

  it("returns the authenticated subject without consulting entitlement state", async () => {
    mocks.account.mockResolvedValue({ subject_id: "u-9", name: "User" });

    expect(await requireAccountSubject(request("Bearer token-1"))).toEqual({
      subjectType: "user",
      subjectId: "u-9",
    });
    expect(mocks.account).toHaveBeenCalledTimes(1);
  });

});
