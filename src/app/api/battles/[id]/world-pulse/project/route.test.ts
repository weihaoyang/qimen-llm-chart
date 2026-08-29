import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ subject: vi.fn(), get: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class AccountSubjectError extends Error { status = 401; },
  requireAccountSubject: mocks.subject,
}));
vi.mock("@/lib/scenarios/world-pulse-project-repository", () => ({
  getWorldPulseProject: mocks.get,
  saveWorldPulseProject: mocks.save,
}));

import { GET, PUT } from "./route";

const battleId = "00000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id: battleId }) };
const project = { version: 3, scenes: [{ id: "scene-1", title: "Test", shots: [] }] };

describe("world pulse scene project route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subject.mockResolvedValue({ subjectType: "account", subjectId: "user-1" });
    mocks.get.mockResolvedValue({ accessible: true, project: null });
    mocks.save.mockResolvedValue({ id: "project-1", version: 1, reused: false });
  });

  it("returns an empty durable project slot for an accessible battle", async () => {
    const response = await GET(new Request(`http://local/api/battles/${battleId}/world-pulse/project`), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ project: null });
  });

  it("saves a bounded versioned scene project", async () => {
    const response = await PUT(new Request(`http://local/api/battles/${battleId}/world-pulse/project`, {
      method: "PUT",
      headers: { "content-type": "application/json", "idempotency-key": "scene-save-00000001" },
      body: JSON.stringify({ project, expectedVersion: 0 }),
    }), context);
    expect(response.status).toBe(201);
    expect(mocks.save).toHaveBeenCalledWith(expect.anything(), battleId, expect.objectContaining({
      project,
      schemaVersion: 3,
      idempotencyKey: "scene-save-00000001",
      expectedVersion: 0,
    }));
  });

  it("rejects oversized shot collections before database write", async () => {
    const invalid = { version: 3, scenes: [{ id: "scene-1", title: "Too many", shots: Array.from({ length: 501 }, () => ({})) }] };
    const response = await PUT(new Request(`http://local/api/battles/${battleId}/world-pulse/project`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project: invalid, idempotencyKey: "scene-save-00000002" }),
    }), context);
    expect(response.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("returns optimistic concurrency conflicts without overwriting", async () => {
    mocks.save.mockResolvedValue("version_conflict");
    const response = await PUT(new Request(`http://local/api/battles/${battleId}/world-pulse/project`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project, idempotencyKey: "scene-save-00000003", expectedVersion: 2 }),
    }), context);
    expect(response.status).toBe(409);
    expect((await response.json()).reasonCode).toBe("version_conflict");
  });
});
