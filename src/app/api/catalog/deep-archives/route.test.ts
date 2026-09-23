import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAccountSubject: vi.fn(),
  listUnlockedArchiveIds: vi.fn(),
  listOfficialCatalog: vi.fn(),
}));

vi.mock("@/lib/agent/account-subject", () => ({
  // Mirrors the real class signature `(status, message)` so the route's
  // `instanceof` check and `.status` read behave exactly as in production.
  AccountSubjectError: class AccountSubjectError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "AccountSubjectError";
      this.status = status;
    }
  },
  requireAccountSubject: mocks.requireAccountSubject,
}));

vi.mock("@/lib/battle/extended-repository", () => ({
  listUnlockedArchiveIds: mocks.listUnlockedArchiveIds,
}));

vi.mock("@/lib/catalog/official-repository", () => ({
  catalogVersions: { deepArchives: "v1" },
  listOfficialCatalog: mocks.listOfficialCatalog,
  OFFICIAL_CATALOG_TYPES: { deepArchive: "deep-archive" },
}));

import { AccountSubjectError } from "@/lib/agent/account-subject";
import { GET } from "./route";

const request = () => new Request("http://local/api/catalog/deep-archives");

describe("deep archive catalog paywall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAccountSubject.mockResolvedValue({ subjectType: "account", subjectId: "user-1" });
  });

  it("withholds the paid sequence from an archive the account has not unlocked", async () => {
    mocks.listUnlockedArchiveIds.mockResolvedValue(new Set<string>());
    mocks.listOfficialCatalog.mockResolvedValue([
      { id: "archive-1", payload: { isUnlocked: false, finalRippleSequence: ["secret"], title: "Locked" } },
    ]);

    const response = await GET(request());

    expect(response.status).toBe(200);
    const body = await response.json() as { archives: Array<Record<string, unknown>> };
    expect(body.archives[0]).not.toHaveProperty("finalRippleSequence");
    expect(body.archives[0]).toMatchObject({ title: "Locked" });
  });

  it("reveals the sequence once the account has unlocked that archive", async () => {
    mocks.listUnlockedArchiveIds.mockResolvedValue(new Set(["archive-1"]));
    mocks.listOfficialCatalog.mockResolvedValue([
      { id: "archive-1", payload: { isUnlocked: false, finalRippleSequence: ["secret"], title: "Unlocked" } },
    ]);

    const response = await GET(request());

    const body = await response.json() as { archives: Array<Record<string, unknown>> };
    expect(body.archives[0].finalRippleSequence).toEqual(["secret"]);
  });

  it("scopes the unlock check to the requesting account", async () => {
    mocks.listUnlockedArchiveIds.mockResolvedValue(new Set<string>());
    mocks.listOfficialCatalog.mockResolvedValue([
      { id: "archive-1", payload: { finalRippleSequence: ["secret"] } },
    ]);

    await GET(request());

    // A missing unlock set must never be inferred from the catalog payload
    // itself; the answer has to come from the caller's own account.
    expect(mocks.listUnlockedArchiveIds).toHaveBeenCalledWith({ subjectType: "account", subjectId: "user-1" });
  });

  it("does not serve the catalog to an unauthenticated caller", async () => {
    mocks.requireAccountSubject.mockRejectedValue(new AccountSubjectError(401, "请先登录。"));

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(mocks.listOfficialCatalog).not.toHaveBeenCalled();
  });
});
