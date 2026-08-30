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

  it("serves a commercial-compatible adsb.lol regional flight snapshot", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ now:1_700_000_000, ac:[{ hex:"abc123", flight:"TEST1", lat:31.2, lon:121.5, alt_baro:10000 }] }), { status:200 }));
    const response = await GET(new Request("http://local/api/opensky?lat=31.2&lon=121.5"), { params:Promise.resolve({ path:["opensky"] }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-flight-source")).toBe("adsb.lol");
    const payload = await response.json() as { states: unknown[][] };
    expect(payload.states).toHaveLength(1);
    expect(payload.states[0].slice(0, 7)).toEqual(["abc123", "TEST1", null, 1_700_000_000, 1_700_000_000, 121.5, 31.2]);
  });
});
