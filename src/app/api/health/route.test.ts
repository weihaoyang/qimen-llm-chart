import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();

vi.mock("@/lib/db/pool", () => ({ query }));

describe("GET /api/health", () => {
  beforeEach(() => query.mockReset());

  it("reports readiness and fails closed without exposing database content", async () => {
    query.mockResolvedValue({ rows: [{ healthy: 1 }] });
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: "shengtian-banzi" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(query).toHaveBeenCalledWith("SELECT 1 AS healthy");

    query.mockRejectedValueOnce(new Error("private database detail"));
    const unavailableResponse = await GET();

    expect(unavailableResponse.status).toBe(503);
    expect(await unavailableResponse.json()).toEqual({ ok: false, service: "shengtian-banzi" });
  });
});
