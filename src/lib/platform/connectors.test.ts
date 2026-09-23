import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountSubject } from "@/lib/agent/account-subject";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("@/lib/db/pool", () => ({ query: mocks.query, withTransaction: vi.fn() }));

import { listConnectors, setConnectorStatus } from "./connectors";

const subject: AccountSubject = { subjectType: "account", subjectId: "user-1" };

const row = (overrides: Record<string, unknown>) => ({
  id: "c1", provider: "calendar", status: "authorized", scopes_json: [],
  last_sync_at: null, metadata_json: {}, updated_at: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("listConnectors", () => {
  beforeEach(() => mocks.query.mockReset());

  it("returns the three known providers, filling gaps as not_connected", async () => {
    mocks.query.mockResolvedValue({ rows: [row({ provider: "email", status: "authorized" })] });
    const connectors = await listConnectors(subject);

    expect(connectors.map((item) => item.provider)).toEqual(["calendar", "email", "project_board"]);
    expect(connectors.find((item) => item.provider === "email")?.status).toBe("authorized");
    expect(connectors.find((item) => item.provider === "calendar")?.status).toBe("not_connected");
  });

  // The map is keyed by provider, so substituting a fallback for an unknown one
  // would let that row shadow the real connector of the same name — the query is
  // ordered by provider, so the unknown row can land last and win.
  it("skips a row whose provider is not in the closed set, without shadowing a real one", async () => {
    mocks.query.mockResolvedValue({
      rows: [
        row({ id: "real-calendar", provider: "calendar", status: "authorized" }),
        row({ id: "unknown", provider: "slack", status: "authorized" }),
      ],
    });

    const connectors = await listConnectors(subject);

    const calendar = connectors.find((item) => item.provider === "calendar");
    expect(calendar?.id).toBe("real-calendar");
    expect(calendar?.status).toBe("authorized");
  });

  it("narrows an unknown status instead of asserting the union", async () => {
    mocks.query.mockResolvedValue({ rows: [row({ provider: "calendar", status: "pending_review" })] });
    const connectors = await listConnectors(subject);

    expect(connectors.find((item) => item.provider === "calendar")?.status).toBe("not_connected");
  });
});

describe("setConnectorStatus", () => {
  beforeEach(() => mocks.query.mockReset());

  it("returns the written row", async () => {
    mocks.query.mockResolvedValue({ rows: [row({ provider: "email", status: "authorized" })] });
    await expect(setConnectorStatus(subject, "email", "authorized", ["read"]))
      .resolves.toMatchObject({ provider: "email", status: "authorized" });
  });

  // A provider outside the set means the database disagrees with this build;
  // reporting success would let the caller treat an unrepresentable write as done.
  it("answers null when the database returns an unrepresentable provider", async () => {
    mocks.query.mockResolvedValue({ rows: [row({ provider: "slack" })] });
    await expect(setConnectorStatus(subject, "email", "authorized")).resolves.toBeNull();
  });
});
