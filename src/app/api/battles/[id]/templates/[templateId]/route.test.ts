import { describe, expect, it, vi } from "vitest";

const gate = vi.hoisted(() => vi.fn());
const getBattle = vi.hoisted(() => vi.fn());
const getModuleState = vi.hoisted(() => vi.fn());
const saveModuleState = vi.hoisted(() => vi.fn());
vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class extends Error { constructor(public status:number, message:string) { super(message); } },
  requireAccountSubject: vi.fn(async () => ({ subjectType:"user", subjectId:"u1" })),
}));
vi.mock("@/lib/battle/repository", () => ({ getBattle }));
vi.mock("@/lib/battle/product-state", () => ({ getModuleState, saveModuleState }));
vi.mock("@/lib/platform/server", () => ({ AGENT_PLAN_CODE:"agent", readBearerToken:vi.fn(() => "token"), readCookieValue:vi.fn(() => ""), readPlatformCookieHeader:vi.fn(() => ""), fetchPlatformGate:gate }));

import { POST } from "./route";

const battleId = "11111111-1111-4111-8111-111111111111";
const context = (templateId:string) => ({ params:Promise.resolve({ id:battleId, templateId }) });
const request = () => new Request(`http://local/api/battles/${battleId}/templates/tpl-saas-crisis`, { method:"POST", headers:{ "content-type":"application/json" }, body:"{}" });

describe("template activation route", () => {
  it("rejects a template that is not in the official catalog", async () => {
    const response = await POST(request(), context("not-in-catalog"));
    expect(response.status).toBe(404);
    expect(getBattle).not.toHaveBeenCalled();
  });

  it("checks battle access and the platform gate for official templates", async () => {
    getBattle.mockResolvedValue({ id:battleId });
    getModuleState.mockResolvedValue(null);
    saveModuleState.mockResolvedValue({ version:1 });
    gate.mockResolvedValue({ allowed:true, entitlement_source:"test" });
    const response = await POST(request(), context("tpl-saas-crisis"));
    expect(response.status).toBe(200);
    expect(gate).toHaveBeenCalledOnce();
    expect(saveModuleState).toHaveBeenCalledOnce();
  });
});
