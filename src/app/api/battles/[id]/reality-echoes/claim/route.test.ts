import { beforeEach, describe, expect, it, vi } from "vitest";

const claim = vi.hoisted(() => vi.fn());
vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class extends Error { constructor(public status:number, message:string) { super(message); } },
  requireAccountSubject: vi.fn(async () => ({ subjectType:"user", subjectId:"u1" })),
}));
vi.mock("@/lib/battle/product-state", () => ({ claimRealityEchoReward: claim }));

import { POST } from "./route";

const battleId = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id:battleId }) };
const request = (body: Record<string, unknown>) => new Request(`http://local/api/battles/${battleId}/reality-echoes/claim`, { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(body) });

describe("reality echo reward claim route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects malformed claims before storage", async () => {
    const response = await POST(request({}), context);
    expect(response.status).toBe(400);
    expect(claim).not.toHaveBeenCalled();
  });

  it("returns a recoverable platform-review state", async () => {
    claim.mockResolvedValue({ version:3, state:{ items:[{ id:"echo-1", rewardClaimStatus:"pending_platform" }] }, consent:{}, updatedAt:"2026-08-28T00:00:00.000Z", reused:false });
    const response = await POST(request({ echoId:"echo-1" }), context);
    expect(response.status).toBe(200);
    expect(claim).toHaveBeenCalledWith(expect.anything(), battleId, "echo-1");
    await expect(response.json()).resolves.toMatchObject({ reused:false, state:{ version:3 } });
  });

  it("maps incomplete echoes to a conflict without writing", async () => {
    claim.mockResolvedValue("not_ready");
    const response = await POST(request({ echoId:"echo-1" }), context);
    expect(response.status).toBe(409);
  });
});
