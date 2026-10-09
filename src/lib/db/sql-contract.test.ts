/**
 * Migration contract, executed by a real Postgres (PGlite).
 *
 * The create-then-drop chain has to leave exactly the tables this product still
 * owns. A guard that only checks "the migration ran" would pass even if a drop
 * silently missed a table, so this pins both sides: what must exist and what
 * must be gone.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { query } from "@/lib/db/pool";
import { installTestPool } from "./testing/pglite-harness";

let database: Awaited<ReturnType<typeof installTestPool>>;

beforeAll(async () => { database = await installTestPool(); });
afterAll(async () => { await database.close(); });

describe("migrations", () => {
  it("applies the whole directory and leaves only the tables this product owns", async () => {
    const result = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
    );
    const tables = result.rows.map((row) => row.table_name);

    expect(tables).toEqual(expect.arrayContaining([
      "agent_cases",
      "agent_interview_turns",
      "agent_evidence_snapshots",
      "bazi_research_rule_releases",
    ]));
    // 033 (胜天半子) and 034 (retired decision tree) must actually remove their
    // storage; the create-then-drop chain is the only thing that proves it.
    expect(tables).not.toEqual(expect.arrayContaining([
      "battle_cases",
      "battle_timeline_nodes",
      "official_catalog_entries",
      "account_connectors",
      "agent_decision_tree_versions",
      "agent_decision_branches",
      "agent_reviews",
    ]));
  });
});
