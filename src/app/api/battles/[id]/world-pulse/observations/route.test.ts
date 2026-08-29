import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ subject: vi.fn(), list: vi.fn(), record: vi.fn() }));
vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class AccountSubjectError extends Error { status = 401; },
  requireAccountSubject: mocks.subject,
}));
vi.mock("@/lib/scenarios/world-pulse-observation-repository", () => ({
  listWorldPulseObservations: mocks.list,
  recordWorldPulseObservation: mocks.record,
}));

import { GET, POST } from "./route";

const battleId = "00000000-0000-4000-8000-000000000027";
const base = {
  source: "gods-eye-view", observationKey: "view:2026-08-30T12:00:00.000Z",
  observationType: "viewport", title: "World Pulse view", observedAt: "2026-08-30T12:00:00.000Z",
  location: { latitude: 30.2672, longitude: -97.7431 }, snapshot: { enabledLayers: ["earthquakes"] },
  idempotencyKey: "world-pulse-observation-key-0001",
};

describe("world pulse observations route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subject.mockResolvedValue({ subjectType: "account", subjectId: "user-1" });
    mocks.list.mockResolvedValue([]);
    mocks.record.mockResolvedValue({ id: "obs-1", reused: false });
  });

  it("returns only observations readable by the current subject", async () => {
    const response = await GET(new Request("http://local"), { params: Promise.resolve({ id: battleId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ observations: [] });
    expect(mocks.list).toHaveBeenCalledWith({ subjectType: "account", subjectId: "user-1" }, battleId);
  });

  it("records an explicit bounded map observation", async () => {
    const response = await POST(new Request("http://local", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(base) }), { params: Promise.resolve({ id: battleId }) });
    expect(response.status).toBe(201);
    expect(mocks.record).toHaveBeenCalledWith({ subjectType: "account", subjectId: "user-1" }, battleId, expect.objectContaining({ source: "gods-eye-view", observationType: "viewport" }));
  });

  it("rejects invalid source URLs and oversized snapshots before persisting", async () => {
    const badUrl = await POST(new Request("http://local", { method: "POST", body: JSON.stringify({ ...base, sourceUrl: "http://insecure.example" }) }), { params: Promise.resolve({ id: battleId }) });
    expect(badUrl.status).toBe(400);
    const huge = await POST(new Request("http://local", { method: "POST", body: JSON.stringify({ ...base, snapshot: { value: "x".repeat(64_001) } }) }), { params: Promise.resolve({ id: battleId }) });
    expect(huge.status).toBe(413);
    expect(mocks.record).not.toHaveBeenCalled();
  });
});
