import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("fetch", vi.fn());

import { GET, POST } from "./route";

describe("God's Eye View observation proxy", () => {
  it("rejects unconfigured live sources with an explicit status", async () => {
    const response = await GET(new Request("http://local/api/firms"), { params: Promise.resolve({ path: ["firms"] }) });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("no_key");
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

  it("advertises keyless traffic simulation without pretending TomTom is live", async () => {
    const response = await GET(new Request("http://local/api/tomtom/status"), { params:Promise.resolve({ path:["tomtom","status"] }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ hasKey:false, mode:"simulation" });
  });

  it("normalizes a usable Radio Browser directory and accepts known click ids", async () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify([{ stationuuid:id, name:"Test FM", geo_lat:31.2, geo_long:121.5, url_resolved:"https://radio.example.com/live.mp3", country:"China", countrycode:"CN", codec:"MP3", bitrate:128, lastcheckok:1, hls:0 }]),
      { status:200 },
    ));
    const response = await GET(new Request("http://local/api/radio/stations"), { params:Promise.resolve({ path:["radio","stations"] }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ stations:[{ id, name:"Test FM" }], stale:false });
    const click = await POST(new Request(`http://local/api/radio/click/${id}`, { method:"POST" }), { params:Promise.resolve({ path:["radio","click",id] }) });
    expect(click.status).toBe(204);
  });
});
