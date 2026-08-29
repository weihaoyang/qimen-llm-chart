import { beforeEach, describe, expect, it, vi } from "vitest";

const gate = vi.hoisted(() => vi.fn());
const getBattle = vi.hoisted(() => vi.fn());
const getModuleState = vi.hoisted(() => vi.fn());
const saveModuleState = vi.hoisted(() => vi.fn());
const getOfficialCatalogEntry = vi.hoisted(() => vi.fn());
const consumeUsage = vi.hoisted(() => vi.fn());
vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class extends Error { constructor(public status:number, message:string) { super(message); } },
  requireAccountSubject: vi.fn(async () => ({ subjectType:"user", subjectId:"u1" })),
}));
vi.mock("@/lib/battle/repository", () => ({ getBattle }));
vi.mock("@/lib/battle/product-state", () => ({ getModuleState, saveModuleState }));
vi.mock("@/lib/platform/server", () => ({ AGENT_PLAN_CODE:"agent", readBearerToken:vi.fn(() => "token"), readCookieValue:vi.fn(() => ""), readPlatformCookieHeader:vi.fn(() => ""), fetchPlatformGate:gate }));
vi.mock("@/lib/catalog/official-repository", () => ({ getOfficialCatalogEntry, OFFICIAL_CATALOG_TYPES:{ skillTemplate:"skill_template" } }));
vi.mock("../../usage/route", () => ({ POST: consumeUsage }));

import { POST } from "./route";

const battleId = "11111111-1111-4111-8111-111111111111";
const context = (templateId:string) => ({ params:Promise.resolve({ id:battleId, templateId }) });
const request = () => new Request(`http://local/api/battles/${battleId}/templates/tpl-saas-crisis`, { method:"POST", headers:{ "content-type":"application/json" }, body:"{}" });

describe("template activation route", () => {
  beforeEach(() => { getOfficialCatalogEntry.mockReset(); getOfficialCatalogEntry.mockImplementation(async (_type:string, id:string) => id === "tpl-saas-crisis" ? { id, version:1, payload:{} } : null); consumeUsage.mockReset(); getBattle.mockReset(); getModuleState.mockReset(); saveModuleState.mockReset(); gate.mockReset(); });
  it("rejects a template that is not in the official catalog", async () => {
    const response = await POST(request(), context("not-in-catalog"));
    expect(response.status).toBe(404);
    expect(getBattle).not.toHaveBeenCalled();
  });

  it("checks battle access and the platform gate for official templates", async () => {
    consumeUsage.mockResolvedValue(new Response(JSON.stringify({ module:{ state:{ ownedTemplateIds:["tpl-saas-crisis"] } } }), { status:200, headers:{ "content-type":"application/json" } }));
    const response = await POST(request(), context("tpl-saas-crisis"));
    expect(response.status).toBe(200);
    expect(consumeUsage).toHaveBeenCalledOnce();
    expect(JSON.parse(await response.text())).toMatchObject({ templateId:"tpl-saas-crisis", ownedTemplateIds:["tpl-saas-crisis"] });
  });
});
