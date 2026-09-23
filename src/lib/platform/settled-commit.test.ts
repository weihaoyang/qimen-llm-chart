import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ report: vi.fn() }));

// The real error class is passed through: the helper discriminates with
// `instanceof`, so a stub class would make the settled branch unreachable and the
// tests below would pass for the wrong reason.
vi.mock("./server", async () => {
  const actual = await vi.importActual<typeof import("./server")>("./server");
  return { PlatformServerRequestError: actual.PlatformServerRequestError };
});
vi.mock("@/lib/internal-log", () => ({ reportSwallowedError: mocks.report }));

import { PlatformServerRequestError } from "./server";
import { settledCommit } from "./settled-commit";

describe("settledCommit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the platform's usage when the commit succeeds", async () => {
    const commit = vi.fn(async () => ({ reserved: 0, consumed: 1 }));
    await expect(settledCommit("battle-ai", "reservation-1", commit)).resolves.toEqual({ reserved: 0, consumed: 1 });
    expect(commit).toHaveBeenCalledOnce();
    expect(mocks.report).not.toHaveBeenCalled();
  });

  // The defect this module exists to fix: the earlier attempt's commit landed but
  // the local "charged" record did not, so the credit is already consumed and the
  // platform's compare-and-set answers its one terminal 409. Retrying re-commits
  // the same reservation and gets the same answer forever, so the stored result
  // would be unreachable while the user stays charged.
  it("reconciles the terminal 409 as settled and reports it", async () => {
    const commit = vi.fn(async () => {
      throw new PlatformServerRequestError(409, "usage_reservation_expired", "本次分析预留已过期，请重新发起。");
    });
    await expect(settledCommit("battle-ai", "reservation-1", commit)).resolves.toEqual({
      reconciled: "already_settled",
      reason_code: "usage_reservation_expired",
    });
    // Terminal means terminal: the caller must not be told to try again.
    expect(commit).toHaveBeenCalledOnce();
    expect(mocks.report).toHaveBeenCalledOnce();
    expect(mocks.report.mock.calls[0][0]).toBe("battle-ai");
  });

  // The reason code is what separates "settled" from "try again", and the platform
  // answers 409 for reasons other than an expired reservation elsewhere on the
  // usage surface. Settling one of those would deliver a paid result against a
  // charge that was never confirmed, so only the known code may settle.
  it("does not settle a 409 raised for a different reason", async () => {
    const error = new PlatformServerRequestError(409, "usage_credit_conflict", "并发冲突。");
    const commit = vi.fn(async () => { throw error; });
    await expect(settledCommit("battle-ai", "reservation-1", commit)).rejects.toBe(error);
    expect(mocks.report).not.toHaveBeenCalled();
  });

  // A 5xx or a network failure says nothing about whether the credit was consumed.
  // Settling those would hand out results for charges that never landed.
  it("leaves a transient failure retryable", async () => {
    const error = new PlatformServerRequestError(503, "platform_unavailable", "平台暂时不可用。");
    const commit = vi.fn(async () => { throw error; });
    await expect(settledCommit("battle-ai", "reservation-1", commit)).rejects.toBe(error);
    expect(mocks.report).not.toHaveBeenCalled();
  });

  it("leaves a non-platform error retryable", async () => {
    const error = new Error("network lost after commit");
    const commit = vi.fn(async () => { throw error; });
    await expect(settledCommit("battle-ai", "reservation-1", commit)).rejects.toBe(error);
    expect(mocks.report).not.toHaveBeenCalled();
  });
});
