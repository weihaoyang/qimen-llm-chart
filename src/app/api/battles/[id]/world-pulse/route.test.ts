import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  subject: vi.fn(),
  catalog: vi.fn(),
  list: vi.fn(),
  record: vi.fn(),
}));

vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class AccountSubjectError extends Error { status = 401; },
  requireAccountSubject: mocks.subject,
}));
vi.mock("@/lib/catalog/official-repository", () => ({
  OFFICIAL_CATALOG_TYPES: { worldPulse: "world_pulse" },
  getOfficialCatalogEntry: mocks.catalog,
}));
vi.mock("@/lib/scenarios/world-pulse-repository", () => ({
  listWorldPulseInterventions: mocks.list,
  recordWorldPulseIntervention: mocks.record,
}));

import { GET, POST } from "./route";

const battleId = "00000000-0000-4000-8000-000000000001";

describe("world pulse battle persistence route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subject.mockResolvedValue({ subjectType: "account", subjectId: "user-1" });
    mocks.catalog.mockResolvedValue({ id: "evt-1", version: 1, payload: {} });
    mocks.list.mockResolvedValue([]);
    mocks.record.mockResolvedValue({ id: "int-1", reused: false });
  });

  it("lists only the current battle's persisted interventions", async () => {
    const response = await GET(new Request("http://local"), { params: Promise.resolve({ id: battleId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ interventions: [] });
    expect(mocks.list).toHaveBeenCalledWith({ subjectType: "account", subjectId: "user-1" }, battleId);
  });

  it("rejects stale catalog versions before writing", async () => {
    mocks.catalog.mockResolvedValue({ id: "evt-1", version: 2, payload: {} });
    const response = await POST(new Request("http://local", {
      method: "POST",
      body: JSON.stringify({ eventId: "evt-1", eventVersion: 1, action: "observe", idempotencyKey: "pulse-key-1" }),
    }), { params: Promise.resolve({ id: battleId }) });
    expect(response.status).toBe(409);
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("persists a versioned intervention and returns 201", async () => {
    const response = await POST(new Request("http://local", {
      method: "POST",
      body: JSON.stringify({ eventId: "evt-1", eventVersion: 1, action: "observe", idempotencyKey: "pulse-key-1", request: { source: "gev" } }),
    }), { params: Promise.resolve({ id: battleId }) });
    expect(response.status).toBe(201);
    expect(mocks.record).toHaveBeenCalledWith({ subjectType: "account", subjectId: "user-1" }, battleId, expect.objectContaining({ eventId: "evt-1", eventVersion: 1, action: "observe", idempotencyKey: "pulse-key-1" }));
  });
});
