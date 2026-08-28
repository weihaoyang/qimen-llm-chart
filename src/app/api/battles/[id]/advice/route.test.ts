import { beforeEach, describe, expect, it, vi } from "vitest";

const createAdvice = vi.hoisted(() => vi.fn());
const listAdvice = vi.hoisted(() => vi.fn());
const updateAdviceStatus = vi.hoisted(() => vi.fn());
const adoptAdvice = vi.hoisted(() => vi.fn());
vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class extends Error { constructor(public status:number, message:string) { super(message); } },
  requireAccountSubject: vi.fn(async () => ({ subjectType:"user", subjectId:"u1" })),
}));
vi.mock("@/lib/battle/extended-repository", () => ({ createAdvice, listAdvice, updateAdviceStatus, adoptAdvice }));

import { POST } from "./route";

const battleId = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id:battleId }) };
const request = (body: Record<string, unknown>, headers: Record<string,string> = {}) => new Request(`http://local/api/battles/${battleId}/advice`, { method:"POST", headers:{ "content-type":"application/json", ...headers }, body:JSON.stringify(body) });

describe("advisor advice route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards a stable idempotency key", async () => {
    createAdvice.mockResolvedValue({ id:"advice-1", status:"proposed" });
    const response = await POST(request({ targetType:"battle", opinion:"先核验采购流程", rationale:"客户已重启合规审查", uncertainty:"采购负责人是否更换未知", idempotencyKey:"advisor-key-1" }), context);
    expect(response.status).toBe(201);
    expect(createAdvice).toHaveBeenCalledWith(expect.anything(), battleId, expect.objectContaining({ idempotencyKey:"advisor-key-1" }));
  });

  it("accepts the HTTP idempotency header for older clients", async () => {
    createAdvice.mockResolvedValue({ id:"advice-2", status:"proposed" });
    const response = await POST(request({ targetType:"battle", opinion:"保留退出选项", rationale:"当前现金窗口很短", uncertainty:"—" }, { "Idempotency-Key":"advisor-header-1" }), context);
    expect(response.status).toBe(201);
    expect(createAdvice).toHaveBeenCalledWith(expect.anything(), battleId, expect.objectContaining({ idempotencyKey:"advisor-header-1" }));
  });
});
