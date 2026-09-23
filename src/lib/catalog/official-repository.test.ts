import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/db/pool", () => ({
  query: mocks.query,
  withTransaction: mocks.withTransaction,
}));

/**
 * The repository memoizes its seed attempt in module scope, so every test needs
 * a fresh module instance to observe a first attempt.
 */
const loadRepository = async () => {
  vi.resetModules();
  return import("@/lib/catalog/official-repository");
};

/** Stands in for the `pg` client handed to a `withTransaction` callback. */
type FakeClient = { query: ReturnType<typeof vi.fn> };

describe("ensureOfficialCatalogSeeded", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.withTransaction.mockReset();
  });

  it("collapses a concurrent cold start into a single seed transaction", async () => {
    // Read paths await this function, so N concurrent first requests must not
    // mean N transactions queued on the advisory lock with every reader blocked
    // behind them.
    let release!: () => void;
    mocks.withTransaction.mockImplementation(
      () => new Promise<void>((resolve) => { release = () => resolve(); }),
    );
    const { ensureOfficialCatalogSeeded } = await loadRepository();

    const attempts = Array.from({ length: 8 }, () => ensureOfficialCatalogSeeded());

    expect(mocks.withTransaction).toHaveBeenCalledTimes(1);

    release();
    await Promise.all(attempts);
    expect(mocks.withTransaction).toHaveBeenCalledTimes(1);
  });

  it("seeds once per process and skips every later call", async () => {
    mocks.withTransaction.mockResolvedValue(undefined);
    const { ensureOfficialCatalogSeeded } = await loadRepository();

    await ensureOfficialCatalogSeeded();
    await ensureOfficialCatalogSeeded();
    await ensureOfficialCatalogSeeded();

    expect(mocks.withTransaction).toHaveBeenCalledTimes(1);
  });

  it("shares one failing attempt across concurrent callers", async () => {
    mocks.withTransaction.mockRejectedValue(new Error("database unreachable"));
    const { ensureOfficialCatalogSeeded } = await loadRepository();

    const results = await Promise.allSettled([
      ensureOfficialCatalogSeeded(),
      ensureOfficialCatalogSeeded(),
      ensureOfficialCatalogSeeded(),
    ]);

    expect(results.map((result) => result.status)).toEqual(["rejected", "rejected", "rejected"]);
    expect(mocks.withTransaction).toHaveBeenCalledTimes(1);
  });

  it("retries on the next request after a failed attempt", async () => {
    // A process that booted before the database was reachable must not stay
    // unseeded for its whole lifetime.
    mocks.withTransaction
      .mockRejectedValueOnce(new Error("database unreachable"))
      .mockResolvedValueOnce(undefined);
    const { ensureOfficialCatalogSeeded } = await loadRepository();

    await expect(ensureOfficialCatalogSeeded()).rejects.toThrow("database unreachable");
    await expect(ensureOfficialCatalogSeeded()).resolves.toBeUndefined();

    expect(mocks.withTransaction).toHaveBeenCalledTimes(2);
  });

  it("takes the advisory lock, then inserts every entry conflict-tolerantly", async () => {
    // The lock is what makes the multi-process case safe; the `DO NOTHING` clause
    // is what makes the repeated attempt safe. Both must sit inside the
    // transaction, or a second process can fail the whole boot on a duplicate.
    const client: FakeClient = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    mocks.withTransaction.mockImplementation(
      async (run: (client: FakeClient) => Promise<void>) => { await run(client); },
    );
    const { ensureOfficialCatalogSeeded } = await loadRepository();

    await ensureOfficialCatalogSeeded();

    const [lockSql] = client.query.mock.calls[0];
    expect(String(lockSql)).toContain("pg_advisory_xact_lock");

    const inserts = client.query.mock.calls.slice(1);
    expect(inserts.length).toBeGreaterThan(0);
    for (const [sql] of inserts) {
      expect(String(sql)).toContain("ON CONFLICT (catalog_type,entry_id,version) DO NOTHING");
    }
  });
});

describe("catalog payload validation", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.withTransaction.mockReset();
    mocks.withTransaction.mockResolvedValue(undefined);
  });

  // `payload_json` is jsonb, so it can hold a scalar. `as T` compiled for that
  // shape and let a string reach callers typed as a catalog entry.
  it.each([
    ["a string", '"just-text"'],
    ["a number", "42"],
    ["null", "null"],
    ["a boolean", "true"],
  ])("rejects a scalar payload_json (%s) instead of casting it", async (_label, payload) => {
    mocks.query.mockResolvedValue({ rows: [{ entry_id: "e1", version: 1, payload_json: JSON.parse(payload) }] });
    const { listOfficialCatalog } = await loadRepository();

    await expect(listOfficialCatalog("persona")).rejects.toThrow(/官方目录数据损坏/);
  });

  it("accepts an object payload", async () => {
    mocks.query.mockResolvedValue({ rows: [{ entry_id: "e1", version: 1, payload_json: { name: "顾问" } }] });
    const { listOfficialCatalog } = await loadRepository();

    await expect(listOfficialCatalog("persona")).resolves.toEqual([{ id: "e1", version: 1, payload: { name: "顾问" } }]);
  });

  // The world-pulse ticker is stored as a JSON array, so the guard must not
  // assume every catalog payload is an object.
  it("accepts an array payload", async () => {
    mocks.query.mockResolvedValue({ rows: [{ entry_id: "default", version: 1, payload_json: [{ id: "t1" }] }] });
    const { getOfficialCatalogEntry } = await loadRepository();

    await expect(getOfficialCatalogEntry("world_pulse_ticker", "default"))
      .resolves.toEqual({ id: "default", version: 1, payload: [{ id: "t1" }] });
  });

  it("guards the single-entry read as well as the list read", async () => {
    mocks.query.mockResolvedValue({ rows: [{ entry_id: "default", version: 1, payload_json: "scalar" }] });
    const { getOfficialCatalogEntry } = await loadRepository();

    await expect(getOfficialCatalogEntry("world_pulse_ticker", "default")).rejects.toThrow(/官方目录数据损坏/);
  });
});
