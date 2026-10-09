/**
 * Raw-SQL contract, executed by a real Postgres (PGlite).
 *
 * This file used to be dominated by the 胜天半子 Battle Domain repositories. Those
 * were removed from this product, so what remains is what this repo still owns:
 * the migration ledger applies cleanly and the agent-case decision tree
 * round-trips instants.
 *
 * The repository-shape tests elsewhere mock `@/lib/db/pool` and only assert the
 * *text* of a statement. A cast written against the wrong column type is still
 * one well-formed statement — it just stores the wrong value. `saveTreeVersion`
 * below is the guard for exactly that class of bug (`::date` once silently
 * truncated `agent_decision_branches.validation_date` to midnight).
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { query } from "@/lib/db/pool";
import { saveTreeVersion } from "@/lib/agent/cases-repository";
import { installTestPool } from "./testing/pglite-harness";

let database: Awaited<ReturnType<typeof installTestPool>>;

beforeAll(async () => { database = await installTestPool(); });
afterAll(async () => { await database.close(); });

/** A fresh owner per test, so nothing leaks between them through a shared row. */
const account = (): AccountSubject => ({ subjectType: "account", subjectId: `sql-contract-${randomUUID()}` });

const createCase = async (subject: AccountSubject) => {
  const id = randomUUID();
  await query(
    `INSERT INTO agent_cases(id,platform_subject_type,platform_subject_id,title,question,status) VALUES($1,$2,$3,'契约议题','验证决策树写入','active')`,
    [id, subject.subjectType, subject.subjectId],
  );
  return id;
};

describe("migrations", () => {
  it("applies the whole directory to an empty database", async () => {
    const result = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
    );
    const tables = result.rows.map((row) => row.table_name);
    expect(tables).toEqual(expect.arrayContaining([
      "agent_cases",
      "agent_decision_branches",
      "agent_decision_tree_versions",
    ]));
    // 033 drops the 胜天半子 storage; the create-then-drop chain must actually
    // remove it, or the migration is lying about what it did.
    expect(tables).not.toEqual(expect.arrayContaining([
      "battle_cases",
      "battle_timeline_nodes",
      "official_catalog_entries",
      "account_connectors",
    ]));
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
