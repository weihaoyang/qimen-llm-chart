import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("fetch", vi.fn());

import { GET, POST } from "./route";

describe("God's Eye View observation proxy", () => {
  it("rejects unconfigured live sources with an explicit status", async () => {
    const response = await GET(new Request("http://local/api/firms"), { params: Promise.resolve({ path: ["firms"] }) });
    expect(response.status).toBe(503);
    expect((await response.json()).reasonCode).toBe("upstream_not_configured");
  });

  it("rejects unbounded Overpass queries before contacting an upstream", async () => {
    const response = await POST(new Request("http://local/api/overpass", { method: "POST", body: "[out:json];node(1,2,3,4);out;" }), { params: Promise.resolve({ path: ["overpass"] }) });
    expect(response.status).toBe(400);
    expect((await response.json()).reasonCode).toBe("invalid_overpass_query");
  });
});
