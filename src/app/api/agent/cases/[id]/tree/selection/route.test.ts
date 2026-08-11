import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAccountSubjectMock, selectTreeBranchMock } = vi.hoisted(() => ({
  requireAccountSubjectMock: vi.fn(),
  selectTreeBranchMock: vi.fn(),
}));

vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class AccountSubjectError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
  requireAccountSubject: requireAccountSubjectMock,
}));

vi.mock("@/lib/agent/cases-repository", () => ({ selectTreeBranch: selectTreeBranchMock }));

import { POST } from "./route";

const caseId = "00000000-0000-4000-8000-000000000001";
const branchId = "00000000-0000-4000-8000-000000000002";
const context = { params: Promise.resolve({ id: caseId }) };
const request = (body: unknown) => new Request(`http://localhost/api/agent/cases/${caseId}/tree/selection`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

describe("POST /api/agent/cases/[id]/tree/selection", () => {
  beforeEach(() => {
    requireAccountSubjectMock.mockReset();
    selectTreeBranchMock.mockReset();
    requireAccountSubjectMock.mockResolvedValue({ subjectType: "user", subjectId: "subject-1" });
  });

  it("rejects invalid identifiers before accessing a workspace", async () => {
    const response = await POST(request({ branchId: "not-a-uuid" }), context);
    expect(response.status).toBe(400);
    expect(selectTreeBranchMock).not.toHaveBeenCalled();
  });

  it("delegates selection through the authenticated product workspace boundary", async () => {
    selectTreeBranchMock.mockResolvedValue({ branch: { id: branchId, key: "advance", selectedAt: "2026-08-12T00:00:00.000Z" } });
    const response = await POST(request({ branchId }), context);
    expect(response.status).toBe(200);
    expect(selectTreeBranchMock).toHaveBeenCalledWith({ subjectType: "user", subjectId: "subject-1" }, caseId, branchId);
  });

  it("does not expose a branch from another tree", async () => {
    selectTreeBranchMock.mockResolvedValue({ invalidBranch: true });
    const response = await POST(request({ branchId }), context);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "分支不属于当前决策树。" });
  });
});
