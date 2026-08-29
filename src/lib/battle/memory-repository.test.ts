import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AccountSubject } from "@/lib/agent/account-subject";

const databaseEnabled = process.env.QMDJ_RUN_DB_TESTS === "1" && Boolean(process.env.QMDJ_INTEGRATION_DATABASE_URL);
const describeDatabase = databaseEnabled ? describe : describe.skip;
const battleId = randomUUID();
const memoryId = randomUUID();
const owner: AccountSubject = { subjectType: "account", subjectId: `memory-test-${randomUUID()}` };

describeDatabase("AI memory repository database contract", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.QMDJ_INTEGRATION_DATABASE_URL;
    const { query } = await import("@/lib/db/pool");
    await query(
      `INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective)
       VALUES($1,$2,$3,'Memory repository test','Verify consent audit semantics')`,
      [battleId, owner.subjectType, owner.subjectId],
    );
  });

  afterAll(async () => {
    if (!databaseEnabled) return;
    const { getDatabasePool, query } = await import("@/lib/db/pool");
    await query(`DELETE FROM battle_memory_record_events WHERE platform_subject_type=$1 AND platform_subject_id=$2`, [owner.subjectType, owner.subjectId]);
    await query(`DELETE FROM battle_cases WHERE id=$1`, [battleId]);
    await getDatabasePool().end();
  });

  it("persists create, edit, pause, resume and delete as append-only events", async () => {
    const { deleteMemory, saveMemory } = await import("./product-state");
    await saveMemory(owner, { id:memoryId, battleId, title:"First", memory:{ memoryQuote:"one" } });
    await saveMemory(owner, { id:memoryId, battleId, title:"Edited", memory:{ memoryQuote:"two" }, consentStatus:"paused" });
    await saveMemory(owner, { id:memoryId, battleId, title:"Edited", memory:{ memoryQuote:"two" }, consentStatus:"active" });
    expect(await deleteMemory(owner, memoryId)).toBe(true);

    const { query } = await import("@/lib/db/pool");
    const events = await query<{ event_type:string }>(
      `SELECT event_type FROM battle_memory_record_events WHERE memory_id=$1 ORDER BY created_at,id`,
      [memoryId],
    );
    expect(events.rows.map((row) => row.event_type)).toEqual(["created", "paused", "resumed", "deleted"]);
  });

  it("does not let another account update or delete the record", async () => {
    const { deleteMemory, saveMemory } = await import("./product-state");
    const stranger: AccountSubject = { subjectType:"account", subjectId:`stranger-${randomUUID()}` };
    expect(await saveMemory(stranger, { id:memoryId, battleId, title:"stolen", memory:{ memoryQuote:"x" } })).toBeNull();
    expect(await deleteMemory(stranger, memoryId)).toBe(false);
  });
});
