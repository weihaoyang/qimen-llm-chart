import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ subject: vi.fn(), list: vi.fn(), save: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class AccountSubjectError extends Error { status = 401; },
  requireAccountSubject: mocks.subject,
}));
vi.mock("@/lib/battle/product-state", () => ({
  listMemories: mocks.list,
  saveMemory: mocks.save,
  deleteMemory: mocks.remove,
}));

import { DELETE, GET, POST } from "./route";

describe("AI memory route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subject.mockResolvedValue({ subjectType: "account", subjectId: "memory-user" });
    mocks.list.mockResolvedValue([{ id: "00000000-0000-4000-8000-000000000001", title: "My decision", memory: { lessonLearned: "Verify facts" }, consentStatus: "active" }]);
  });

  it("exports only the current subject's memory collection as a no-store download", async () => {
    const response = await GET(new Request("http://local/api/battles/memories?format=json"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("shengtian-banzi-memories.json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).memories).toEqual([{ id: "00000000-0000-4000-8000-000000000001", title: "My decision", memory: { lessonLearned: "Verify facts" }, consentStatus: "active" }]);
    expect(mocks.list).toHaveBeenCalledWith({ subjectType: "account", subjectId: "memory-user" });
  });

  it("updates a UUID memory through the server-owned repository", async () => {
    mocks.save.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001" });
    const response = await POST(new Request("http://local/api/battles/memories", {
      method: "POST",
      body: JSON.stringify({
        id: "00000000-0000-4000-8000-000000000001",
        battleId: "00000000-0000-4000-8000-000000000002",
        title: "Edited memory",
        memory: { memoryQuote: "Rechecked" },
        consentStatus: "paused",
      }),
    }));
    expect(response.status).toBe(201);
    expect(mocks.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      id: "00000000-0000-4000-8000-000000000001",
      consentStatus: "paused",
    }));
  });

  it("rejects malformed identifiers before touching durable state", async () => {
    const response = await DELETE(new Request("http://local/api/battles/memories?id=not-a-uuid", { method: "DELETE" }));
    expect(response.status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
