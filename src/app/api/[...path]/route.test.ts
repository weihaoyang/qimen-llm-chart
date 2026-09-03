import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("fetch", vi.fn());

import { GET, POST } from "./route";

describe("God's Eye View observation proxy", () => {
  beforeEach(() => vi.mocked(fetch).mockReset());
  it("serves keyless NASA EONET wildfire incidents through the FIRMS contract", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ events:[{ id:"EONET_1", title:"Test fire", geometry:[{ date:"2026-09-01T00:00:00Z", type:"Point", coordinates:[121.5,31.2], magnitudeValue:42 }] }] }), { status:200 }));
    const response = await GET(new Request("http://local/api/firms"), { params: Promise.resolve({ path: ["firms"] }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-fire-source")).toBe("nasa-eonet");
    await expect(response.json()).resolves.toMatchObject({ sourceKind:"open-wildfire-incidents", degraded:true, fires:[{ lat:31.2, lon:121.5, frp:42, eventId:"EONET_1" }] });
  });

  it("rejects unbounded Overpass queries before contacting an upstream", async () => {
    const response = await POST(new Request("http://local/api/overpass", { method: "POST", body: "[out:json];node(1,2,3,4);out;" }), { params: Promise.resolve({ path: ["overpass"] }) });
    expect(response.status).toBe(400);
    expect((await response.json()).reasonCode).toBe("invalid_overpass_query");
  });

  it("accepts the upstream frontend's form-encoded bounded Overpass request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ elements:[] }), { status:200 }));
    const response = await POST(new Request("http://local/api/overpass", {
      method: "POST",
      headers: { "content-type":"application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data:"[out:json];node(around:200,31.2,121.5);out geom;" }).toString(),
    }), { params: Promise.resolve({ path: ["overpass"] }) });
    expect(response.status).toBe(200);
  });

  it("serves the USGS earthquake GeoJSON through the same-origin endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ type:"FeatureCollection", features:[] }), { status:200 }));
    const response = await GET(new Request("http://local/api/earthquakes"), { params:Promise.resolve({ path:["earthquakes"] }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-earthquake-source")).toBe("usgs");
    await expect(response.json()).resolves.toMatchObject({ type:"FeatureCollection", features:[] });
  });

  it("validates and unwraps a USGS payload returned by the public relay", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("TLS blocked"))
      .mockResolvedValueOnce(new Response("Title: USGS\n\nMarkdown Content:\n{\"type\":\"FeatureCollection\",\"features\":[{\"type\":\"Feature\"}]}\n", { status:200 }));
    const response = await GET(new Request("http://local/api/earthquakes"), { params:Promise.resolve({ path:["earthquakes"] }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-earthquake-source")).toBe("usgs-via-public-relay");
    await expect(response.json()).resolves.toMatchObject({ type:"FeatureCollection", features:[{ type:"Feature" }] });
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

  it("falls back to an anonymous OpenSky regional snapshot when adsb.lol is rate limited", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("rate limited", { status:429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ time:1_700_000_001, states:[["abc123","TEST1",null,1_700_000_000,1_700_000_000,121.5,31.2]] }), { status:200 }));
    const response = await GET(new Request("http://local/api/opensky?lat=31.2&lon=121.5"), { params:Promise.resolve({ path:["opensky"] }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-flight-source")).toBe("OpenSky Network");
    expect(response.headers.get("x-flight-degraded")).toBe("true");
    await expect(response.json()).resolves.toMatchObject({ time:1_700_000_001, states:[["abc123","TEST1",null,1_700_000_000,1_700_000_000,121.5,31.2]] });
  });

  it("advertises keyless traffic simulation without pretending TomTom is live", async () => {
    const response = await GET(new Request("http://local/api/tomtom/status"), { params:Promise.resolve({ path:["tomtom","status"] }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ hasKey:false, mode:"simulation" });
  });

  it("requests TLE rather than CelesTrak's default CSV format", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("ISS (ZARYA)\\n1 25544U 98067A   00000.00000000  .00000000  00000-0  00000-0 0  9999\\n2 25544  51.6000 000.0000 0001000 000.0000 000.0000 15.50000000    00\\n", { status:200 }));
    const response = await GET(new Request("http://local/api/celestrak/stations"), { params:Promise.resolve({ path:["celestrak","stations"] }) });
    expect(response.status).toBe(200);
    expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain("FORMAT=tle");
  });

  it("falls back to the live SatNOGS TLE catalog when CelesTrak is unavailable", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("upstream failure", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { tle0: "0 ISS (ZARYA)", tle1: "1 25544U 98067A   26243.85334329  .00004554  00000-0  90917-4 0  9992", tle2: "2 25544  51.6312 285.5874 0005057  94.2999 265.8567 15.48953200583482" },
      ]), { status: 200 }));
    const response = await GET(new Request("http://local/api/celestrak/stations"), { params:Promise.resolve({ path:["celestrak","stations"] }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-satellite-source")).toBe("satnogs-db");
    await expect(response.text()).resolves.toContain("1 25544U 98067A");
    expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toBe("https://db.satnogs.org/api/tle/?format=json");
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

  it("rejects oversized installation viewports before contacting Overpass", async () => {
    vi.mocked(fetch).mockClear();
    const response = await GET(new Request("http://local/api/military-installations?south=0&west=0&north=20&east=20"), { params:Promise.resolve({ path:["military-installations"] }) });
    expect(response.status).toBe(400);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("returns bounded mapped military context with saturation metadata", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ elements:[{ type:"node", id:1, lat:31.2, lon:121.5, tags:{ military:"airfield" } }] }), { status:200 }));
    const response = await GET(new Request("http://local/api/military-installations?south=31&west=121&north=31.5&east=121.8"), { params:Promise.resolve({ path:["military-installations"] }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status:"ready", saturated:false, elementCap:700, elements:[{ id:1 }] });
  });

  it("proxies only allowlisted HTTPS GBFS feeds", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data:{ stations:[] } }), { status:200, headers:{ "content-type":"application/json" } }));
    const upstream = "https://gbfs.lyft.com/gbfs/2.3/bkn/en/station_status.json";
    const response = await GET(new Request(`http://local/api/gbfs/${encodeURIComponent(upstream)}`), { params:Promise.resolve({ path:["gbfs",encodeURIComponent(upstream)] }) });
    expect(response.status).toBe(200);
    expect(vi.mocked(fetch).mock.calls.at(-1)?.[0].toString()).toBe(upstream);
    const blocked = await GET(new Request(`http://local/api/gbfs/${encodeURIComponent("https://example.com/private.json")}`), { params:Promise.resolve({ path:["gbfs",encodeURIComponent("https://example.com/private.json")] }) });
    expect(blocked.status).toBe(400);
  });
});
