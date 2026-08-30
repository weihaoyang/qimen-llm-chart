import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class extends Error { status = 401; },
  requireAccountSubject: vi.fn(async () => ({ subjectType: "account", subjectId: "user-1" })),
}));
vi.mock("@/lib/scenarios/world-pulse-calibration-repository", () => ({
  listWorldPulseCalibrations: vi.fn(async () => [{ cameraId: "cam-1", version: 2, values: { offsetNorthM: 4 }, savedAt: "2026-08-30T00:00:00.000Z" }]),
  saveWorldPulseCalibration: vi.fn(async () => ({ cameraId: "cam-1", version: 1, values: {}, reused: false })),
  resetWorldPulseCalibration: vi.fn(async () => ({ deleted: true })),
}));

const context = { params: Promise.resolve({ id: "123e4567-e89b-12d3-a456-426614174000" }) };

describe("world pulse calibration route", () => {
  it("lists battle-scoped calibration rows", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://local"), context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ calibrations: [{ cameraId: "cam-1" }] });
  });

  it("rejects out-of-range calibration before persistence", async () => {
    const { PUT } = await import("./route");
    const response = await PUT(new Request("http://local", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ cameraId: "cam-1", idempotencyKey: "cal-1", values: { offsetNorthM: 9999 } }) }), context);
    expect(response.status).toBe(400);
  });
});
