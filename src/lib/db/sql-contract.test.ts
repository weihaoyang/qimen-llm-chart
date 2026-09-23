/**
 * The repository's SQL, executed by a real Postgres.
 *
 * `extended-repository.test.ts` and friends mock `@/lib/db/pool` and assert the
 * *shape* of the statements: that a batch produces one `INSERT` with N tuples,
 * that `ON CONFLICT (id) DO UPDATE` is present, that ids come back re-ordered.
 * None of that can tell you whether the statement is *correct*. A cast written
 * against the wrong column type is still one statement with N tuples; it just
 * stores the wrong value.
 *
 * Two bugs of exactly that kind were found while writing this file:
 *
 *   - `agent_decision_branches.validation_date` is `timestamptz`, but the batch
 *     cast was `date`. Postgres accepted it and silently truncated the instant,
 *     so a branch validated at `13:45Z` was stored as `00:00Z`.
 *   - `battle_inventory_items.quantity` is `numeric`, but the cast was `int`, so
 *     a fractional quantity was rounded on write while the column existed
 *     specifically to hold one.
 *
 * Both compile. Both pass a mocked-client test. This file is the reason they
 * were caught, so it asserts stored *values*, not statement text.
 *
 * A third defect surfaced here that had nothing to do with casts: `appendInventory`
 * deduplicated on the AI job id per item, and every card of one model response
 * shares that id, so a multi-card job was stored as a single row.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { query } from "@/lib/db/pool";
import { addBattleFacts, appendInventory, commitMove, listBattles, replaceBattleConstraints, replaceInventory, replaceJunctions, saveExecutionPlan, saveMoveSet, updateDraftMoveSource } from "@/lib/battle/repository";
import { UserFacingError } from "@/lib/user-facing-error";
import { BattleIntegrityError, addTimeline, createAdvice, replaceOpportunities } from "@/lib/battle/extended-repository";
import { saveTreeVersion } from "@/lib/agent/cases-repository";
import { appendInterviewTurn, listInterviewTurns } from "@/lib/battle/interview-repository";
import { cloneScenario } from "@/lib/scenarios/repository";
import { SCENARIOS } from "@/lib/scenarios/catalog";
import { installTestPool } from "./testing/pglite-harness";

let database: Awaited<ReturnType<typeof installTestPool>>;

beforeAll(async () => { database = await installTestPool(); });
afterAll(async () => { await database.close(); });

/** A fresh owner per test, so nothing leaks between them through a shared row. */
const account = (): AccountSubject => ({ subjectType: "account", subjectId: `sql-contract-${randomUUID()}` });

const createBattle = async (subject: AccountSubject) => {
  const id = randomUUID();
  await query(
    `INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective,status) VALUES($1,$2,$3,'契约战局','验证批量写入的真实语义','active')`,
    [id, subject.subjectType, subject.subjectId],
  );
  return id;
};

const createCase = async (subject: AccountSubject) => {
  const id = randomUUID();
  await query(
    `INSERT INTO agent_cases(id,platform_subject_type,platform_subject_id,title,question,status) VALUES($1,$2,$3,'契约议题','验证决策树写入','active')`,
    [id, subject.subjectType, subject.subjectId],
  );
  return id;
};

const node = (title: string) => ({
  kind: "fact" as const, title, description: "", startsAt: null, endsAt: null,
  truthStatus: "observed" as const, importance: 3, source: {},
});

const link = (fromNodeId: string, toNodeId: string) => ({
  fromNodeId, toNodeId, relation: "causes" as const, confidence: 50, evidence: {},
});

const opportunity = (id: string | undefined, title = "机会") => ({
  ...(id ? { id } : {}),
  title, description: "d", source: {}, opensAt: null, bestActionAt: null,
  closesAt: null, decay: {}, status: "open" as const,
});

describe("migrations", () => {
  it("applies the whole directory to an empty database", async () => {
    const result = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
    );
    expect(result.rows.map((row) => row.table_name)).toEqual(expect.arrayContaining([
      "battle_cases", "battle_timeline_nodes", "battle_timeline_edges", "battle_opportunities",
      "battle_facts", "battle_constraints", "battle_inventory_items",
      "agent_cases", "agent_decision_branches", "account_connectors",
    ]));
  });

  // 032 adds these as `NOT VALID`, which still enforces them on every new write.
  // Without this assertion the constraint could be dropped by a later migration
  // and nothing would notice, because `NOT VALID` never reports a failure.
  it("rejects a non-object written into a column guarded by migration 032", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const writeSource = (source: unknown) => query(
      `INSERT INTO battle_timeline_nodes(id,battle_id,kind,title,description,truth_status,importance,source_json) VALUES($1,$2,'fact','节点','','observed',3,$3::jsonb)`,
      [randomUUID(), battleId, JSON.stringify(source)],
    );

    await expect(writeSource("scalar")).rejects.toThrow(/battle_timeline_nodes_source_json_object/);
    await expect(writeSource([1, 2])).rejects.toThrow(/battle_timeline_nodes_source_json_object/);
    // NULL and an object both have to keep working, or the constraint is a
    // migration that breaks the product.
    await expect(writeSource({ ok: true })).resolves.toBeDefined();
  });
});

describe("addTimeline", () => {
  it("persists every node and edge and returns them in the requested order", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const seeded = await addTimeline(owner, battleId, [node("seed-a"), node("seed-b")], []);
    const [a, b] = seeded!.nodes;

    const saved = await addTimeline(owner, battleId, [node("n1"), node("n2"), node("n3")], [link(a.id, b.id), link(b.id, a.id)]);

    expect(saved!.nodes.map((item) => item.title)).toEqual(["n1", "n2", "n3"]);
    expect(saved!.edges.map((item) => item.fromNodeId)).toEqual([a.id, b.id]);
    const stored = await query<{ title: string }>(
      `SELECT title FROM battle_timeline_nodes WHERE battle_id=$1 ORDER BY title`, [battleId],
    );
    expect(stored.rows.map((row) => row.title)).toEqual(["n1", "n2", "n3", "seed-a", "seed-b"]);
  });

  it("rejects an endpoint that belongs to another battle", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const otherBattle = await createBattle(owner);
    const foreign = (await addTimeline(owner, otherBattle, [node("f1"), node("f2")], []))!.nodes;

    await expect(addTimeline(owner, battleId, [], [link(foreign[0].id, foreign[1].id)]))
      .rejects.toThrow(/只能连接当前战局的节点/);
  });

  // The endpoint check runs before the node inserts, so a node created by this
  // same request is not yet a legal endpoint. Preserved from the pre-batching
  // implementation, and easy to "fix" by accident when reordering statements.
  it("does not accept a node created by the same request as an endpoint", async () => {
    const owner = account();
    const battleId = await createBattle(owner);

    await expect(addTimeline(owner, battleId, [node("n1")], [link(randomUUID(), randomUUID())]))
      .rejects.toThrow(/只能连接当前战局的节点/);
    const stored = await query(`SELECT 1 FROM battle_timeline_nodes WHERE battle_id=$1`, [battleId]);
    expect(stored.rowCount).toBe(0);
  });

  it("rejects a self-loop", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const seeded = (await addTimeline(owner, battleId, [node("a")], []))!.nodes[0];

    await expect(addTimeline(owner, battleId, [], [link(seeded.id, seeded.id)]))
      .rejects.toThrow(/不能指向自身/);
  });
});

describe("replaceOpportunities", () => {
  it("inserts, updates and removes in a single call", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const first = (await replaceOpportunities(owner, battleId, [opportunity(undefined), opportunity(undefined), opportunity(undefined)]))!;
    expect(first).toHaveLength(3);

    const kept = first[0].id;
    const saved = (await replaceOpportunities(owner, battleId, [
      opportunity(kept, "已改名"),
      opportunity(undefined, "新增"),
    ]))!;

    expect(saved.map((item) => item.title)).toEqual(["已改名", "新增"]);
    const stored = await query<{ id: string; title: string }>(
      `SELECT id,title FROM battle_opportunities WHERE battle_id=$1`, [battleId],
    );
    expect(stored.rows.map((row) => row.id).sort()).toEqual([kept, saved[1].id].sort());
    expect(stored.rows.find((row) => row.id === kept)!.title).toBe("已改名");
  });

  // The `DELETE` runs before the id check, so this is the one place in the
  // batching work where a rejected request has already modified rows. If the
  // transaction did not roll back, the request would both 400 *and* destroy data.
  it("rolls the delete back when a later id check fails", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const seeded = (await replaceOpportunities(owner, battleId, [opportunity(undefined), opportunity(undefined)]))!;
    const otherBattle = await createBattle(owner);
    const foreign = (await replaceOpportunities(owner, otherBattle, [opportunity(undefined)]))![0];

    await expect(replaceOpportunities(owner, battleId, [opportunity(seeded[0].id), opportunity(foreign.id)]))
      .rejects.toBeInstanceOf(BattleIntegrityError);

    const stored = await query<{ id: string }>(`SELECT id FROM battle_opportunities WHERE battle_id=$1`, [battleId]);
    expect(stored.rows.map((row) => row.id).sort()).toEqual(seeded.map((item) => item.id).sort());
    // The foreign row must still belong to its own battle: the conflict target is
    // the primary key, so without the guard the upsert would have moved it here.
    const untouched = await query<{ battle_id: string }>(`SELECT battle_id FROM battle_opportunities WHERE id=$1`, [foreign.id]);
    expect(untouched.rows[0].battle_id).toBe(otherBattle);
  });

  it("rejects a repeated id before writing anything", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const id = randomUUID();

    await expect(replaceOpportunities(owner, battleId, [opportunity(id), opportunity(id)]))
      .rejects.toThrow(/重复标识/);
    const stored = await query(`SELECT 1 FROM battle_opportunities WHERE battle_id=$1`, [battleId]);
    expect(stored.rowCount).toBe(0);
  });

  it("clears the open list when given an empty array", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    await replaceOpportunities(owner, battleId, [opportunity(undefined)]);

    expect(await replaceOpportunities(owner, battleId, [])).toEqual([]);
    const stored = await query(`SELECT 1 FROM battle_opportunities WHERE battle_id=$1`, [battleId]);
    expect(stored.rowCount).toBe(0);
  });
});

describe("addBattleFacts", () => {
  // `occurred_at` / `verified_at` are nullable `timestamptz`, and the batch write
  // is the only path that sends a literal string for them.
  it("stores timestamps as instants and keeps nulls null", async () => {
    const owner = account();
    const battleId = await createBattle(owner);

    const saved = (await addBattleFacts(owner, battleId, [
      { kind: "fact", content: "a", source: "user", confidence: 80, occurredAt: "2026-09-21T13:45:00.000Z", verifiedAt: null },
      { kind: "fact", content: "b", source: "user", confidence: 50, occurredAt: null, verifiedAt: "2026-09-20T23:30:00.000Z" },
    ]))!;

    expect(saved.map((item) => item.content)).toEqual(["a", "b"]);
    expect(saved[0].occurredAt).toBe("2026-09-21T13:45:00.000Z");
    expect(saved[0].verifiedAt).toBeNull();
    expect(saved[1].occurredAt).toBeNull();
    expect(saved[1].verifiedAt).toBe("2026-09-20T23:30:00.000Z");
  });
});

describe("saveTreeVersion", () => {
  // Pins the `date` → `timestamptz` cast fix. The UI passes a full ISO instant
  // from a life-point, and `::date` dropped both the time and the offset.
  it("keeps the full instant in validation_date", async () => {
    const owner = account();
    const caseId = await createCase(owner);

    const tree = (await saveTreeVersion(owner, caseId, {
      root: { nodes: [] },
      branches: [{ key: "advance", title: "推进", assumptions: ["a"], risks: ["r"], validationDate: "2026-09-21T13:45:00.000Z", stopCondition: "s" }],
    }))!;

    const stored = await query<{ validation_date: Date; assumptions_json: unknown; risks_json: unknown }>(
      `SELECT validation_date,assumptions_json,risks_json FROM agent_decision_branches WHERE tree_version_id=$1`, [tree.id],
    );
    expect(stored.rows[0].validation_date.toISOString()).toBe("2026-09-21T13:45:00.000Z");
    // These two columns hold arrays, which is why 032 must not guard them.
    expect(stored.rows[0].assumptions_json).toEqual(["a"]);
    expect(stored.rows[0].risks_json).toEqual(["r"]);
  });

  // The version row is written before the branches, so a branch failure has to
  // take it with it. Otherwise a retry would allocate version N+1 with no
  // branches and the tree would silently lose its content.
  it("rolls the tree version back when two branches collide on their key", async () => {
    const owner = account();
    const caseId = await createCase(owner);

    await expect(saveTreeVersion(owner, caseId, {
      root: { nodes: [] },
      branches: [{ key: "dup", title: "一" }, { key: "dup", title: "二" }],
    })).rejects.toThrow(/duplicate key/i);

    const versions = await query(`SELECT 1 FROM agent_decision_tree_versions WHERE case_id=$1`, [caseId]);
    expect(versions.rowCount).toBe(0);
  });
});

describe("cloneScenario", () => {
  // Pins the `int` → `numeric` cast fix. The seed type is `quantity?: number`
  // and the column is `numeric`; `::int` rounded a fractional quantity away.
  it("keeps a fractional inventory quantity", async () => {
    const owner = account();
    const base = SCENARIOS[0];

    const cloned = await cloneScenario(owner, {
      ...base,
      inventory: [{ category: "time", label: "缓冲期", description: "可动用的缓冲时间。", quantity: 2.5, unit: "day" }],
    });

    const stored = await query<{ quantity: string; evidence_json: unknown }>(
      `SELECT quantity,evidence_json FROM battle_inventory_items WHERE battle_id=$1`, [cloned.battleId],
    );
    expect(Number(stored.rows[0].quantity)).toBe(2.5);
    expect(stored.rows[0].evidence_json).toMatchObject({ source: "official_catalog" });
  });

  it("writes the scenario's facts and constraints", async () => {
    const owner = account();
    const base = SCENARIOS[0];

    const cloned = await cloneScenario(owner, base);

    const facts = await query(`SELECT 1 FROM battle_facts WHERE battle_id=$1`, [cloned.battleId]);
    expect(facts.rowCount).toBe(base.facts.length);
    const constraints = await query(`SELECT 1 FROM battle_constraints WHERE battle_id=$1`, [cloned.battleId]);
    expect(constraints.rowCount).toBe(base.constraints.length);
    // Every cloned scenario also gets one decision junction, and a snapshot.
    const junctions = await query(`SELECT 1 FROM battle_junctions WHERE battle_id=$1`, [cloned.battleId]);
    expect(junctions.rowCount).toBe(1);
  });
});

const junctionInput = (title: string) => ({
  title, description: "d",
  windowStart: "2026-09-21T00:00:00.000Z", windowEnd: "2026-10-05T00:00:00.000Z",
  halfLifeAt: "2026-09-28T00:00:00.000Z", coreVariable: "核心变量",
  defaultConsequence: "默认后果", urgency: 4, leverage: 4, irreversibility: 3,
  status: "open" as const, source: { type: "test" },
});

const moveInput = (kind: "strong_attack" | "probe" | "hedge", title: string) => ({
  kind, title, keyVariable: "kv", rationale: "r",
  actions: [{ title: "动作", description: "描述", owner: "执行人待定", dueAt: null }],
  cost: { resourceConcentration: "low" }, upside: { controlDelta: "medium" },
  failureCost: { maxLoss: "可承受" }, validation: { successSignal: "信号" },
  stop: { condition: "条件" }, assumptions: ["假设"], source: { type: "test" },
});

describe("replaceBattleConstraints", () => {
  const constraint = (label: string) => ({
    kind: "time" as const, label, description: "d", hard: true, severity: 4,
    threshold: { days: 14 }, source: { origin: "user" },
  });

  it("replaces the whole list and round-trips the jsonb columns", async () => {
    const owner = account();
    const battleId = await createBattle(owner);

    const first = (await replaceBattleConstraints(owner, battleId, [constraint("甲"), constraint("乙")]))!;
    expect(first.map((item) => item.label)).toEqual(["甲", "乙"]);
    expect(first[0].threshold).toEqual({ days: 14 });
    expect(first[0].source).toEqual({ origin: "user" });

    await replaceBattleConstraints(owner, battleId, [constraint("丙")]);
    const stored = await query<{ label: string }>(`SELECT label FROM battle_constraints WHERE battle_id=$1`, [battleId]);
    expect(stored.rows.map((row) => row.label)).toEqual(["丙"]);
  });

  it("writes the list in a single insert", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const before = database.statements.length;

    const saved = await replaceBattleConstraints(owner, battleId, Array.from({ length: 9 }, (_value, index) => constraint(`c-${index}`)));

    expect(saved).toHaveLength(9);
    const inserts = database.statements.slice(before).filter((statement) => statement.text.startsWith("INSERT INTO battle_constraints"));
    expect(inserts).toHaveLength(1);
  });
});

describe("replaceJunctions", () => {
  it("keeps the instants and replaces the open set", async () => {
    const owner = account();
    const battleId = await createBattle(owner);

    const saved = (await replaceJunctions(owner, battleId, [junctionInput("甲"), junctionInput("乙")]))!;
    expect(saved.map((item) => item.title)).toEqual(["甲", "乙"]);
    expect(saved[0].windowStart).toBe("2026-09-21T00:00:00.000Z");
    expect(saved[0].halfLifeAt).toBe("2026-09-28T00:00:00.000Z");
    expect(saved[0].windowEnd).toBe("2026-10-05T00:00:00.000Z");

    await replaceJunctions(owner, battleId, [junctionInput("丙")]);
    const stored = await query<{ title: string }>(`SELECT title FROM battle_junctions WHERE battle_id=$1 AND status='open'`, [battleId]);
    expect(stored.rows.map((row) => row.title)).toEqual(["丙"]);
  });
});

describe("saveMoveSet", () => {
  it("stores array-valued and object-valued jsonb columns", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const junction = (await replaceJunctions(owner, battleId, [junctionInput("交点")]))![0];

    const saved = (await saveMoveSet(owner, battleId, junction.id, [
      moveInput("strong_attack", "强攻"), moveInput("probe", "试局"), moveInput("hedge", "对冲"),
    ]))!;

    expect(saved.map((item) => item.title)).toEqual(["强攻", "试局", "对冲"]);
    // `action_json` and `assumptions_json` hold arrays, which is why migration
    // 032 must not guard them with an object check.
    expect(saved[0].actions).toEqual([{ title: "动作", description: "描述", owner: "执行人待定", dueAt: null }]);
    expect(saved[0].assumptions).toEqual(["假设"]);
    expect(saved[0].stop).toEqual({ condition: "条件" });
    expect(saved[0].state).toBe("draft");
  });

  // `battle_moves` is UNIQUE(battle_id, version, kind) and one call assigns a
  // single version, so a repeated kind cannot be stored. The batch write must
  // fail the same way the per-row loop did — as a whole-transaction rollback.
  it("rolls the whole set back when two moves share a kind", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const junction = (await replaceJunctions(owner, battleId, [junctionInput("交点")]))![0];

    await expect(saveMoveSet(owner, battleId, junction.id, [moveInput("probe", "一"), moveInput("probe", "二")]))
      .rejects.toThrow(/duplicate key/i);

    const stored = await query(`SELECT 1 FROM battle_moves WHERE battle_id=$1`, [battleId]);
    expect(stored.rowCount).toBe(0);
  });
});

describe("appendInventory", () => {
  const card = (jobId: string, index: number, overrides: Record<string, unknown> = {}) => ({
    category: "asset" as const, label: `AI 底牌 ${index}`, description: "d",
    quantity: null, unit: null, availability: "available" as const, expiresAt: null,
    cost: {}, evidence: { source: "ai", jobId },
    ...overrides,
  });

  // Every card of one model response carries the same job id. Deduplicating on
  // that id per item matched the first card and reused it for the rest, so three
  // generated cards produced one inventory row.
  it("stores every card of one AI job", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const jobId = randomUUID();

    const returned = await appendInventory(owner, battleId, [card(jobId, 1), card(jobId, 2), card(jobId, 3)]);

    expect(returned).toHaveLength(3);
    const stored = await query<{ label: string }>(`SELECT label FROM battle_inventory_items WHERE battle_id=$1 ORDER BY label`, [battleId]);
    expect(stored.rows.map((row) => row.label)).toEqual(["AI 底牌 1", "AI 底牌 2", "AI 底牌 3"]);
  });

  it("does not append the same job twice", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const jobId = randomUUID();

    await appendInventory(owner, battleId, [card(jobId, 1), card(jobId, 2)]);
    const retried = await appendInventory(owner, battleId, [card(jobId, 1), card(jobId, 2)]);

    expect(retried).toHaveLength(2);
    const stored = await query(`SELECT 1 FROM battle_inventory_items WHERE battle_id=$1`, [battleId]);
    expect(stored.rowCount).toBe(2);
  });

  it("always appends cards that carry no job id", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const manual = { ...card(randomUUID(), 1), label: "手填底牌", evidence: { source: "user" } };

    await appendInventory(owner, battleId, [manual]);
    await appendInventory(owner, battleId, [manual]);

    const stored = await query<{ label: string }>(`SELECT label FROM battle_inventory_items WHERE battle_id=$1`, [battleId]);
    expect(stored.rows.map((row) => row.label)).toEqual(["手填底牌", "手填底牌"]);
  });

  // `quantity` is `numeric`, so the batch cast has to be too.
  it("keeps a fractional quantity", async () => {
    const owner = account();
    const battleId = await createBattle(owner);

    await appendInventory(owner, battleId, [card(randomUUID(), 1, { quantity: 2.5, unit: "day" })]);

    const stored = await query<{ quantity: string }>(`SELECT quantity FROM battle_inventory_items WHERE battle_id=$1`, [battleId]);
    expect(Number(stored.rows[0].quantity)).toBe(2.5);
  });

  it("writes the batch in a single insert", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const jobId = randomUUID();
    const before = database.statements.length;

    await appendInventory(owner, battleId, Array.from({ length: 12 }, (_value, index) => card(jobId, index + 1)));

    const inserts = database.statements.slice(before).filter((statement) => statement.text.startsWith("INSERT INTO battle_inventory_items"));
    expect(inserts).toHaveLength(1);
  });
});

describe("replaceInventory", () => {
  const item = (id: string | undefined, label: string, overrides: Record<string, unknown> = {}) => ({
    ...(id ? { id } : {}),
    category: "asset" as const, label, description: "d", quantity: null, unit: null,
    availability: "available" as const, expiresAt: null, cost: {}, evidence: {},
    ...overrides,
  });

  it("inserts, updates and removes in a single call", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const first = (await replaceInventory(owner, battleId, [item(undefined, "甲"), item(undefined, "乙"), item(undefined, "丙")]))!;
    expect(first).toHaveLength(3);

    const kept = first[0].id;
    const saved = (await replaceInventory(owner, battleId, [item(kept, "甲改"), item(undefined, "丁")]))!;

    expect(saved.map((row) => row.label)).toEqual(["甲改", "丁"]);
    const stored = await query<{ id: string; label: string }>(`SELECT id,label FROM battle_inventory_items WHERE battle_id=$1`, [battleId]);
    expect(stored.rows.map((row) => row.id).sort()).toEqual([kept, saved[1].id].sort());
    expect(stored.rows.find((row) => row.id === kept)!.label).toBe("甲改");
  });

  it("clears the inventory when given an empty array", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    await replaceInventory(owner, battleId, [item(undefined, "甲")]);

    expect(await replaceInventory(owner, battleId, [])).toEqual([]);
    const stored = await query(`SELECT 1 FROM battle_inventory_items WHERE battle_id=$1`, [battleId]);
    expect(stored.rowCount).toBe(0);
  });

  it("rejects a repeated id before writing anything", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const id = randomUUID();

    await expect(replaceInventory(owner, battleId, [item(id, "甲"), item(id, "乙")]))
      .rejects.toThrow(/底牌标识重复/);
    const stored = await query(`SELECT 1 FROM battle_inventory_items WHERE battle_id=$1`, [battleId]);
    expect(stored.rowCount).toBe(0);
  });

  // The route used to sniff `error.code` and build the response itself, echoing
  // `error.message` back. The status and code belong on the error instead, so the
  // shared mapper is the only place that maps them.
  it("reports a duplicate id as a 400 carrying its reason code", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const id = randomUUID();

    const error = await replaceInventory(owner, battleId, [item(id, "甲"), item(id, "乙")])
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UserFacingError);
    expect((error as UserFacingError).status).toBe(400);
    expect((error as UserFacingError).reasonCode).toBe("inventory_duplicate_id");
  });

  it("rejects an id that belongs to another battle", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const otherBattle = await createBattle(owner);
    const foreign = (await replaceInventory(owner, otherBattle, [item(undefined, "外来")]))![0];

    await expect(replaceInventory(owner, battleId, [item(foreign.id, "挪用")]))
      .rejects.toThrow(/底牌不属于当前战局/);
    const untouched = await query<{ battle_id: string }>(`SELECT battle_id FROM battle_inventory_items WHERE id=$1`, [foreign.id]);
    expect(untouched.rows[0].battle_id).toBe(otherBattle);
  });

  // A cross-battle reference is a conflict, not a malformed request, so it must
  // stay distinguishable from the duplicate case above.
  it("reports a cross-battle id as a 409 carrying its reason code", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const otherBattle = await createBattle(owner);
    const foreign = (await replaceInventory(owner, otherBattle, [item(undefined, "外来")]))![0];

    const error = await replaceInventory(owner, battleId, [item(foreign.id, "挪用")])
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UserFacingError);
    expect((error as UserFacingError).status).toBe(409);
    expect((error as UserFacingError).reasonCode).toBe("inventory_scope_mismatch");
  });

  it("writes the list in a single insert", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const before = database.statements.length;

    await replaceInventory(owner, battleId, Array.from({ length: 14 }, (_value, index) => item(undefined, `i-${index}`)));

    const inserts = database.statements.slice(before).filter((statement) => statement.text.startsWith("INSERT INTO battle_inventory_items"));
    expect(inserts).toHaveLength(1);
  });

  // Dropping a card has to also drop references to it from strategy sources, or
  // the board keeps pointing at an id that no longer exists.
  it("drops references to removed cards from move sources", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const junction = (await replaceJunctions(owner, battleId, [junctionInput("交点")]))![0];
    const move = (await saveMoveSet(owner, battleId, junction.id, [moveInput("probe", "试局")]))![0];

    const cards = (await replaceInventory(owner, battleId, [item(undefined, "甲"), item(undefined, "乙")]))!;
    await updateDraftMoveSource(owner, battleId, move.id, { assignedCardIds: [cards[0].id, cards[1].id] });

    await replaceInventory(owner, battleId, [item(cards[0].id, "甲")]);

    const stored = await query<{ source_json: { assignedCardIds?: string[] } }>(`SELECT source_json FROM battle_moves WHERE id=$1`, [move.id]);
    expect(stored.rows[0].source_json.assignedCardIds).toEqual([cards[0].id]);
  });
});

describe("saveExecutionPlan", () => {
  const action = (title: string, dueAt: string | null) => ({
    title, description: "d", owner: "执行人待定", dueAt, successSignal: "信号", failureSignal: "反信号",
  });
  const breaker = (kind: "cash" | "legal", label: string) => ({
    kind, label, threshold: { days: 14 }, actionOnTrigger: "暂停", enabled: true,
  });
  /** The plan route only accepts a move that already holds the active commitment. */
  const committedMove = async (owner: AccountSubject, battleId: string) => {
    const junction = (await replaceJunctions(owner, battleId, [junctionInput("交点")]))![0];
    const move = (await saveMoveSet(owner, battleId, junction.id, [moveInput("probe", "试局")]))![0];
    await commitMove(owner, battleId, move.id);
    return move;
  };

  it("writes every action and breaker in one statement each", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const move = await committedMove(owner, battleId);
    const before = database.statements.length;

    const saved = (await saveExecutionPlan(owner, battleId, move.id,
      [action("一", "2026-09-25T09:00:00.000Z"), action("二", null)],
      [breaker("cash", "跑道"), breaker("legal", "边界")],
    ))!;

    expect(saved.actions.map((item) => item.sequenceNo)).toEqual([1, 2]);
    expect(saved.actions.map((item) => item.title)).toEqual(["一", "二"]);
    expect(saved.actions[1].dueAt).toBeNull();
    expect(saved.breakers.map((item) => item.label)).toEqual(["跑道", "边界"]);
    expect(saved.breakers[0].triggeredAt).toBeNull();

    const statements = database.statements.slice(before);
    expect(statements.filter((statement) => statement.text.startsWith("INSERT INTO battle_move_actions"))).toHaveLength(1);
    expect(statements.filter((statement) => statement.text.startsWith("INSERT INTO battle_breakers"))).toHaveLength(1);
    // `due_at` is `timestamptz`; the batch cast has to keep the instant and the null.
    const stored = await query<{ due_at: Date | null }>(`SELECT due_at FROM battle_move_actions WHERE move_id=$1 AND sequence_no=1`, [move.id]);
    expect(stored.rows[0].due_at!.toISOString()).toBe("2026-09-25T09:00:00.000Z");
  });

  it("replaces the previous plan rather than appending to it", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const move = await committedMove(owner, battleId);

    await saveExecutionPlan(owner, battleId, move.id, [action("一", null), action("二", null)], [breaker("cash", "跑道")]);
    await saveExecutionPlan(owner, battleId, move.id, [action("三", null)], [breaker("legal", "边界")]);

    const actions = await query<{ title: string; sequence_no: number }>(`SELECT title,sequence_no FROM battle_move_actions WHERE move_id=$1 ORDER BY sequence_no`, [move.id]);
    expect(actions.rows.map((row) => row.title)).toEqual(["三"]);
    expect(actions.rows[0].sequence_no).toBe(1);
    const breakers = await query<{ label: string }>(`SELECT label FROM battle_breakers WHERE move_id=$1`, [move.id]);
    expect(breakers.rows.map((row) => row.label)).toEqual(["边界"]);
  });
});

/**
 * `listBattles` is the one read path that was rewritten for its *plan* rather than
 * its meaning: the `... OR EXISTS (...)` disjunction could not be served by any
 * index, so it became two indexed branches joined by `UNION ALL`. A plan fix that
 * changes what the query returns is not a fix, and this file had no coverage of
 * `listBattles` at all before the rewrite — so the rewrite shipped with the
 * strongest correctness claim being "it type-checks".
 *
 * These tests are that missing coverage. The last one is the reason they exist:
 * `UNION ALL` emits duplicates by design, so the only thing standing between an
 * owner who is also recorded as a collaborator on their own battle and seeing it
 * twice is the `NOT (...)` guard in the second branch. That is a case a
 * hand-written test is least likely to imagine, so it is checked against the
 * pre-rewrite statement itself rather than against a list of cases I thought of.
 */
describe("listBattles", () => {
  const addCollaborator = async (
    battleId: string,
    subject: AccountSubject,
    role: "viewer" | "contributor" | "advisor" | "owner",
    options: { status?: "invited" | "active" | "revoked"; expiresAt?: string | null } = {},
  ) => {
    await query(
      `INSERT INTO battle_collaborators(id,battle_id,subject_type,subject_id,role,status,invited_by_type,invited_by_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,'account','sql-contract-inviter',$7)`,
      [randomUUID(), battleId, subject.subjectType, subject.subjectId, role, options.status ?? "active", options.expiresAt ?? null],
    );
  };

  const touch = async (battleId: string, at: string) => {
    await query(`UPDATE battle_cases SET updated_at=$2 WHERE id=$1`, [battleId, at]);
  };

  it("shows a battle to its owner with the owner role", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const listed = (await listBattles(owner)).find((battle) => battle.id === battleId);
    expect(listed?.accessRole).toBe("owner");
  });

  it("shows a shared battle to an active collaborator, carrying that collaborator's role", async () => {
    const owner = account();
    const contributor = account();
    const battleId = await createBattle(owner);
    await addCollaborator(battleId, contributor, "contributor");
    const listed = (await listBattles(contributor)).find((battle) => battle.id === battleId);
    expect(listed?.accessRole).toBe("contributor");
  });

  it("shows an advisor the battle they advise on", async () => {
    const owner = account();
    const advisor = account();
    const battleId = await createBattle(owner);
    await addCollaborator(battleId, advisor, "advisor");
    expect((await listBattles(advisor)).map((battle) => battle.id)).toContain(battleId);
  });

  // The duplicate trap, stated as plainly as it can be: an owner who also holds a
  // collaborator row on their own battle must see it once, and as the owner.
  it("does not list a battle twice when its owner is also a collaborator on it", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    await addCollaborator(battleId, owner, "contributor");
    const matches = (await listBattles(owner)).filter((battle) => battle.id === battleId);
    expect(matches).toHaveLength(1);
    expect(matches[0].accessRole).toBe("owner");
  });

  it("hides a battle from a collaborator whose access was revoked", async () => {
    const owner = account();
    const revoked = account();
    const battleId = await createBattle(owner);
    await addCollaborator(battleId, revoked, "contributor", { status: "revoked" });
    expect((await listBattles(revoked)).map((battle) => battle.id)).not.toContain(battleId);
  });

  it("hides a battle from a collaborator whose access expired", async () => {
    const owner = account();
    const expired = account();
    const battleId = await createBattle(owner);
    await addCollaborator(battleId, expired, "contributor", { expiresAt: "2020-01-01T00:00:00Z" });
    expect((await listBattles(expired)).map((battle) => battle.id)).not.toContain(battleId);
  });

  // An invite that has not been accepted yet is not access. `status='invited'` is
  // the column default, so a missing status would otherwise read as active.
  it("hides a battle from a collaborator whose invite is still pending", async () => {
    const owner = account();
    const invited = account();
    const battleId = await createBattle(owner);
    await addCollaborator(battleId, invited, "contributor", { status: "invited" });
    expect((await listBattles(invited)).map((battle) => battle.id)).not.toContain(battleId);
  });

  it("shows a stranger nothing", async () => {
    const owner = account();
    const stranger = account();
    const battleId = await createBattle(owner);
    await addCollaborator(battleId, stranger, "contributor", { status: "revoked" });
    expect(await listBattles(stranger)).toEqual([]);
  });

  // Archived battles stay listed: hiding them made the existing "取消归档" action
  // unreachable and turned a reversible state into an apparent deletion.
  it("still lists an archived battle", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    await query(`UPDATE battle_cases SET status='archived' WHERE id=$1`, [battleId]);
    expect((await listBattles(owner)).map((battle) => battle.id)).toContain(battleId);
  });

  it("orders by recency and lets a collaborator's battle outrank the owner's own", async () => {
    const owner = account();
    const contributor = account();
    const mine = await createBattle(owner);
    const theirs = await createBattle(contributor);
    await touch(mine, "2026-01-01T00:00:00Z");
    await touch(theirs, "2026-06-01T00:00:00Z");
    // `theirs` is newer and reached only through the collaborator branch, so a
    // merge that ordered the branches instead of the rows would put it last.
    await addCollaborator(theirs, owner, "contributor");
    const ids = (await listBattles(owner)).map((battle) => battle.id);
    expect(ids.indexOf(theirs)).toBeLessThan(ids.indexOf(mine));
  });

  /**
   * A frozen copy of the statement as it stood before the rewrite. It is not dead
   * code kept out of sentiment: it is the oracle. `UNION ALL` is safe only if the
   * two branches cannot both match a row, and the way to know that is to compare
   * against the disjunction it replaced on a fixture that deliberately builds the
   * overlapping case, rather than to assert the cases I happened to think of.
   *
   * If `listBattles` is ever changed on purpose, this test failing is the intended
   * prompt to re-derive the equivalence — not a reason to delete the oracle.
   */
  const preRewriteListBattles = async (subject: AccountSubject) => {
    const active = "bc.status='active' AND (bc.expires_at IS NULL OR bc.expires_at>now())";
    const result = await query<{ id: string; access_role: string | null }>(
      `SELECT c.id,CASE WHEN c.platform_subject_type=$1 AND c.platform_subject_id=$2 THEN 'owner' ELSE (SELECT bc.role FROM battle_collaborators bc WHERE bc.battle_id=c.id AND bc.subject_type=$1 AND bc.subject_id=$2 AND ${active} LIMIT 1) END AS access_role FROM battle_cases c WHERE ((c.platform_subject_type=$1 AND c.platform_subject_id=$2) OR EXISTS (SELECT 1 FROM battle_collaborators bc WHERE bc.battle_id=c.id AND bc.subject_type=$1 AND bc.subject_id=$2 AND ${active})) ORDER BY c.updated_at DESC LIMIT 100`,
      [subject.subjectType, subject.subjectId],
    );
    return result.rows;
  };

  it("returns exactly what the pre-rewrite disjunction returned, over an overlapping fixture", async () => {
    const owner = account();
    const contributor = account();
    const advisor = account();
    const revoked = account();
    const invited = account();
    const expired = account();
    const stranger = account();

    // Owned by `owner`; every collaborator state is present on this one battle,
    // including `owner` itself as a collaborator — the overlap the guard exists for.
    const owned = await createBattle(owner);
    await addCollaborator(owned, owner, "contributor");
    await addCollaborator(owned, contributor, "contributor");
    await addCollaborator(owned, advisor, "advisor");
    await addCollaborator(owned, revoked, "contributor", { status: "revoked" });
    await addCollaborator(owned, invited, "contributor", { status: "invited" });
    await addCollaborator(owned, expired, "advisor", { expiresAt: "2020-01-01T00:00:00Z" });

    // Owned by someone else: reached only through the collaborator branch.
    const shared = await createBattle(account());
    await addCollaborator(shared, contributor, "advisor");
    await addCollaborator(shared, advisor, "viewer");

    // Archived and owned — must survive both implementations.
    const archived = await createBattle(owner);
    await query(`UPDATE battle_cases SET status='archived' WHERE id=$1`, [archived]);

    for (const subject of [owner, contributor, advisor, revoked, invited, expired, stranger]) {
      const byId = (rows: { id: string; access_role: string | null }[]) =>
        [...rows].sort((a, b) => a.id.localeCompare(b.id));
      const actual = (await listBattles(subject)).map((battle) => ({ id: battle.id, access_role: battle.accessRole ?? null }));
      expect(byId(actual)).toEqual(byId(await preRewriteListBattles(subject)));
    }
  });
});

// `source.jobId` decides whether an advice row is deduped, and migration 013's
// unique index keys on it *without* the author — so a client-supplied value could
// pre-occupy a job's slot or make `createAdvice` return a row the caller never
// wrote. It is now a trusted parameter instead of being read out of the payload.
describe("createAdvice job id", () => {
  const input = (opinion: string, source: Record<string, unknown> = {}) => ({
    targetType: "battle" as const,
    targetId: null,
    opinion,
    rationale: "r",
    uncertainty: "u",
    source,
  });

  it("ignores a job id supplied in the payload", async () => {
    const owner = account();
    const battleId = await createBattle(owner);

    const first = await createAdvice(owner, battleId, input("第一条", { jobId: "forged-job" }));
    const second = await createAdvice(owner, battleId, input("第二条", { jobId: "forged-job" }));

    // Without the guard the second call would find the first by the forged id and
    // return it, silently discarding the second opinion.
    expect(second!.id).not.toBe(first!.id);
    expect(second!.opinion).toBe("第二条");

    const rows = await query<{ opinion: string; source_json: Record<string, unknown> }>(
      `SELECT opinion,source_json FROM battle_advice WHERE battle_id=$1 ORDER BY created_at`,
      [battleId],
    );
    expect(rows.rowCount).toBe(2);
    // And it must not be stored either, or it would still trip the unique index.
    expect(rows.rows.some((row) => "jobId" in row.source_json)).toBe(false);
  });

  it("still dedupes by the trusted job id so AI recovery cannot duplicate", async () => {
    const owner = account();
    const battleId = await createBattle(owner);

    const first = await createAdvice(owner, battleId, input("AI 推演"), "job-1");
    const retry = await createAdvice(owner, battleId, input("AI 推演（重试）"), "job-1");

    expect(retry!.id).toBe(first!.id);
    const rows = await query<{ source_json: Record<string, unknown> }>(
      `SELECT source_json FROM battle_advice WHERE battle_id=$1`,
      [battleId],
    );
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].source_json.jobId).toBe("job-1");
  });
});

// `evidence.jobId` is server-reserved, and the two write paths share it: a row
// written by the client inventory editor is read back by a later AI job's dedupe.
// Stripping on only the AI side would leave a client able to suppress that job.
describe("inventory evidence job id", () => {
  const manual = (label: string) => ({
    category: "asset" as const, label, description: "d", quantity: null, unit: null,
    availability: "available" as const, expiresAt: null, cost: {},
    evidence: { source: "manual", jobId: "job-x" },
  });
  const aiCard = (jobId: string) => ({
    category: "asset" as const, label: "AI 底牌", description: "d", quantity: null, unit: null,
    availability: "available" as const, expiresAt: null, cost: {},
    evidence: { source: "ai", jobId },
  });

  it("strips a client-supplied job id so it cannot suppress a later AI job", async () => {
    const owner = account();
    const battleId = await createBattle(owner);

    await replaceInventory(owner, battleId, [manual("客户端手写")]);
    const stored = await query<{ evidence_json: Record<string, unknown> }>(
      `SELECT evidence_json FROM battle_inventory_items WHERE battle_id=$1`,
      [battleId],
    );
    expect(stored.rows[0].evidence_json.jobId).toBeUndefined();

    // Without the strip the AI job below would match this row, treat its own cards
    // as already applied, and silently store nothing.
    await appendInventory(owner, battleId, [aiCard("job-x")]);
    const after = await query<{ label: string }>(
      `SELECT label FROM battle_inventory_items WHERE battle_id=$1 ORDER BY created_at`,
      [battleId],
    );
    expect(after.rowCount).toBe(2);
    expect(after.rows.some((row) => row.label === "AI 底牌")).toBe(true);
  });

  // The AI path must keep writing the id, or its retry dedupe stops working.
  it("keeps the job id on the AI path so a retry stays idempotent", async () => {
    const owner = account();
    const battleId = await createBattle(owner);

    await appendInventory(owner, battleId, [aiCard("job-y")]);
    await appendInventory(owner, battleId, [aiCard("job-y")]);

    const rows = await query(`SELECT 1 FROM battle_inventory_items WHERE battle_id=$1`, [battleId]);
    expect(rows.rowCount).toBe(1);
  });
});

/**
 * `appendInterviewTurn` writes into the battle's record and bumps
 * `battle_cases.updated_at`, so it is canonical state — and the roles are not
 * interchangeable: `viewer` reads a redacted view, `advisor` submits opinions
 * through the advice surface, `contributor` writes.
 *
 * The guard used to be the read form, so both a viewer and an advisor could
 * append. Nothing caught it, because both callers in `ai/[kind]/handler.ts` run
 * `createAiJob` — which already requires contributor — before calling in. The
 * defect was therefore invisible from every existing test: the route tests mock
 * this function, and the concurrency test only ever uses the owner.
 */
describe("appendInterviewTurn access", () => {
  const addCollaborator = async (battleId: string, subject: AccountSubject, role: "viewer" | "contributor" | "advisor") => {
    await query(
      `INSERT INTO battle_collaborators(id,battle_id,subject_type,subject_id,role,status,invited_by_type,invited_by_id) VALUES($1,$2,$3,$4,$5,'active','account','sql-contract-inviter')`,
      [randomUUID(), battleId, subject.subjectType, subject.subjectId, role],
    );
  };
  const turns = async (battleId: string) =>
    (await query<{ content: string }>(`SELECT content FROM battle_interview_turns WHERE battle_id=$1`, [battleId])).rows;

  it("lets the owner and a contributor append", async () => {
    const owner = account();
    const contributor = account();
    const battleId = await createBattle(owner);
    await addCollaborator(battleId, contributor, "contributor");

    expect(await appendInterviewTurn(owner, battleId, { role: "user", content: "所有者提问" })).not.toBeNull();
    expect(await appendInterviewTurn(contributor, battleId, { role: "user", content: "贡献者提问" })).not.toBeNull();
    expect((await turns(battleId)).length).toBe(2);
  });

  it("refuses a viewer and an advisor, and writes nothing", async () => {
    const owner = account();
    const viewer = account();
    const advisor = account();
    const battleId = await createBattle(owner);
    await addCollaborator(battleId, viewer, "viewer");
    await addCollaborator(battleId, advisor, "advisor");

    expect(await appendInterviewTurn(viewer, battleId, { role: "user", content: "观察者提问" })).toBeNull();
    expect(await appendInterviewTurn(advisor, battleId, { role: "user", content: "顾问提问" })).toBeNull();
    // The assertion that matters: not the return value but the row count.
    expect((await turns(battleId)).length).toBe(0);
  });

  it("still lets a viewer read the turns", async () => {
    const owner = account();
    const viewer = account();
    const battleId = await createBattle(owner);
    await addCollaborator(battleId, viewer, "viewer");
    await appendInterviewTurn(owner, battleId, { role: "user", content: "只读也能看见" });

    expect((await listInterviewTurns(viewer, battleId)).map((turn) => turn.content)).toEqual(["只读也能看见"]);
  });
});
