import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountSubject } from "@/lib/agent/account-subject";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/db/pool", () => ({
  query: mocks.query,
  withTransaction: mocks.withTransaction,
}));

import { BattleIntegrityError, addTimeline, replaceOpportunities } from "./extended-repository";
import { UserFacingError } from "@/lib/user-facing-error";

const subject: AccountSubject = { subjectType: "account", subjectId: "user-1" };
const battleId = "11111111-1111-4111-8111-111111111111";

/** Records every statement the repository issues through the transaction client. */
type Call = { text: string; values: unknown[] };

const installFakeClient = (options: { knownIds?: string[] } = {}) => {
  const calls: Call[] = [];
  const client = {
    query: vi.fn(async (text: string, values: unknown[] = []) => {
      calls.push({ text, values });
      if (text.includes("FROM battle_cases")) return { rowCount: 1, rows: [{ id: battleId }] };
      if (text.startsWith("DELETE FROM battle_opportunities")) return { rowCount: 0, rows: [] };
      if (text.includes("FROM battle_opportunities WHERE battle_id=$1 AND id = ANY")) {
        const known = options.knownIds ?? (values[1] as string[]);
        return { rowCount: known.length, rows: known.map((id) => ({ id })) };
      }
      if (text.startsWith("INSERT INTO battle_opportunities")) {
        // Echo back one row per placeholder group, deliberately reversed so the
        // test proves the repository re-orders rather than trusting the driver.
        const columnCount = 10;
        const ids = (values as string[]).filter((_value, index) => index % columnCount === 0).reverse();
        return {
          rowCount: ids.length,
          rows: ids.map((id) => ({
            id, battle_id: battleId, title: `t-${id}`, description: "d",
            source_json: {}, opens_at: null, best_action_at: null, closes_at: null,
            decay_json: {}, status: "open",
          })),
        };
      }
      return { rowCount: 1, rows: [] };
    }),
  };
  mocks.withTransaction.mockImplementation(async (run: (client: unknown) => unknown) => run(client));
  return calls;
};

const opportunity = (id: string) => ({
  id,
  title: `t-${id}`,
  description: "d",
  source: {},
  opensAt: null,
  bestActionAt: null,
  closesAt: null,
  decay: {},
  status: "open" as const,
});

describe("replaceOpportunities", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.withTransaction.mockReset();
  });

  // The route accepts up to 100 opportunities, and the transaction holds a
  // `FOR UPDATE` lock on the battle row for its whole duration.
  it("writes the whole list in a single statement", async () => {
    const calls = installFakeClient();
    const items = Array.from({ length: 25 }, (_value, index) => opportunity(`id-${index}`));

    const saved = await replaceOpportunities(subject, battleId, items);

    const inserts = calls.filter((call) => call.text.startsWith("INSERT INTO battle_opportunities"));
    expect(inserts).toHaveLength(1);
    expect(inserts[0].text.match(/\(\$/g)).toHaveLength(25);
    expect(saved).toHaveLength(25);
  });

  it("returns rows in the requested order even if the driver does not", async () => {
    installFakeClient();
    const items = [opportunity("id-a"), opportunity("id-b"), opportunity("id-c")];

    const saved = await replaceOpportunities(subject, battleId, items);

    expect(saved?.map((item) => item.id)).toEqual(["id-a", "id-b", "id-c"]);
  });

  it("updates existing rows through the conflict path rather than a second statement", async () => {
    const calls = installFakeClient();
    await replaceOpportunities(subject, battleId, [opportunity("id-a")]);

    const inserts = calls.filter((call) => call.text.startsWith("INSERT INTO battle_opportunities"));
    expect(inserts[0].text).toContain("ON CONFLICT (id) DO UPDATE SET");
    // Re-assigning battle_id on conflict could only ever be a cross-battle move.
    expect(inserts[0].text).not.toContain("battle_id=EXCLUDED.battle_id");
    expect(calls.filter((call) => call.text.startsWith("UPDATE battle_opportunities"))).toHaveLength(0);
  });

  it("rejects an id that does not belong to this battle", async () => {
    installFakeClient({ knownIds: [] });
    await expect(replaceOpportunities(subject, battleId, [opportunity("id-elsewhere")]))
      .rejects.toBeInstanceOf(BattleIntegrityError);
  });

  // Postgres refuses to touch the same row twice inside one ON CONFLICT command,
  // so a duplicate id has to be rejected up front instead of surfacing as a 500.
  it("rejects a repeated id", async () => {
    installFakeClient();
    await expect(replaceOpportunities(subject, battleId, [opportunity("id-a"), opportunity("id-a")]))
      .rejects.toThrow(/重复标识/);
  });

  // The status is a property of the failure, not of the route that surfaced it.
  // Routes used to re-derive that by hand (and two of them echoed `error.message`
  // straight back); carrying it here lets the shared mapper do it once.
  it("carries its own 400 so routes need no mapping branch", async () => {
    installFakeClient();
    const error = await replaceOpportunities(subject, battleId, [opportunity("id-a"), opportunity("id-a")])
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UserFacingError);
    expect((error as UserFacingError).status).toBe(400);
    // The concrete name survives so logs still say which layer rejected it.
    expect((error as Error).name).toBe("BattleIntegrityError");
  });

  it("still clears the list when given an empty array", async () => {
    const calls = installFakeClient();
    const saved = await replaceOpportunities(subject, battleId, []);
    expect(saved).toEqual([]);
    expect(calls.some((call) => call.text.startsWith("INSERT INTO battle_opportunities"))).toBe(false);
    expect(calls.some((call) => call.text.includes("UPDATE battle_cases SET updated_at"))).toBe(true);
  });
});

/** Fake client that answers the timeline's endpoint check and echoes inserts. */
const installTimelineClient = (options: { knownNodeIds?: string[] } = {}) => {
  const calls: Call[] = [];
  const client = {
    query: vi.fn(async (text: string, values: unknown[] = []) => {
      calls.push({ text, values });
      if (text.includes("FROM battle_cases")) return { rowCount: 1, rows: [{ id: battleId }] };
      if (text.includes("FROM battle_timeline_nodes WHERE battle_id=$1 AND id = ANY")) {
        const known = options.knownNodeIds ?? (values[1] as string[]);
        return { rowCount: known.length, rows: known.map((id) => ({ id })) };
      }
      if (text.startsWith("INSERT INTO battle_timeline_nodes")) {
        const groups = (values as unknown[]).reduce<unknown[][]>((acc, value, index) => {
          if (index % 10 === 0) acc.push([]);
          acc[acc.length - 1].push(value);
          return acc;
        }, []);
        // Returned in reverse so the ordering assertion proves the repository
        // re-orders rather than trusting the driver's row order.
        return {
          rowCount: groups.length,
          rows: groups.slice().reverse().map((group) => ({
            id: group[0], battle_id: battleId, kind: group[2], title: group[3], description: group[4],
            starts_at: null, ends_at: null, truth_status: group[7], importance: group[8], source_json: {},
          })),
        };
      }
      if (text.startsWith("INSERT INTO battle_timeline_edges")) {
        const ids = (values as string[]).filter((_value, index) => index % 7 === 0);
        return {
          rowCount: ids.length,
          rows: ids.map((id) => ({
            id, battle_id: battleId, from_node_id: "22222222-2222-4222-8222-222222222222",
            to_node_id: "33333333-3333-4333-8333-333333333333", relation: "causes", confidence: 50, evidence_json: {},
          })),
        };
      }
      return { rowCount: 1, rows: [] };
    }),
  };
  mocks.withTransaction.mockImplementation(async (run: (client: unknown) => unknown) => run(client));
  return calls;
};

describe("addTimeline", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.withTransaction.mockReset();
  });

  const node = (title: string) => ({
    kind: "fact" as const, title, description: "", startsAt: null, endsAt: null,
    truthStatus: "observed" as const, importance: 3, source: {},
  });
  const edge = () => ({
    fromNodeId: "22222222-2222-4222-8222-222222222222",
    toNodeId: "33333333-3333-4333-8333-333333333333",
    relation: "causes" as const, confidence: 50, evidence: {},
  });

  // The route accepts up to 200 nodes and 500 edges; the old loop issued one
  // statement each while holding the battle row's `FOR UPDATE` lock.
  it("writes all nodes and all edges in one statement each", async () => {
    const calls = installTimelineClient();
    const nodes = Array.from({ length: 40 }, (_value, index) => node(`n-${index}`));
    const edges = Array.from({ length: 60 }, () => edge());

    const saved = await addTimeline(subject, battleId, nodes, edges);

    expect(calls.filter((call) => call.text.startsWith("INSERT INTO battle_timeline_nodes"))).toHaveLength(1);
    expect(calls.filter((call) => call.text.startsWith("INSERT INTO battle_timeline_edges"))).toHaveLength(1);
    expect(saved?.nodes).toHaveLength(40);
    expect(saved?.edges).toHaveLength(60);
    expect(saved?.nodes.map((item) => item.title)).toEqual(nodes.map((item) => item.title));
  });

  it("checks every endpoint in one query", async () => {
    const calls = installTimelineClient();
    await addTimeline(subject, battleId, [node("a")], [edge()]);
    const lookups = calls.filter((call) => call.text.includes("FROM battle_timeline_nodes WHERE battle_id=$1 AND id = ANY"));
    expect(lookups).toHaveLength(1);
    expect(lookups[0].values[1]).toEqual([
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ]);
  });

  it("rejects an edge whose endpoint is not a node of this battle", async () => {
    installTimelineClient({ knownNodeIds: ["22222222-2222-4222-8222-222222222222"] });
    await expect(addTimeline(subject, battleId, [], [edge()]))
      .rejects.toThrow(/只能连接当前战局的节点/);
  });

  it("rejects a self-loop", async () => {
    installTimelineClient();
    const selfLoop = { ...edge(), toNodeId: "22222222-2222-4222-8222-222222222222" };
    await expect(addTimeline(subject, battleId, [], [selfLoop]))
      .rejects.toThrow(/不能指向自身/);
  });

  it("issues no insert statement for an empty batch", async () => {
    const calls = installTimelineClient();
    const saved = await addTimeline(subject, battleId, [], []);
    expect(saved).toEqual({ nodes: [], edges: [] });
    expect(calls.some((call) => call.text.startsWith("INSERT INTO battle_timeline"))).toBe(false);
  });
});
