import { beforeEach, describe, expect, it, vi } from "vitest";

const getModuleState = vi.hoisted(() => vi.fn());
const saveModuleState = vi.hoisted(() => vi.fn());
vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class extends Error { constructor(public status:number, message:string) { super(message); } },
  requireAccountSubject: vi.fn(async () => ({ subjectType:"user", subjectId:"u1" })),
}));
vi.mock("@/lib/battle/product-state", () => ({ getModuleState, saveModuleState }));

import { PUT } from "./route";

const battleId = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id:battleId, moduleId:"risk-monitor" }) };
const request = (body:Record<string,unknown>, headers:Record<string,string> = {}) => new Request(`http://local/api/battles/${battleId}/modules/risk-monitor`, {
  method:"PUT",
  headers:{ "content-type":"application/json", ...headers },
  body:JSON.stringify(body),
});

describe("module state route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards idempotency and optimistic version metadata", async () => {
    saveModuleState.mockResolvedValue({ version:4, state:{ riskBreakers:[] }, consent:{}, updatedAt:"2026-08-29T00:00:00.000Z", reused:false });
    const response = await PUT(request({ state:{ riskBreakers:[] }, expectedVersion:3 }, { "Idempotency-Key":"risk-save-4" }), context);
    expect(response.status).toBe(200);
    expect(saveModuleState).toHaveBeenCalledWith(expect.anything(), battleId, "risk-monitor", { riskBreakers:[] }, {}, { idempotencyKey:"risk-save-4", expectedVersion:3 });
  });

  it("returns a recoverable conflict when the database rejects a stale write", async () => {
    saveModuleState.mockResolvedValue("conflict");
    const response = await PUT(request({ state:{ riskBreakers:[] }, expectedVersion:2 }), context);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ reasonCode:"module_write_conflict" });
  });
});
