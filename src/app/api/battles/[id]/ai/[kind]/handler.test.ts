import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subject: vi.fn(),
  loadBattleInput: vi.fn(),
  listActiveMemorySummaries: vi.fn(),
  createAiJob: vi.fn(),
  getAiJob: vi.fn(),
  startAiJob: vi.fn(),
  claimAiJobCommit: vi.fn(),
  finishAiJob: vi.fn(),
  failAiJob: vi.fn(),
  setAiJobReservation: vi.fn(),
  markAiJobCharged: vi.fn(),
  hashSnapshot: vi.fn(() => "snapshot-hash"),
  requestAgentAnalysis: vi.fn(),
  gate: vi.fn(),
  reserve: vi.fn(),
  commit: vi.fn(),
  release: vi.fn(),
  appendInventory: vi.fn(),
  createAdvice: vi.fn(),
  createReview: vi.fn(),
  appendInterviewTurn: vi.fn(),
}));

vi.mock("@/lib/agent/account-subject", () => ({
  AccountSubjectError: class extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
  requireAccountSubject: mocks.subject,
}));
vi.mock("@/lib/battle/service", () => ({ loadBattleInput: mocks.loadBattleInput }));
vi.mock("@/lib/battle/product-state", () => ({
  createAiJob: mocks.createAiJob,
  getAiJob: mocks.getAiJob,
  startAiJob: mocks.startAiJob,
  claimAiJobCommit: mocks.claimAiJobCommit,
  finishAiJob: mocks.finishAiJob,
  failAiJob: mocks.failAiJob,
  setAiJobReservation: mocks.setAiJobReservation,
  markAiJobCharged: mocks.markAiJobCharged,
  hashSnapshot: mocks.hashSnapshot,
  listActiveMemorySummaries: mocks.listActiveMemorySummaries,
}));
vi.mock("@/lib/agent/chat", () => ({ requestAgentAnalysis: mocks.requestAgentAnalysis }));
// `PlatformServerRequestError` is passed through from the real module rather than
// stubbed: the handler distinguishes a settled reservation from a transient
// failure with `instanceof`, so a hand-rolled look-alike class would make the
// branch under test unreachable and the tests below would pass for the wrong
// reason.
vi.mock("@/lib/platform/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/platform/server")>("@/lib/platform/server");
  return {
    AGENT_PLAN_CODE: "agent",
    PlatformServerRequestError: actual.PlatformServerRequestError,
    readBearerToken: vi.fn(() => "token"),
    readCookieValue: vi.fn(() => ""),
    readPlatformCookieHeader: vi.fn(() => ""),
    fetchPlatformGate: mocks.gate,
    reservePlatformUsage: mocks.reserve,
    commitPlatformUsage: mocks.commit,
    releasePlatformUsage: mocks.release,
  };
});
vi.mock("@/lib/battle/repository", () => ({ appendInventory: mocks.appendInventory }));
vi.mock("@/lib/battle/extended-repository", () => ({ createAdvice: mocks.createAdvice, createReview: mocks.createReview }));
vi.mock("@/lib/battle/interview-repository", () => ({ appendInterviewTurn: mocks.appendInterviewTurn }));

import { AccountSubjectError } from "@/lib/agent/account-subject";
import { PlatformServerRequestError } from "@/lib/platform/server";
import { POST } from "./route";

const battleId = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id: battleId, kind: "red-team" }) };
const request = () =>
  new Request(`http://local/api/battles/${battleId}/ai/red-team`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer token" },
    body: JSON.stringify({ question: "推演红队视角" }),
  });

const validRedTeam = {
  critique: "方案过度依赖单点渠道。",
  biasWarning: "存在幸存者偏差。",
  fatalVulnerability: "现金流断裂。",
  suggestedFocus: "优先验证渠道集中度。",
  failureProbability: 0.42,
};

const order = (fn: { mock: { invocationCallOrder: number[] } }) => fn.mock.invocationCallOrder[0];

describe("POST /api/battles/[id]/ai/[kind]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subject.mockResolvedValue({ subjectType: "user", subjectId: "u1" });
    mocks.loadBattleInput.mockResolvedValue({ battle: { id: battleId }, input: {} });
    mocks.listActiveMemorySummaries.mockResolvedValue([]);
    mocks.gate.mockResolvedValue({ allowed: true, reason_code: "", message: "ok" });
    mocks.reserve.mockResolvedValue({ reservation_id: "reservation-1" });
    mocks.commit.mockResolvedValue({ consumed: 1 });
    mocks.startAiJob.mockResolvedValue(true);
    mocks.setAiJobReservation.mockResolvedValue(true);
    mocks.claimAiJobCommit.mockResolvedValue(true);
    mocks.markAiJobCharged.mockResolvedValue(true);
    mocks.finishAiJob.mockResolvedValue(true);
    mocks.failAiJob.mockResolvedValue(true);
    mocks.getAiJob.mockResolvedValue({ jobId: "job-1", status: "succeeded" });
    mocks.requestAgentAnalysis.mockResolvedValue({ content: JSON.stringify(validRedTeam), model: "test-model" });
    mocks.createAdvice.mockResolvedValue({ id: "advice-1" });
  });

  it("runs the gate before spending, then charges exactly once", async () => {
    mocks.createAiJob.mockResolvedValue({ jobId: "job-1", runToken: "rt-1", status: "queued", result: null, usage: null, reused: false });

    const response = await POST(request(), context);

    expect(response.status).toBe(200);
    expect(order(mocks.gate)).toBeLessThan(order(mocks.reserve));
    expect(order(mocks.reserve)).toBeLessThan(order(mocks.requestAgentAnalysis));
    expect(mocks.reserve).toHaveBeenCalledOnce();
    expect(mocks.commit).toHaveBeenCalledOnce();
    expect(mocks.finishAiJob).toHaveBeenCalledOnce();
  });

  it("blocks a fresh job when the platform denies entitlement and records the failure", async () => {
    mocks.createAiJob.mockResolvedValue({ jobId: "job-1", runToken: "rt-1", status: "queued", result: null, usage: null, reused: false });
    mocks.gate.mockResolvedValue({ allowed: false, reason_code: "entitlement_missing", message: "请先购买。" });

    const response = await POST(request(), context);

    expect(response.status).toBe(402);
    expect(mocks.failAiJob).toHaveBeenCalledWith(expect.anything(), battleId, "job-1", "rt-1", "entitlement_gate_blocked", "请先购买。");
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.requestAgentAnalysis).not.toHaveBeenCalled();
  });

  // --- Q: does a replay re-check entitlement? ---

  it("puts the account gate in front of the replay path", async () => {
    // The replay branch returns a stored result, so it must not be reachable
    // without passing identity/entitlement first. `requireAccountSubject`
    // queries the platform gate for the canonical subject on every call, and the
    // handler calls it before touching `battle_ai_jobs`.
    mocks.createAiJob.mockResolvedValue({ jobId: "job-1", runToken: "rt-1", status: "succeeded", result: validRedTeam, usage: { consumed: 1 }, reused: true });

    await POST(request(), context);

    expect(order(mocks.subject)).toBeLessThan(order(mocks.createAiJob));
  });

  it("never reaches a stored result when the account gate rejects", async () => {
    mocks.subject.mockRejectedValue(new AccountSubjectError(401, "请先登录平台账户。"));

    const response = await POST(request(), context);

    expect(response.status).toBe(401);
    expect(mocks.createAiJob).not.toHaveBeenCalled();
    expect(mocks.getAiJob).not.toHaveBeenCalled();
  });

  it("replays a charged job without charging a second time", async () => {
    mocks.createAiJob.mockResolvedValue({ jobId: "job-1", runToken: "rt-1", status: "succeeded", result: validRedTeam, usage: { consumed: 1 }, reused: true });

    const response = await POST(request(), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ reused: true, usage: { consumed: 1 } });
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.requestAgentAnalysis).not.toHaveBeenCalled();
  });

  // Characterization, deliberately pinned: see audit appendix eight.
  //
  // A replay is NOT re-checked against `gate.allowed`. Every replayable status
  // is post-charge — `finishAiJob` only accepts `status='charged'`, and a job
  // only reaches `charged` after `commitPlatformUsage` succeeded — so the result
  // was already paid for and already handed to this caller. Re-enforcing
  // `allowed` here would revoke access to purchased content, which is a
  // regression rather than a fix. The sibling `battles/[id]/usage` route pins
  // the same behaviour.
  it("does not re-enforce the entitlement decision on an already-charged replay", async () => {
    mocks.createAiJob.mockResolvedValue({ jobId: "job-1", runToken: "rt-1", status: "succeeded", result: validRedTeam, usage: { consumed: 1 }, reused: true });

    const response = await POST(request(), context);

    expect(response.status).toBe(200);
    expect(mocks.gate).not.toHaveBeenCalled();
  });

  it("recovers an interrupted commit by committing the stored reservation, not a new one", async () => {
    mocks.createAiJob.mockResolvedValue({ jobId: "job-1", runToken: "rt-1", status: "committing", reservationId: "reservation-1", result: validRedTeam, usage: null, reused: true });

    const response = await POST(request(), context);

    expect(response.status).toBe(200);
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.commit).toHaveBeenCalledWith("token", "reservation-1", { planCode: "agent" });
    expect(mocks.markAiJobCharged).toHaveBeenCalledOnce();
  });

  // W — the platform's commit is a compare-and-set: it answers `409
  // usage_reservation_expired` whenever the credit is no longer `reserved`. A
  // retry sees exactly that after the earlier attempt's commit landed but
  // `markAiJobCharged` did not. The 409 is terminal, so retrying cannot clear it,
  // and the model result is already durably stored — failing here would turn an
  // analysis the user paid for into something they can never open.
  it("delivers the stored result when the platform reports the reservation already settled", async () => {
    mocks.createAiJob.mockResolvedValue({ jobId: "job-1", runToken: "rt-1", status: "committing", reservationId: "reservation-1", result: validRedTeam, usage: null, reused: true });
    mocks.commit.mockRejectedValue(new PlatformServerRequestError(409, "usage_reservation_expired", "本次分析预留已过期，请重新发起。"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(request(), context);

      expect(response.status).toBe(200);
      expect(mocks.markAiJobCharged).toHaveBeenCalledOnce();
      // Exactly one commit, and no release: the reservation is settled, so it must
      // neither be re-committed nor refunded.
      expect(mocks.commit).toHaveBeenCalledOnce();
      expect(mocks.release).not.toHaveBeenCalled();
      // Reported rather than silently swallowed — in the refunded sub-case the user
      // received an analysis without being charged, which an operator should be
      // able to find.
      const reported = errorSpy.mock.calls.map((call) => String(call[0]));
      expect(reported.some((line) => line.startsWith("[battle-ai]") && line.includes("reservation-1"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  // The counterpart, and the reason the reconciliation keys off the status code
  // rather than "the commit threw": a network error or a 5xx says nothing about
  // whether the credit was consumed. Settling those would hand out results for
  // charges that never landed.
  it("keeps a transient commit failure retryable instead of settling it", async () => {
    mocks.createAiJob.mockResolvedValue({ jobId: "job-1", runToken: "rt-1", status: "committing", reservationId: "reservation-1", result: validRedTeam, usage: null, reused: true });
    mocks.commit.mockRejectedValue(new PlatformServerRequestError(503, "platform_unavailable", "平台暂时不可用。"));

    const response = await POST(request(), context);

    expect(response.status).not.toBe(200);
    expect(mocks.markAiJobCharged).not.toHaveBeenCalled();
  });

  it("refuses to resume an incomplete commit snapshot instead of charging blind", async () => {
    mocks.createAiJob.mockResolvedValue({ jobId: "job-1", runToken: "rt-1", status: "committing", reservationId: "reservation-1", result: null, usage: null, reused: true });

    const response = await POST(request(), context);

    expect(response.status).toBe(500);
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.release).not.toHaveBeenCalled();
    // `failAiJob` is called, but it only matches `status IN ('queued','running')`,
    // so on a `committing` row it is a deliberate no-op: the reservation is left
    // in place for reconciliation rather than silently dropped.
  });

  // --- X: a swallowed cleanup failure must still leave a trace ---

  it("reports both cleanup failures without letting them mask the original error", async () => {
    // The worst case for a bare `catch {}`: the request fails, and then both
    // best-effort cleanups fail too. The caller must still receive the handler's
    // own 500 rather than an error thrown from a catch block, and an operator
    // must be able to see that the reservation was never released and that the
    // job is still marked running.
    mocks.createAiJob.mockResolvedValue({ jobId: "job-1", runToken: "rt-1", status: "queued", result: null, usage: null, reused: false });
    mocks.requestAgentAnalysis.mockRejectedValue(new Error("model upstream exploded"));
    mocks.release.mockRejectedValueOnce(new Error("platform unreachable"));
    mocks.failAiJob.mockRejectedValueOnce(new Error("database down"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(request(), context);

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toMatchObject({ error: "AI 推演失败。" });

      const reported = errorSpy.mock.calls.map((call) => String(call[0]));
      expect(reported.some((line) => line.startsWith("[battle-ai]") && line.includes("reservation-1"))).toBe(true);
      expect(reported.some((line) => line.startsWith("[battle-ai]") && line.includes("job-1"))).toBe(true);
      // The original error is reported too — the cleanup failures must not
      // replace it as the thing an operator sees.
      expect(errorSpy.mock.calls.flat().some((value) => value instanceof Error && value.message === "model upstream exploded")).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
