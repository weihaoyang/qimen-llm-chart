/**
 * The invariants that only a real, multi-connection server can check.
 *
 * `sql-contract.test.ts` runs on PGlite, which is a single connection: `connect()`
 * hands out the same session every time, so `FOR UPDATE` never contends and two
 * transactions that would deadlock on a real server simply run one after the
 * other. Everything the repositories rely on *under contention* was therefore
 * asserted nowhere — it was argued for in comments.
 *
 * Three claims are load-bearing enough to be worth a real server:
 *
 *   1. `claimAiJobCommit` is a compare-and-set, so exactly one caller may flip a
 *      job from `running` to `committing`. Idempotency is layered: the batch
 *      lookup inside `appendInventory` covers a *sequential* retry (it finds the
 *      rows the job already stored and reuses them — pinned by
 *      `sql-contract.test.ts`), and this claim is what covers *concurrent* ones.
 *      Both are needed: two callers that start before either commits each find
 *      nothing to reuse and would both write the cards. That per-card dedupe was
 *      what the old code had instead, and it collapsed a multi-card job into one
 *      row, so the claim is now carrying real weight and has to be measured.
 *   2. `replaceInventory` takes the battle row with `FOR UPDATE` before touching
 *      cards. Without it, two concurrent replacements interleave: each inserts
 *      its own set, then each deletes everything outside its own set, and the
 *      board is left empty or mixed instead of holding one caller's whole set.
 *   3. The two write paths lock the battle row first, in the same order, so they
 *      must not deadlock when interleaved.
 *
 * Skipped unless `QMDJ_TEST_REAL_DATABASE_URL` is set, and it must point at a
 * database this suite may destroy: `installRealTestPool` drops and rebuilds the
 * `public` schema from the migration files.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { query } from "@/lib/db/pool";
import { appendInventory, commitMove, replaceInventory, replaceJunctions, saveMoveSet } from "@/lib/battle/repository";
import { createReview } from "@/lib/battle/extended-repository";
import { appendInterviewTurn } from "@/lib/battle/interview-repository";
import { claimAiJobCommit, claimRealityEchoReward, saveMemory, saveModuleState } from "@/lib/battle/product-state";
import { installRealTestPool, realTestDatabaseUrl } from "./testing/real-postgres-harness";

const url = realTestDatabaseUrl();

let database: Awaited<ReturnType<typeof installRealTestPool>>;

/** A fresh owner per test, so nothing leaks between them through a shared row. */
const account = (): AccountSubject => ({ subjectType: "account", subjectId: `concurrency-${randomUUID()}` });

const createBattle = async (subject: AccountSubject) => {
  const id = randomUUID();
  await query(
    `INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective,status) VALUES($1,$2,$3,'并发战局','验证锁与竞争语义','active')`,
    [id, subject.subjectType, subject.subjectId],
  );
  return id;
};

/** A job already `running` under `runToken`, which is the state a commit claims from. */
const createRunningJob = async (battleId: string, runToken: string) => {
  const id = randomUUID();
  await query(
    `INSERT INTO battle_ai_jobs(id,battle_id,kind,idempotency_key,status,run_token,input_snapshot_hash,input_json,prompt_version)
     VALUES($1,$2,'cards',$3,'running',$4,'snapshot','{}'::jsonb,'v1')`,
    [id, battleId, randomUUID(), runToken],
  );
  return id;
};

const card = (jobId: string, index: number) => ({
  category: "asset" as const, label: `AI 底牌 ${index}`, description: "d",
  quantity: null, unit: null, availability: "available" as const, expiresAt: null,
  cost: {}, evidence: { source: "ai", jobId },
});

const item = (label: string) => ({
  category: "asset" as const, label, description: "d", quantity: null, unit: null,
  availability: "available" as const, expiresAt: null, cost: {}, evidence: {},
});

const junctionInput = (title: string) => ({
  title, description: "d",
  windowStart: "2026-09-21T00:00:00.000Z", windowEnd: "2026-10-05T00:00:00.000Z",
  halfLifeAt: "2026-09-28T00:00:00.000Z", coreVariable: "核心变量",
  defaultConsequence: "默认后果", urgency: 4, leverage: 4, irreversibility: 3,
  status: "open" as const, source: { type: "concurrency-test" },
});

const moveInput = (kind: "strong_attack" | "probe" | "hedge", title: string) => ({
  kind, title, keyVariable: "kv", rationale: "r",
  actions: [{ title: "动作", description: "描述", owner: "执行人待定", dueAt: null }],
  cost: { resourceConcentration: "low" }, upside: { controlDelta: "medium" },
  failureCost: { maxLoss: "可承受" }, validation: { successSignal: "信号" },
  stop: { condition: "条件" }, assumptions: ["假设"], source: { type: "concurrency-test" },
});

const labelsOf = async (battleId: string) => {
  const rows = await query<{ label: string }>(
    `SELECT label FROM battle_inventory_items WHERE battle_id=$1 ORDER BY label`,
    [battleId],
  );
  return rows.rows.map((row) => row.label);
};

describe.skipIf(!url)("并发（真实服务器）", () => {
  // Rebuilding the schema is not instant: dropping the existing one costs a few
  // seconds, and replaying 32 migrations on this filesystem about ten more. The
  // default 10s hook budget is not enough, and a timeout here reads as a hang
  // rather than as the honest cost of the setup.
  beforeAll(async () => {
    const started = Date.now();
    database = await installRealTestPool(url as string);
    console.log(`[concurrency] engine: ${database.serverVersion} (schema rebuilt in ${Date.now() - started}ms, ${database.gateWaitMs}ms waiting for a sibling file)`);
  }, 120_000);
  afterAll(async () => { await database.close(); });

  // The gate `appendInventory` now relies on. Eight simultaneous claims on one
  // run token: the UPDATE matches `status='running'`, so the first commit flips
  // it and every later re-evaluation under READ COMMITTED matches nothing.
  it("admits exactly one claim for a run token", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const runToken = randomUUID();
    const jobId = await createRunningJob(battleId, runToken);

    const results = await Promise.all(
      Array.from({ length: 8 }, () => claimAiJobCommit(owner, battleId, jobId, runToken, { ok: true }, "m1")),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  // A claim must also be specific: a token that never ran must not be able to
  // claim the job, or the gate would admit anyone who knows the job id.
  it("rejects a claim carrying a stale run token", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const jobId = await createRunningJob(battleId, randomUUID());

    const results = await Promise.all(
      Array.from({ length: 4 }, () => claimAiJobCommit(owner, battleId, jobId, randomUUID(), { ok: true }, null)),
    );

    expect(results.some(Boolean)).toBe(false);
  });

  // The battle row lock, asserted by *which statement* a blocked writer is parked
  // on rather than merely by the fact that it is blocked.
  //
  // "It blocked" is not enough, and that was measured: `replaceInventory` ends
  // with `UPDATE battle_cases SET updated_at=now()`, which takes the same row
  // lock. So a writer blocks even with the leading `SELECT ... FOR UPDATE`
  // deleted — it just blocks *after* its inserts and deletes have run, which is
  // exactly the interleaving the lock exists to prevent. Both mutations pass a
  // "did it block" assertion.
  //
  // `pg_stat_activity.query` names the statement a backend is currently running,
  // so it distinguishes the two cases directly: with the lock the writer is
  // parked on the `SELECT`, without it on the `UPDATE`.
  it("makes a second writer wait on the battle row before writing", async () => {
    const owner = account();
    const battleId = await createBattle(owner);

    const holder = await database.pool.connect();
    try {
      await holder.query("BEGIN");
      await holder.query(`SELECT id FROM battle_cases WHERE id=$1 FOR UPDATE`, [battleId]);

      const writer = replaceInventory(owner, battleId, [item("A")]);

      // Poll until the writer is actually parked on a lock, so the assertion does
      // not depend on how long the round trip happens to take.
      let parked: string[] = [];
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const rows = await query<{ query: string }>(
          `SELECT query FROM pg_stat_activity WHERE state='active' AND wait_event_type='Lock'`,
        );
        parked = rows.rows.map((row) => row.query.replace(/\s+/g, " ").trim());
        if (parked.length) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      expect(parked.join("\n")).toContain("FOR UPDATE");
      expect(parked.join("\n")).not.toContain("SET updated_at");

      await holder.query("COMMIT");
      await expect(writer).resolves.toHaveLength(1);
    } finally {
      holder.release();
    }
  });

  // An integration check that the board holds one caller's whole set. Useful as a
  // smoke test, but it is *not* what verifies the lock — see the test above for
  // why the racing form cannot discriminate.
  it("leaves one whole card set when two replacements race", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    await replaceInventory(owner, battleId, [item("种子")]);

    const setA = ["A1", "A2", "A3"];
    const setB = ["B1", "B2", "B3"];

    await Promise.all([
      replaceInventory(owner, battleId, setA.map(item)),
      replaceInventory(owner, battleId, setB.map(item)),
    ]);

    const labels = await labelsOf(battleId);
    expect([setA, setB].map((set) => JSON.stringify(set))).toContain(JSON.stringify(labels));
  });

  // Both paths take the battle row lock before anything else, so interleaving
  // them must serialize rather than deadlock. 40P01 is Postgres' deadlock code.
  it("does not deadlock when append and replace interleave", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const jobId = randomUUID();

    const settled = await Promise.allSettled(
      Array.from({ length: 6 }, (_value, index) => index % 2 === 0
        ? replaceInventory(owner, battleId, [item(`R${index}`)])
        : appendInventory(owner, battleId, [card(jobId, index)])),
    );

    const failures = settled.filter((result) => result.status === "rejected");
    expect(failures.map((result) => (result as PromiseRejectedResult).reason)).toEqual([]);
  });

  // End to end: two workers run the same commit flow, and the claim decides
  // which one may write. Exactly one applies, and it writes *every* card — the
  // property the per-card job-id dedupe used to destroy.
  it("applies an AI job once when two workers race", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const runToken = randomUUID();
    const jobId = await createRunningJob(battleId, runToken);
    const cards = [card(jobId, 1), card(jobId, 2), card(jobId, 3)];

    const worker = async () => {
      const claimed = await claimAiJobCommit(owner, battleId, jobId, runToken, { cards: cards.length }, "m1");
      if (!claimed) return false;
      await appendInventory(owner, battleId, cards);
      return true;
    };

    const outcomes = await Promise.all([worker(), worker()]);

    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(await labelsOf(battleId)).toHaveLength(cards.length);
  });

  // The lock hierarchy, exercised rather than argued for.
  //
  // Every battle-scoped writer takes the battle row lock and only *then* at most
  // one advisory lock. Three of them — `commitMove`, `claimRealityEchoReward`, and
  // `saveModuleState` for the `reality-echoes` module — contend on the *same*
  // advisory key (`battle-module:<battleId>:reality-echoes`). If any of them
  // acquired that advisory lock before the row lock, the two orders would cross
  // and Postgres would report a deadlock instead of merely serializing the
  // callers. That is the whole failure mode, and 40P01 is the only way it shows:
  // each call is individually valid, so nothing else can fail.
  //
  // Reading the code says the order is consistent. This is the part that makes it
  // evidence: the static reading cannot see a path that locks in the other order
  // only when some branch is taken.
  //
  // Verified by inversion: moving `saveModuleState`'s advisory lock ahead of its
  // row lock produces ten `40P01`s across `saveModuleState`, `commitMove`,
  // `claimRealityEchoReward`, `createReview`, `appendInterviewTurn` and
  // `replaceInventory` — not just the one function that was changed. Because they
  // all take the battle row lock, one crossing pair cycles through the whole set.
  // That is why this order is load-bearing rather than stylistic.
  //
  // The explicit 60s budget is part of the test, not padding: at the default 5s
  // the run times out *before* the deadlocks are collected, so the failure reads
  // as a slow test instead of as the ten `40P01`s it actually is.
  it("keeps the battle row lock ahead of every advisory lock", async () => {
    const owner = account();
    const battleId = await createBattle(owner);
    const junction = (await replaceJunctions(owner, battleId, [junctionInput("交点")]))![0];
    const moves = (await saveMoveSet(owner, battleId, junction.id, [
      moveInput("strong_attack", "强攻"), moveInput("probe", "试局"),
    ]))!;

    const operations: Array<[string, () => Promise<unknown>]> = [
      ["commitMove#1", () => commitMove(owner, battleId, moves[0].id)],
      ["commitMove#2", () => commitMove(owner, battleId, moves[1].id, "换策略")],
      ["saveModuleState", () => saveModuleState(owner, battleId, "reality-echoes", { items: [] })],
      ["claimRealityEchoReward", () => claimRealityEchoReward(owner, battleId, randomUUID())],
      ["appendInterviewTurn", () => appendInterviewTurn(owner, battleId, { role: "user", content: "并发提问" })],
      ["createReview", () => createReview(owner, battleId, {
        commitmentId: null, outcome: "未评估", facts: "", whatChanged: "", diagnosis: {}, nextAdjustment: "",
      })],
      ["replaceInventory", () => replaceInventory(owner, battleId, [item("甲")])],
      ["appendInventory", () => appendInventory(owner, battleId, [card(randomUUID(), 1)])],
    ];

    const failures: string[] = [];
    for (let round = 0; round < 4; round += 1) {
      const settled = await Promise.allSettled(operations.map(([, run]) => run()));
      settled.forEach((result, index) => {
        if (result.status === "rejected") {
          const code = (result.reason as { code?: string }).code;
          failures.push(`${operations[index][0]}: ${code ?? String(result.reason)}`);
        }
      });
    }

    expect(failures).toEqual([]);
  }, 60_000);

  // H — the audit described this as "无支撑索引、无唯一约束、无咨询锁": two
  // concurrent `saveMemory` calls for one source record each read no row and each
  // insert their own random UUID, leaving two memories for one record. The lookup
  // cannot serialize itself — under READ COMMITTED both readers see the same
  // pre-insert snapshot — so `saveMemory` takes an advisory lock on the source
  // tuple before looking. That lock is the entire mechanism, and this is the test
  // that says so.
  //
  // The assertion is an invariant, not an observation of a race: however the calls
  // interleave, one source record leaves exactly one row and every caller is told
  // the same id. Both hold deterministically when the lock is present — which is
  // what makes this a regression test rather than a flake — and the mutation check
  // is what confirms the lock's absence makes it fail.
  it("keeps one row per source record when one memory is saved concurrently", async () => {
    const owner = account();
    const recordId = `dna-${randomUUID()}`;
    const writers = 8;

    // Warm the pool before the burst, and keep the warm-up the same width as the
    // burst. This is load-bearing, not padding. On a cold pool the eight
    // connections are still being established when the first transaction commits,
    // so the writers are serialized by connection setup and the race this test
    // exists to catch does not occur: measured against the same code with the lock
    // removed, eight concurrent saves produced **one** row on a cold pool and
    // **eight** on a warm one. A concurrency test that passes because nothing ran
    // concurrently is worse than no test, because its green is read as evidence.
    await Promise.all(Array.from({ length: writers }, () => query("SELECT 1")));

    const save = () => saveMemory(owner, {
      title: "并发记忆",
      memory: { note: "same source" },
      source: { type: "dna", recordId },
    });

    const results = await Promise.all(Array.from({ length: writers }, save));
    expect(results.every((row) => row !== null)).toBe(true);
    expect(new Set(results.map((row) => row!.id)).size).toBe(1);

    const rows = await query<{ count: string }>(
      `SELECT count(*)::text AS count FROM battle_memory_records
        WHERE platform_subject_type=$1 AND platform_subject_id=$2 AND source_json->>'recordId'=$3`,
      [owner.subjectType, owner.subjectId, recordId],
    );
    expect(rows.rows[0].count).toBe("1");
  }, 60_000);
});
