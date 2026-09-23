import { describe, expect, it, beforeEach, vi } from "vitest";

const { recordSync } = vi.hoisted(() => ({ recordSync:vi.fn() }));
vi.mock("@/lib/platform/connectors", () => ({ CONNECTOR_PROVIDERS:["calendar","email","project_board"], recordConnectorSync:recordSync }));
import { POST } from "./route";

const body = { subjectType:"user", subjectId:"u1", provider:"calendar", idempotencyKey:"sync-1", sourceTitle:"内部日历同步", detectedAnomaly:"会议窗口连续取消", severity:"WARNING", observedAt:"2026-08-29T00:00:00.000Z", suggestedBattlefieldDraft:{ title:"会议窗口异常", dilemma:"关键会议被连续取消", deadlineDays:14, initialConfidence:60 } };

describe("internal connector sync route", () => {
  beforeEach(() => { process.env.QMDJ_CONNECTOR_SYNC_SECRET="test-secret"; recordSync.mockReset(); });
  it("requires the trusted worker secret", async () => {
    const response = await POST(new Request("http://local/api/internal/connectors/sync", { method:"POST", body:JSON.stringify(body) }));
    expect(response.status).toBe(401);
    expect(recordSync).not.toHaveBeenCalled();
  });
  it("accepts a validated worker record", async () => {
    recordSync.mockResolvedValue(true);
    const response = await POST(new Request("http://local/api/internal/connectors/sync", { method:"POST", headers:{ "x-qmdj-connector-secret":"test-secret" }, body:JSON.stringify(body) }));
    expect(response.status).toBe(201);
    expect(recordSync).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey:"sync-1", provider:"calendar" }));
  });
  it("records an internal failure instead of answering it silently", async () => {
    recordSync.mockRejectedValue(new Error("connection terminated unexpectedly"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(new Request("http://local/api/internal/connectors/sync", { method:"POST", headers:{ "x-qmdj-connector-secret":"test-secret" }, body:JSON.stringify(body) }));
      expect(response.status).toBe(500);
      // The cause stays out of the body...
      await expect(response.json()).resolves.toEqual({ error:"写入连接器同步记录失败。" });
      // ...and is not lost either. A bare `catch {` used to answer 500 here with
      // nothing recorded anywhere, so the connector's operator had no way to tell
      // a rejected write from a database that was simply down.
      const logged = errorSpy.mock.calls.map((call) => call.map(String).join(" "));
      expect(logged.some((line) => line.includes("[api]"))).toBe(true);
      expect(logged.some((line) => line.includes("connection terminated unexpectedly"))).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
