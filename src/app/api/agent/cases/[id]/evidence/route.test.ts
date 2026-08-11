import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAccountSubjectMock, getLatestEvidenceSnapshotMock, saveEvidenceSnapshotMock } = vi.hoisted(() => ({
  requireAccountSubjectMock: vi.fn(),
  getLatestEvidenceSnapshotMock: vi.fn(),
  saveEvidenceSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class AccountSubjectError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
  requireAccountSubject: requireAccountSubjectMock,
}));

vi.mock("@/lib/agent/cases-repository", () => ({
  getLatestEvidenceSnapshot: getLatestEvidenceSnapshotMock,
  saveEvidenceSnapshot: saveEvidenceSnapshotMock,
}));

import { GET, POST } from "./route";

const caseId = "00000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id: caseId }) };
const request = (method = "GET", body?: unknown) => new Request(`http://localhost/api/agent/cases/${caseId}/evidence`, {
  method,
  headers: body === undefined ? undefined : { "content-type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

describe("/api/agent/cases/[id]/evidence", () => {
  beforeEach(() => {
    requireAccountSubjectMock.mockReset();
    getLatestEvidenceSnapshotMock.mockReset();
    saveEvidenceSnapshotMock.mockReset();
    requireAccountSubjectMock.mockResolvedValue({ subjectType: "user", subjectId: "subject-1" });
  });

  it("rejects an invalid case id before checking account access", async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(response.status).toBe(400);
    expect(requireAccountSubjectMock).not.toHaveBeenCalled();
  });

  it("requires the platform account subject", async () => {
    const { AccountSubjectError } = await import("@/lib/agent/account-subject");
    requireAccountSubjectMock.mockRejectedValue(new AccountSubjectError(401, "请先登录。"));
    const response = await GET(request(), context);
    expect(response.status).toBe(401);
    expect(getLatestEvidenceSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns no evidence when the authenticated owner does not own the case", async () => {
    getLatestEvidenceSnapshotMock.mockResolvedValue(null);
    const response = await GET(request(), context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ evidence: null });
    expect(getLatestEvidenceSnapshotMock).toHaveBeenCalledWith({ subjectType: "user", subjectId: "subject-1" }, caseId);
  });

  it("writes an evidence snapshot only through the authenticated product workspace", async () => {
    saveEvidenceSnapshotMock.mockResolvedValue({ id: "snapshot-1" });
    const response = await POST(request("POST", { mode: "qimen", sourceText: "盘面事实", structuredJson: { chart: "snapshot" } }), context);
    expect(response.status).toBe(201);
    expect(saveEvidenceSnapshotMock).toHaveBeenCalledWith(
      { subjectType: "user", subjectId: "subject-1" },
      caseId,
      { mode: "qimen", sourceText: "盘面事实", structuredJson: { chart: "snapshot" } },
    );
  });

  it("rejects a mode that the product cannot restore", async () => {
    const response = await POST(request("POST", { mode: "unknown", sourceText: "盘面事实", structuredJson: {} }), context);
    expect(response.status).toBe(400);
    expect(saveEvidenceSnapshotMock).not.toHaveBeenCalled();
  });
});
