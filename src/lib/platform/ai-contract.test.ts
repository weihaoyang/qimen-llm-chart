import { describe, expect, it, vi } from "vitest";
import { readProviderUsage, runBilledAi, type AiAuditEvent } from "./ai-contract";

const input = { productCode: "shengtian-banzi", accessScope: "shengtian-banzi-core", capability: "agent", planCode: "shengtian-banzi-analysis-10" };

describe("runBilledAi", () => {
  it("reserves, invokes, commits once, and records token usage", async () => {
    const audit: AiAuditEvent[] = [];
    const adapter = { reserve: vi.fn().mockResolvedValue({ reservation_id: "r-1" }), commit: vi.fn().mockResolvedValue({ available: 9, reserved: 0, consumed: 1 }), release: vi.fn(), audit: (event: AiAuditEvent) => audit.push(event) };
    const result = await runBilledAi(adapter, input, async () => ({ result: "ok", usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } }));
    expect(result.result).toBe("ok");
    expect(adapter.reserve).toHaveBeenCalledOnce();
    expect(adapter.commit).toHaveBeenCalledOnce();
    expect(adapter.release).not.toHaveBeenCalled();
    expect(audit.map((event) => event.status)).toEqual(["reserved", "succeeded"]);
    expect(audit[1]?.usage?.totalTokens).toBe(15);
  });

  it("releases exactly once when the provider fails", async () => {
    const adapter = { reserve: vi.fn().mockResolvedValue({ reservation_id: "r-2" }), commit: vi.fn(), release: vi.fn().mockResolvedValue({}), audit: vi.fn() };
    await expect(runBilledAi(adapter, input, async () => { throw new Error("provider down"); })).rejects.toThrow("provider down");
    expect(adapter.release).toHaveBeenCalledOnce();
    expect(adapter.commit).not.toHaveBeenCalled();
  });

  it("does not release after a provider result when commit is ambiguous", async () => {
    const adapter = { reserve: vi.fn().mockResolvedValue({ reservation_id: "r-3" }), commit: vi.fn().mockRejectedValue(new Error("commit timeout")), release: vi.fn(), audit: vi.fn() };
    await expect(runBilledAi(adapter, input, async () => ({ result: "delivered" }))).rejects.toThrow("commit timeout");
    expect(adapter.commit).toHaveBeenCalledOnce();
    expect(adapter.release).not.toHaveBeenCalled();
  });
});

describe("readProviderUsage", () => {
  it("maps OpenAI-compatible usage fields to audit fields", () => {
    expect(readProviderUsage({ prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 })).toEqual({ inputTokens: 12, outputTokens: 8, totalTokens: 20 });
  });

  it("accepts AI SDK names and derives total tokens", () => {
    expect(readProviderUsage({ inputTokens: 4, outputTokens: 3 })).toEqual({ inputTokens: 4, outputTokens: 3, totalTokens: 7 });
  });

  it("rejects malformed or negative counters", () => {
    expect(readProviderUsage({ prompt_tokens: -1, completion_tokens: "3" })).toBeUndefined();
  });
});
