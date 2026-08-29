import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AccountSubject } from "@/lib/agent/account-subject";

const databaseEnabled = process.env.QMDJ_RUN_DB_TESTS === "1" && Boolean(process.env.QMDJ_INTEGRATION_DATABASE_URL);
const describeDatabase = databaseEnabled ? describe : describe.skip;
const battleId = randomUUID();
const owner: AccountSubject = { subjectType: "account", subjectId: `world-pulse-observation-${randomUUID()}` };
const observation = {
  source: "gods-eye-view", observationKey: "view:test-1", observationType: "viewport", title: "Austin viewport",
  observedAt: "2026-08-30T12:00:00.000Z", location: { latitude: 30.2672, longitude: -97.7431 },
  snapshot: { enabledLayers: ["earthquakes"], camera: { height: 1000 } }, idempotencyKey: "observation-repository-save-0001",
};

describeDatabase("world pulse observation repository database contract", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.QMDJ_INTEGRATION_DATABASE_URL;
    const { query } = await import("@/lib/db/pool");
    await query(`INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective) VALUES($1,$2,$3,'World Pulse observation test','Verify durable observed signals')`, [battleId, owner.subjectType, owner.subjectId]);
  });
  afterAll(async () => {
    if (!databaseEnabled) return;
    const { getDatabasePool, query } = await import("@/lib/db/pool");
    await query(`DELETE FROM battle_cases WHERE id=$1`, [battleId]);
    await getDatabasePool().end();
  });
  it("records, restores and safely replays an explicit observation", async () => {
    const { listWorldPulseObservations, recordWorldPulseObservation } = await import("./world-pulse-observation-repository");
    expect(await recordWorldPulseObservation(owner, battleId, observation)).toMatchObject({ source: "gods-eye-view", reused: false });
    expect(await recordWorldPulseObservation(owner, battleId, observation)).toMatchObject({ observationKey: "view:test-1", reused: true });
    expect(await listWorldPulseObservations(owner, battleId)).toEqual([expect.objectContaining({ title: "Austin viewport" })]);
  });
  it("does not expose observations to another account", async () => {
    const { listWorldPulseObservations, recordWorldPulseObservation } = await import("./world-pulse-observation-repository");
    const stranger: AccountSubject = { subjectType: "account", subjectId: `stranger-${randomUUID()}` };
    expect(await listWorldPulseObservations(stranger, battleId)).toBeNull();
    expect(await recordWorldPulseObservation(stranger, battleId, { ...observation, idempotencyKey: "observation-repository-save-0002" })).toBeNull();
  });
});
