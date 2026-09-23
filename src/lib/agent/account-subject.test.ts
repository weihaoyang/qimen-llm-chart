import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ gate: vi.fn() }));

vi.mock("@/lib/platform/server", () => ({
  fetchPlatformGate: mocks.gate,
  readBearerToken: (value: string | null) => (value?.startsWith("Bearer ") ? value.slice(7) : null),
  readCookieValue: () => "",
  readPlatformCookieHeader: (value: string | null) => value ?? "",
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
    mocks.gate.mockReset();
  });

  it("derives identity from the platform gate rather than from the request", async () => {
    mocks.gate.mockResolvedValue({ allowed: true, subject_type: "org", subject_id: "org-7" });

    const subject = await requireAccountSubject(request("Bearer token-1"));

    expect(mocks.gate).toHaveBeenCalledWith("token-1", undefined);
    expect(subject).toEqual({ subjectType: "org", subjectId: "org-7" });
  });

  it("falls back to a user subject when the platform omits the type", async () => {
    mocks.gate.mockResolvedValue({ allowed: true, subject_id: "u-1" });

    expect(await requireAccountSubject(request("Bearer token-1"))).toEqual({
      subjectType: "user",
      subjectId: "u-1",
    });
  });

  it("rejects a request that carries no credential without calling the platform", async () => {
    await expect(requireAccountSubject(request())).rejects.toBeInstanceOf(AccountSubjectError);
    expect(mocks.gate).not.toHaveBeenCalled();
  });

  it("rejects a gate response that carries no subject", async () => {
    mocks.gate.mockResolvedValue({ allowed: true, subject_id: "" });

    await expect(requireAccountSubject(request("Bearer token-1"))).rejects.toThrow("平台账户身份无效，请重新登录。");
  });

  // This is the division of responsibility behind audit item Q: the gate is
  // consulted on *every* authenticated request, but this helper consumes it for
  // identity only. Whether a *denied* entitlement blocks the request is decided
  // by each caller — at the point where it spends something (a new AI job, a new
  // reservation), not at the point where it reads something already paid for.
  // Keeping that split here means the identity path can never be skipped, while
  // replays of purchased results stay readable.
  it("returns the subject even when the entitlement is denied", async () => {
    mocks.gate.mockResolvedValue({ allowed: false, subject_type: "user", subject_id: "u-9", reason_code: "entitlement_missing" });

    expect(await requireAccountSubject(request("Bearer token-1"))).toEqual({
      subjectType: "user",
      subjectId: "u-9",
    });
    expect(mocks.gate).toHaveBeenCalledTimes(1);
  });

  it("queries the gate for cookie-authenticated callers too", async () => {
    mocks.gate.mockResolvedValue({ allowed: true, subject_id: "u-2" });

    await requireAccountSubject(request(undefined, "qmdj_platform_access=abc"));

    expect(mocks.gate).toHaveBeenCalledTimes(1);
  });
});
