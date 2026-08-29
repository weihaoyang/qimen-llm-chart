import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AccountSubject } from "@/lib/agent/account-subject";

const databaseEnabled = process.env.QMDJ_RUN_DB_TESTS === "1" && Boolean(process.env.QMDJ_INTEGRATION_DATABASE_URL);
const describeDatabase = databaseEnabled ? describe : describe.skip;
const battleId = randomUUID();
const owner: AccountSubject = { subjectType: "account", subjectId: `world-pulse-test-${randomUUID()}` };

describeDatabase("world pulse project repository database contract", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.QMDJ_INTEGRATION_DATABASE_URL;
    const { query } = await import("@/lib/db/pool");
    await query(
      `INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective)
       VALUES($1,$2,$3,'World Pulse repository test','Verify durable scene project semantics')`,
      [battleId, owner.subjectType, owner.subjectId],
    );
  });

  afterAll(async () => {
    if (!databaseEnabled) return;
    const { getDatabasePool, query } = await import("@/lib/db/pool");
    await query(`DELETE FROM battle_cases WHERE id=$1`, [battleId]);
    await getDatabasePool().end();
  });

  it("persists, restores and safely replays one version", async () => {
    const { getWorldPulseProject, saveWorldPulseProject } = await import("./world-pulse-project-repository");
    const project = { version: 3, scenes: [{ id: "scene-1", title: "Orbit", shots: [] }] };
    const first = await saveWorldPulseProject(owner, battleId, {
      schemaVersion: 3,
      project,
      idempotencyKey: "repository-save-00000001",
      expectedVersion: 0,
    });
    expect(first).toMatchObject({ version: 1, reused: false });

    const replay = await saveWorldPulseProject(owner, battleId, {
      schemaVersion: 3,
      project,
      idempotencyKey: "repository-save-00000001",
      expectedVersion: 0,
    });
    expect(replay).toMatchObject({ version: 1, reused: true });

    const restored = await getWorldPulseProject(owner, battleId);
    expect(restored?.project).toMatchObject({ version: 1, schemaVersion: 3, project });
  });

  it("rejects stale versions and cross-account access", async () => {
    const { getWorldPulseProject, saveWorldPulseProject } = await import("./world-pulse-project-repository");
    const project = { version: 3, scenes: [{ id: "scene-2", title: "Conflict", shots: [] }] };
    expect(await saveWorldPulseProject(owner, battleId, {
      schemaVersion: 3,
      project,
      idempotencyKey: "repository-save-00000002",
      expectedVersion: 0,
    })).toBe("version_conflict");

    const stranger = { subjectType: "account", subjectId: `stranger-${randomUUID()}` };
    expect(await getWorldPulseProject(stranger, battleId)).toBeNull();
    expect(await saveWorldPulseProject(stranger, battleId, {
      schemaVersion: 3,
      project,
      idempotencyKey: "repository-save-00000003",
    })).toBeNull();
  });
});
