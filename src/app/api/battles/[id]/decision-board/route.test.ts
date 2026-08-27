import { beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class extends Error { constructor(public status:number, message:string) { super(message); } },
  requireAccountSubject: vi.fn(async () => ({ subjectType:"user", subjectId:"u1" })),
}));
vi.mock("@/lib/battle/product-state", () => ({ mutateDecisionBoard: mutate }));

import { POST } from "./route";

const battleId = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id:battleId }) };
const request = (body: Record<string, unknown>) => new Request(`http://local/api/battles/${battleId}/decision-board`, { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(body) });

describe("decision board command route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates and forwards a comment command", async () => {
    mutate.mockResolvedValue({ version:2, state:{ comments:[] }, consent:{}, updatedAt:"2026-08-28T00:00:00.000Z", role:"contributor" });
    const response = await POST(request({ action:"comment", targetType:"GENERAL", targetTitle:"全局战局", content:"请核验现金跑道。" }), context);
    expect(response.status).toBe(200);
    expect(mutate).toHaveBeenCalledWith(expect.anything(), battleId, expect.objectContaining({ type:"comment", content:"请核验现金跑道。" }));
  });

  it("rejects malformed or unknown commands before touching storage", async () => {
    expect((await POST(request({ action:"comment", targetType:"GENERAL", targetTitle:"全局战局", content:"" }), context)).status).toBe(400);
    expect((await POST(request({ action:"unknown" }), context)).status).toBe(400);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("maps server role denial to 403", async () => {
    mutate.mockResolvedValue("forbidden");
    const response = await POST(request({ action:"ghost_strategy", strategyName:"替代路径", coreThesis:"先验证", suggestedAction:"约谈", estimatedSurvivalProb:50, pros:"快", cons:"贵" }), context);
    expect(response.status).toBe(403);
  });
});
