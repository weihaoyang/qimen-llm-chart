/**
 * The query plans, on a populated database.
 *
 * Every earlier appendix that touched indexes had to add the caveat that planner
 * behaviour on an empty table says nothing about production: with no rows there is
 * nothing to scan, so *every* plan looks fine, and an index that can never be used
 * is indistinguishable from one that always is. Two audit items were exactly that
 * shape — a partial index whose predicate excluded the query it was meant to serve
 * (N), and a table read with no supporting index at all (I).
 *
 * This file seeds the volume those items only described, runs `ANALYZE` so the
 * planner has statistics, and then asserts on the plan of the statement a
 * repository function **actually issued** — captured from the installed pool,
 * not transcribed into the test. A copy would only prove that a query with that
 * predicate shape can use the index; capturing proves the shipped query does.
 *
 * Skipped unless `QMDJ_TEST_REAL_DATABASE_URL` is set, and it must point at a
 * database this suite may destroy: the harness drops and rebuilds `public`.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { query } from "@/lib/db/pool";
import { listBattles } from "@/lib/battle/repository";
import { createReview, listReviews } from "@/lib/battle/extended-repository";
import { saveMemory } from "@/lib/battle/product-state";
import { installRealTestPool, realTestDatabaseUrl } from "./testing/real-postgres-harness";

const url = realTestDatabaseUrl();

let database: Awaited<ReturnType<typeof installRealTestPool>>;

type PlanNode = {
  "Node Type": string;
  "Relation Name"?: string;
  "Index Name"?: string;
  "Actual Rows"?: number;
  Plans?: PlanNode[];
};

const flatten = (node: PlanNode): PlanNode[] => [node, ...(node.Plans ?? []).flatMap(flatten)];

/** `EXPLAIN (ANALYZE, FORMAT JSON)` for one statement, flattened to a node list. */
const planOf = async (sql: string, values: unknown[]) => {
  const result = await query<{ "QUERY PLAN": Array<{ Plan: PlanNode }> }>(
    `EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`,
    values,
  );
  return flatten(result.rows[0]["QUERY PLAN"][0].Plan);
};

/** The statement a repository call issued, found by a fragment of its text. */
const captureStatement = async (fragment: string, run: () => Promise<unknown>) => {
  const before = database.statements.length;
  await run();
  const issued = database.statements.slice(before).find((statement) => statement.text.includes(fragment));
  if (!issued) throw new Error(`未捕获到包含「${fragment}」的语句`);
  return issued;
};

describe.skipIf(!url)("查询计划（真实服务器 + 真实数据量）", () => {
  beforeAll(async () => {
    database = await installRealTestPool(url as string);
    // Volume, then statistics. Without ANALYZE the planner works from the
    // empty-table defaults and will happily pick a sequential scan for a
    // selective predicate, which would make this file assert the wrong thing.
    await query(`
      INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective,status,updated_at)
      SELECT gen_random_uuid(), 'account', 'seed-owner-' || (i % 200), '战局 ' || i, '目标', 'active', now() - (i || ' minutes')::interval
      FROM generate_series(1, 20000) AS i`);
    await query(`
      INSERT INTO battle_reviews(id,battle_id,outcome,facts,what_changed,diagnosis_json,next_adjustment,reviewed_at)
      SELECT gen_random_uuid(), c.id, '未评估', '事实', '变化', '{}'::jsonb, '调整', now()
      FROM battle_cases c CROSS JOIN generate_series(1, 2)
      WHERE c.platform_subject_id LIKE 'seed-owner-%'`);
    await query(`
      INSERT INTO battle_memory_records(id,platform_subject_type,platform_subject_id,title,memory_json,source_json,consent_status)
      SELECT gen_random_uuid(), 'account', 'seed-memory-' || (i % 200), '记忆 ' || i, '{}'::jsonb,
             jsonb_build_object('type','seed','recordId','r-' || i), 'active'
      FROM generate_series(1, 40000) AS i`);
    await query("ANALYZE");
  }, 180_000);

  afterAll(async () => { await database.close(); });

  const account = (): AccountSubject => ({ subjectType: "account", subjectId: `plans-${randomUUID()}` });

  // N — `battle_cases_owner_updated_idx` was a partial index (`WHERE status <>
  // 'archived'`) while `listBattles` carries no status predicate, so the index was
  // excluded from the very query it existed for. Migration 031 replaced it with a
  // full index. This is the assertion that the replacement actually gets used.
  it("uses the owner index for the battle list", async () => {
    const owner = account();
    for (let index = 0; index < 30; index += 1) {
      await query(
        `INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective,status) VALUES($1,'account',$2,'我的战局','目标','active')`,
        [randomUUID(), owner.subjectId],
      );
    }
    await query("ANALYZE battle_cases");

    const issued = await captureStatement("FROM battle_cases c", () => listBattles(owner));
    const nodes = await planOf(issued.text, issued.values);

    expect(nodes.map((node) => node["Index Name"]).filter(Boolean)).toContain("battle_cases_owner_updated_idx");
    expect(nodes.filter((node) => node["Node Type"] === "Seq Scan" && node["Relation Name"] === "battle_cases")).toEqual([]);
  });

  // I — `battle_reviews` was read as `WHERE battle_id=$1 ORDER BY reviewed_at
  // DESC` with only a partial expression index for a different predicate, so both
  // the read and the `ON DELETE CASCADE` from battle_cases were sequential scans.
  // Migration 030 added `battle_reviews_battle_idx`; this asserts it is reached.
  it("uses the battle index for the review list", async () => {
    const owner = account();
    const battleId = randomUUID();
    await query(
      `INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective,status) VALUES($1,'account',$2,'评审战局','目标','active')`,
      [battleId, owner.subjectId],
    );
    await createReview(owner, battleId, { commitmentId: null, outcome: "未评估", facts: "", whatChanged: "", diagnosis: {}, nextAdjustment: "" });
    await query("ANALYZE battle_reviews");

    const issued = await captureStatement("FROM battle_reviews", () => listReviews(owner, battleId));
    const nodes = await planOf(issued.text, issued.values);

    expect(nodes.map((node) => node["Index Name"]).filter(Boolean)).toContain("battle_reviews_battle_idx");
    expect(nodes.filter((node) => node["Node Type"] === "Seq Scan" && node["Relation Name"] === "battle_reviews")).toEqual([]);
  });

  // H — the retry lookup inside `saveMemory` matched a caller-supplied
  // `source_json->>'recordId'` with no supporting index, so every memory write
  // scanned the table. Migration 030 added an expression index over exactly that
  // tuple. The lookup only runs when no id is supplied, which is the retry path.
  it("uses the source-record index for the memory retry lookup", async () => {
    const owner = account();
    const source = { type: "seed", recordId: `retry-${randomUUID()}` };

    const issued = await captureStatement("FROM battle_memory_records", () =>
      saveMemory(owner, { title: "重试记忆", memory: {}, source }));
    const nodes = await planOf(issued.text, issued.values);

    expect(nodes.map((node) => node["Index Name"]).filter(Boolean)).toContain("battle_memory_records_source_record_idx");
    expect(nodes.filter((node) => node["Node Type"] === "Seq Scan" && node["Relation Name"] === "battle_memory_records")).toEqual([]);
  });
});
