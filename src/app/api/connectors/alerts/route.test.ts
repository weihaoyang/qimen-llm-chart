import { describe, expect, it, vi } from "vitest";

const { requireSubject, listAlerts, dismissAlert } = vi.hoisted(() => ({ requireSubject:vi.fn(), listAlerts:vi.fn(), dismissAlert:vi.fn() }));
vi.mock("@/lib/agent/account-subject", () => ({ AccountSubjectError:class extends Error { constructor(public status:number,message:string){super(message);} }, requireAccountSubject:requireSubject }));
vi.mock("@/lib/platform/connectors", () => ({ listConnectorAlerts:listAlerts, dismissConnectorAlert:dismissAlert }));
import { GET, DELETE } from "./route";

describe("connector alert route", () => {
  it("lists account-scoped active alerts", async () => {
    requireSubject.mockResolvedValue({ subjectType:"user", subjectId:"u1" });
    listAlerts.mockResolvedValue([{ id:"a1" }]);
    const response = await GET(new Request("http://local/api/connectors/alerts"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ alerts:[{ id:"a1" }] });
  });
  it("validates alert id before dismissing", async () => {
    const response = await DELETE(new Request("http://local/api/connectors/alerts?id=bad"));
    expect(response.status).toBe(400);
    expect(dismissAlert).not.toHaveBeenCalled();
  });
});
