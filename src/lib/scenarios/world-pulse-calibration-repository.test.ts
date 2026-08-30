import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { AccountSubject } from "@/lib/agent/account-subject";
import { query } from "@/lib/db/pool";

const enabled = process.env.QMDJ_RUN_DB_TESTS === "1" && Boolean(process.env.QMDJ_INTEGRATION_DATABASE_URL);
const describeDatabase = enabled ? describe : describe.skip;
const owner: AccountSubject = { subjectType: "account", subjectId: `calibration-${randomUUID()}` };

describeDatabase("world pulse calibration repository database contract", () => {
  it("saves, restores, idempotently replays and resets a calibration", async () => {
    const { listWorldPulseCalibrations, resetWorldPulseCalibration, saveWorldPulseCalibration } = await import("./world-pulse-calibration-repository");
    const battleId = randomUUID();
    const cameraId = "cam-test-1";
    await query(`INSERT INTO battle_cases(id,platform_subject_type,platform_subject_id,title,objective) VALUES($1,$2,$3,'Calibration test','Persist CCTV calibration')`, [battleId, owner.subjectType, owner.subjectId]);
    try {
      const input = { cameraId, values: { offsetNorthM: 4, offsetEastM: -2, headingDeg: 1, pitchDeg: 0, fovDeg: 0, rangeScale: 1.1, heightM: 3 }, idempotencyKey: "calibration-test-key" };
      const saved = await saveWorldPulseCalibration(owner, battleId, input);
      expect(saved).toMatchObject({ cameraId, version: 1, reused: false, values: input.values });
      const replay = await saveWorldPulseCalibration(owner, battleId, input);
      expect(replay).toMatchObject({ cameraId, version: 1, reused: true });
      expect(await listWorldPulseCalibrations(owner, battleId)).toHaveLength(1);
      expect(await resetWorldPulseCalibration(owner, battleId, cameraId)).toEqual({ deleted: true });
      expect(await listWorldPulseCalibrations(owner, battleId)).toEqual([]);
    } finally {
      await query(`DELETE FROM battle_cases WHERE id=$1`, [battleId]);
    }
  });
});
