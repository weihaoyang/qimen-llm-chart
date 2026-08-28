import { beforeEach, describe, expect, it, vi } from "vitest";

const confirmInterviewExtraction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class extends Error { constructor(public status:number, message:string) { super(message); } },
  requireAccountSubject: vi.fn(async () => ({ subjectType:"user", subjectId:"u1" })),
}));
vi.mock("@/lib/battle/repository", () => ({ confirmInterviewExtraction }));

import { POST } from "./route";

const battleId = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id:battleId }) };
const request = (body: Record<string, unknown>) => new Request(`http://local/api/battles/${battleId}/interview/confirm`, {
  method:"POST",
  headers:{ "content-type":"application/json" },
  body:JSON.stringify(body),
});

describe("interview confirmation route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("commits facts and constraints through one repository command", async () => {
    confirmInterviewExtraction.mockResolvedValue({ facts:[], constraints:[], reused:false });
    const response = await POST(request({
      confirmationKey:"msg-1",
      facts:[{ kind:"fact", content:"客户续约窗口为 14 天", confidence:90, source:"user", occurredAt:null, verifiedAt:null }],
      constraints:[{ kind:"time", label:"续约窗口", description:"14 天内完成", hard:true, severity:4 }],
    }), context);
    expect(response.status).toBe(201);
    expect(confirmInterviewExtraction).toHaveBeenCalledWith(
      { subjectType:"user", subjectId:"u1" }, battleId, "msg-1",
      expect.arrayContaining([expect.objectContaining({ kind:"fact", source:"user" })]),
      expect.arrayContaining([expect.objectContaining({ kind:"time", label:"续约窗口" })]),
    );
  });

  it("returns the existing result on an idempotent retry", async () => {
    confirmInterviewExtraction.mockResolvedValue({ facts:[], constraints:[], reused:true });
    const response = await POST(request({ confirmationKey:"msg-1", facts:[{ kind:"fact", content:"客户续约窗口为 14 天", confidence:90, source:"user", occurredAt:null, verifiedAt:null }], constraints:[] }), context);
    expect(response.status).toBe(200);
  });

  it("rejects AI facts before touching storage", async () => {
    const response = await POST(request({
      confirmationKey:"msg-ai",
      facts:[{ kind:"fact", content:"模型猜测", confidence:80, source:"ai", occurredAt:null, verifiedAt:null }],
      constraints:[],
    }), context);
    expect(response.status).toBe(400);
    expect(confirmInterviewExtraction).not.toHaveBeenCalled();
  });
});
