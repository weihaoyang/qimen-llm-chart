import { NextResponse } from "next/server";
import { normalizeAdsbLolPointResponse } from "@/lib/scenarios/adsb-lol";
import { normalizeRadioBrowserStation, radioStationIdValid } from "@/lib/scenarios/radio-browser";

type Context = { params: Promise<{ path: string[] }> };

const UPSTREAM_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;
const SATNOGS_TLE_ENDPOINT = "https://db.satnogs.org/api/tle/?format=json";
const USGS_EARTHQUAKE_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
// Some networks reject USGS's TLS chain. Jina relays the public, unmodified
// feed in a text envelope, which lets the server preserve a real USGS payload
// without exposing the browser to a cross-origin/TLS failure.
const USGS_EARTHQUAKE_RELAY = `https://r.jina.ai/http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`;
const NASA_EONET_WILDFIRES = "https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=500";
const ADSBLOL_RADIUS_NM = 250;
const MILITARY_INSTALLATION_CAP = 700;
const servedRadioIds = new Set<string>();
const GBFS_HOSTS = new Set(["gbfs.lyft.com","gbfs.bluebikes.com","gbfs.bcycle.com","gbfs.biketownpdx.com","gbfs.cogobikeshare.com"]);
let satnogsFallbackPromise: Promise<string | null> | null = null;
let lastFlightSnapshot: Record<string, unknown> | null = null;
let lastFlightSnapshotAt = 0;
let lastMilitarySnapshot: Record<string, unknown> | null = null;
let lastMilitarySnapshotAt = 0;

const jsonError = (status: number, error: string, reasonCode: string) => NextResponse.json({ error, reasonCode }, { status, headers: { "Cache-Control": "no-store" } });

function validCoordinate(value: string | null, min: number, max: number) {
  if (!value || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function copyHeaders(response: Response) {
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("cache-control", "no-store");
  return headers;
}

async function relay(response: Response) {
  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_RESPONSE_BYTES) return jsonError(502, "观测源响应过大。", "upstream_response_too_large");
  return new NextResponse(body, { status: response.status, headers: copyHeaders(response) });
}

async function fetchWithTimeout(url: URL | string, init?: RequestInit) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS), redirect: "error", cache: "no-store" });
}

async function readJsonCapped(response: Response) {
  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_RESPONSE_BYTES) throw new Error("upstream_response_too_large");
  return JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown>;
}

async function readTextCapped(response: Response) {
  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_RESPONSE_BYTES) throw new Error("upstream_response_too_large");
  return new TextDecoder().decode(body);
}

async function proxyEarthquakes() {
  try {
    const response = await fetchWithTimeout(USGS_EARTHQUAKE_FEED, {
      headers: { Accept: "application/geo+json,application/json", "User-Agent": "qmdj-world-pulse/1.0" },
    });
    if (response.ok) {
      return new NextResponse(await response.arrayBuffer(), {
        headers: { "Content-Type": "application/geo+json; charset=utf-8", "Cache-Control": "public, max-age=60", "X-Earthquake-Source": "usgs" },
      });
    }
  } catch { /* use the public relay below */ }

  try {
    const response = await fetchWithTimeout(USGS_EARTHQUAKE_RELAY, {
      headers: { Accept: "text/plain", "User-Agent": "qmdj-world-pulse/1.0" },
    });
    if (!response.ok) return jsonError(503, "地震观测源暂时不可用。", "upstream_unavailable");
    const text = await readTextCapped(response);
    const marker = "Markdown Content:\n";
    const markerIndex = text.indexOf(marker);
    const payload = (markerIndex >= 0 ? text.slice(markerIndex + marker.length) : text).trim();
    // Validate before returning so a relay error page is never presented to
    // the globe as a successful earthquake catalog.
    const parsed = JSON.parse(payload) as { type?: string; features?: unknown[] };
    if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) throw new Error("invalid_earthquake_payload");
    return new NextResponse(JSON.stringify(parsed), {
      headers: {
        "Content-Type": "application/geo+json; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        "X-Earthquake-Source": "usgs-via-public-relay",
        "X-Earthquake-Degraded": "true",
      },
    });
  } catch {
    return jsonError(503, "地震观测源暂时不可用。", "upstream_unavailable");
  }
}

type FireRecord = {
  index: number;
  lat: number;
  lon: number;
  frp: number;
  confidence: number | null;
  brightness: number;
  acqMs: number | null;
  satellite: string;
  sensor: string;
  night: boolean;
  eventId?: string;
  title?: string;
};

function parseFirmsCsv(csv: string): FireRecord[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((value) => value.trim().toLowerCase());
  const at = (name: string) => headers.indexOf(name);
  const latAt = at("latitude");
  const lonAt = at("longitude");
  const frpAt = at("frp");
  const confAt = at("confidence");
  const brightnessAt = at("bright_ti4");
  const dateAt = at("acq_date");
  const timeAt = at("acq_time");
  const satAt = at("satellite");
  if (latAt < 0 || lonAt < 0) return [];
  const records: FireRecord[] = [];
  for (const line of lines.slice(1)) {
    const values = line.split(",").map((value) => value.trim());
    const lat = Number(values[latAt]);
    const lon = Number(values[lonAt]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    const time = dateAt >= 0 ? `${values[dateAt]}T${String(values[timeAt] ?? "0000").padStart(4, "0").slice(0, 2)}:${String(values[timeAt] ?? "0000").padStart(4, "0").slice(2)}:00Z` : "";
    const acqMs = Date.parse(time);
    records.push({ index: records.length, lat, lon, frp: Number.isFinite(Number(values[frpAt])) ? Number(values[frpAt]) : 0, confidence: confAt >= 0 && Number.isFinite(Number(values[confAt])) ? Number(values[confAt]) : null, brightness: brightnessAt >= 0 && Number.isFinite(Number(values[brightnessAt])) ? Number(values[brightnessAt]) : 0, acqMs: Number.isFinite(acqMs) ? acqMs : null, satellite: satAt >= 0 ? values[satAt] || "FIRMS" : "FIRMS", sensor: "VIIRS/MODIS", night: false });
  }
  return records;
}

async function proxyFirms() {
  const mapKey = process.env.FIRMS_MAP_KEY?.trim();
  if (mapKey) {
    try {
      const target = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/VIIRS_SNPP_NRT/world/1`;
      const response = await fetchWithTimeout(target, { headers: { Accept: "text/csv", "User-Agent": "qmdj-world-pulse/1.0" } });
      if (response.ok) {
        const fires = parseFirmsCsv(await readTextCapped(response));
        if (fires.length) return NextResponse.json({ fires, fetchedAt: Date.now(), stale: false, source: "NASA FIRMS", sourceKind: "satellite-hotspots", degraded: false }, { headers: { "Cache-Control": "public, max-age=300", "X-Fire-Source": "nasa-firms" } });
      }
    } catch { /* use the keyless public event catalog below */ }
  }
  try {
    const response = await fetchWithTimeout(NASA_EONET_WILDFIRES, { headers: { Accept: "application/json", "User-Agent": "qmdj-world-pulse/1.0" } });
    if (!response.ok) return jsonError(503, "公开野火事件观测源暂时不可用。", "upstream_unavailable");
    const payload = await readJsonCapped(response) as { events?: Array<Record<string, unknown>> };
    const fires: FireRecord[] = [];
    for (const event of Array.isArray(payload.events) ? payload.events : []) {
      const geometries = Array.isArray(event.geometry) ? event.geometry : [];
      const geometry = geometries[geometries.length - 1] as Record<string, unknown> | undefined;
      const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
      const lon = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
      const magnitude = Number(geometry?.magnitudeValue);
      const date = Date.parse(String(geometry?.date ?? ""));
      fires.push({ index: fires.length, lat, lon, frp: Number.isFinite(magnitude) ? magnitude : 0, confidence: null, brightness: 0, acqMs: Number.isFinite(date) ? date : null, satellite: "EONET", sensor: "IRWIN", night: false, eventId: String(event.id ?? ""), title: String(event.title ?? "") });
    }
    return NextResponse.json({ fires, fetchedAt: Date.now(), stale: false, source: "NASA EONET / IRWIN", sourceKind: "open-wildfire-incidents", degraded: true }, { headers: { "Cache-Control": "public, max-age=300", "X-Fire-Source": "nasa-eonet", "X-Fire-Degraded": "true" } });
  } catch {
    return jsonError(503, "公开野火事件观测源暂时不可用。", "upstream_unavailable");
  }
}

async function fetchSatnogsTleFallback() {
  if (satnogsFallbackPromise) return satnogsFallbackPromise;
  satnogsFallbackPromise = (async () => {
    try {
      const response = await fetchWithTimeout(SATNOGS_TLE_ENDPOINT, {
        headers: {
          Accept: "application/json",
          "User-Agent": "qmdj-world-pulse/1.0",
        },
      });
      if (!response.ok) return null;
      const payload = await readJsonCapped(response);
      const rows = Array.isArray(payload) ? payload : [];
      const text = rows
        .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value)))
        .map((value) => [value.tle0, value.tle1, value.tle2].map((line) => typeof line === "string" ? line.trim() : ""))
        .filter(([name, line1, line2]) => Boolean(name && line1.startsWith("1 ") && line2.startsWith("2 ")))
        .map(([name, line1, line2]) => `${name}\n${line1}\n${line2}`)
        .join("\n");
      return text ? `${text}\n` : null;
    } catch {
      return null;
    } finally {
      satnogsFallbackPromise = null;
    }
  })();
  return satnogsFallbackPromise;
}

async function proxyMilitaryInstallations(incoming: URL) {
  const south = validCoordinate(incoming.searchParams.get("south"), -90, 90);
  const west = validCoordinate(incoming.searchParams.get("west"), -180, 180);
  const north = validCoordinate(incoming.searchParams.get("north"), -90, 90);
  const east = validCoordinate(incoming.searchParams.get("east"), -180, 180);
  if (south === null || west === null || north === null || east === null || south >= north || west >= east || north-south > 10 || east-west > 10) {
    return jsonError(400, "军事设施观测需要不超过 10 度的非跨日界线视窗。", "invalid_bbox");
  }
  const bbox = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:20];(nwr["military"~"^(airfield|naval_base|range|barracks|base)$"](${bbox});nwr["landuse"="military"](${bbox}););out center tags geom ${MILITARY_INSTALLATION_CAP};`;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(endpoint, { method:"POST", headers:{ "Content-Type":"text/plain", Accept:"application/json", "User-Agent":"qmdj-world-pulse/1.0" }, body:query });
      if (!response.ok) continue;
      const payload = await readJsonCapped(response);
      const elements = Array.isArray(payload.elements) ? payload.elements.slice(0, MILITARY_INSTALLATION_CAP) : [];
      return NextResponse.json({ elements, saturated:elements.length >= MILITARY_INSTALLATION_CAP, elementCap:MILITARY_INSTALLATION_CAP, retrievedAt:new Date().toISOString(), status:"ready" }, { headers:{ "Cache-Control":"public, max-age=60" } });
    } catch { /* try next mirror */ }
  }
  return jsonError(503, "地图军事设施观测源暂时不可用。", "upstream_unavailable");
}

function gbfsTarget(incoming: URL) {
  try {
    const encoded = incoming.pathname.replace(/^\/api\/gbfs\//, "");
    const target = new URL(decodeURIComponent(encoded));
    const host = target.hostname.toLowerCase();
    if (target.protocol !== "https:" || target.username || target.password || target.port
      || !(GBFS_HOSTS.has(host) || host.endsWith(".publicbikesystem.net"))) return null;
    return target;
  } catch { return null; }
}

async function proxyGet(path: string[], request: Request) {
  const [root, ...rest] = path;
  const incoming = new URL(request.url);
  let target: URL;

  if (root === "opensky" && rest.length === 0) {
    const latitude = validCoordinate(incoming.searchParams.get("lat"), -90, 90);
    const longitude = validCoordinate(incoming.searchParams.get("lon"), -180, 180);
    if (latitude === null || longitude === null) return jsonError(400, "航班观测需要有效视角坐标。", "invalid_coordinates");
    const roundedLat = Math.round(latitude * 4) / 4;
    const roundedLon = Math.round(longitude * 4) / 4;
    target = new URL(`https://api.adsb.lol/v2/lat/${roundedLat}/lon/${roundedLon}/dist/${ADSBLOL_RADIUS_NM}`);
  } else if (root === "earthquakes" && rest.length === 0) {
    return proxyEarthquakes();
  } else if (root === "opensky-track" && rest.length === 0) {
    // The upstream snapshot API does not provide historical traces. Keep the
    // same-origin contract explicit so the GEV panel can show an unavailable
    // track instead of receiving a misleading synthetic line.
    return jsonError(503, "OpenSky 航迹需要已配置的历史轨迹源。", "track_source_unavailable");
  } else if (root === "military-installations" && rest.length === 0) {
    return proxyMilitaryInstallations(incoming);
  } else if (root === "adsblol" && rest.length === 1 && rest[0] === "mil") {
    target = new URL("https://api.adsb.lol/v2/mil");
  } else if (root === "adsblol" && rest.length === 1 && rest[0] === "trace") {
    const hex = incoming.searchParams.get("hex")?.trim().toLowerCase() ?? "";
    if (!/^[0-9a-f~]{6,7}$/.test(hex)) return jsonError(400, "航空器标识无效。", "invalid_aircraft_id");
    target = new URL(`https://adsb.lol/data/traces/${hex.slice(-2)}/trace_full_${hex}.json`);
  } else if (root === "adsbdb" && rest.length === 2 && rest[0] === "type" && /^[0-9a-f]{6}$/i.test(rest[1])) {
    target = new URL(`https://api.adsbdb.com/v0/aircraft/${rest[1].toLowerCase()}`);
  } else if (root === "adsbdb" && rest.length === 2 && rest[0] === "route" && /^[A-Z0-9]{2,8}$/i.test(rest[1])) {
    target = new URL(`https://api.adsbdb.com/v0/callsign/${rest[1].toUpperCase()}`);
  } else if (root === "radio" && rest.length === 1 && rest[0] === "stations") {
    target = new URL("https://de1.api.radio-browser.info/json/stations/search");
    target.searchParams.set("hidebroken", "true"); target.searchParams.set("limit", "750");
    target.searchParams.set("order", "clickcount"); target.searchParams.set("reverse", "true");
  } else if (root === "gbfs" && rest.length >= 1) {
    const allowed = gbfsTarget(incoming);
    if (!allowed) return jsonError(400, "GBFS 数据源不在允许列表中。", "invalid_gbfs_source");
    target = allowed;
  } else if (root === "terrain" && rest.length === 1 && rest[0] === "heights") {
    const points = (incoming.searchParams.get("points") ?? "").split(";").filter(Boolean);
    if (!points.length || points.length > 200 || points.some((point) => { const [lon,lat,...extra]=point.split(","); return extra.length > 0 || !Number.isFinite(Number(lon)) || !Number.isFinite(Number(lat)) || Number(lon) < -180 || Number(lon) > 180 || Number(lat) < -90 || Number(lat) > 90; })) return jsonError(400, "地形坐标参数无效。", "invalid_coordinates");
    target = new URL("https://terrain.reearth.land/heights.json");
    target.searchParams.set("points", points.join(";"));
  } else if (root === "tomtom" && rest.length === 1 && rest[0] === "status") {
    return NextResponse.json({ hasKey:false, mode:"simulation", reasonCode:"provider_not_configured" }, { headers:{ "Cache-Control":"no-store" } });
  } else if (root === "firms" && rest.length === 0) {
    return proxyFirms();
  } else if (root === "celestrak" && rest.length <= 1 && (rest.length === 0 || /^[A-Za-z0-9_.-]+$/.test(rest[0]))) {
    target = new URL("https://celestrak.org/NORAD/elements/gp.php");
    if (rest[0]) target.searchParams.set("GROUP", rest[0]);
    incoming.searchParams.forEach((value, key) => target.searchParams.set(key, value));
    // God's Eye View's open-source parser consumes the classic three-line TLE
    // format. CelesTrak defaults to CSV when FORMAT is omitted, which returns
    // HTTP 200 but produces an empty catalog in the client.
    target.searchParams.set("FORMAT", "tle");
  } else if (root === "launches" && rest.length === 0) {
    target = new URL("https://ll.thespacedevs.com/2.3.0/launches/");
    target.searchParams.set("limit", incoming.searchParams.get("limit") ?? "100");
    // God's Eye View's open-source mission roster intentionally displays the
    // previous 30 days (it applies its own `net <= now` filter). Requesting
    // only future launches here made the upstream return data that the client
    // then discarded, leaving a misleading 0/30D empty state.
    const now = new Date();
    target.searchParams.set("net__gte", incoming.searchParams.get("net__gte") ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
    target.searchParams.set("net__lte", incoming.searchParams.get("net__lte") ?? now.toISOString());
  } else if (root === "geocode" && rest.length === 1 && rest[0] === "json") {
    const address = incoming.searchParams.get("address")?.trim();
    if (!address || address.length > 200) return jsonError(400, "地址参数无效。", "invalid_address");
    target = new URL("https://nominatim.openstreetmap.org/search");
    target.searchParams.set("q", address);
    target.searchParams.set("format", "jsonv2");
    target.searchParams.set("limit", "5");
  } else if (root === "route" && rest.length === 0) {
    const profile = incoming.searchParams.get("profile") ?? "driving";
    const coords = incoming.searchParams.get("coords")?.trim() ?? "";
    if (!(profile === "driving" || profile === "cycling" || profile === "walking") || !/^[-0-9.,;]+$/.test(coords) || coords.length > 500) return jsonError(400, "路线参数无效。", "invalid_route");
    target = new URL(`https://router.project-osrm.org/route/v1/${profile}/${coords}`);
    target.searchParams.set("overview", "full");
    target.searchParams.set("geometries", "geojson");
  } else if (root === "weather-effects" && rest.length === 0) {
    const latitude = validCoordinate(incoming.searchParams.get("latitude"), -90, 90);
    const longitude = validCoordinate(incoming.searchParams.get("longitude"), -180, 180);
    if (latitude === null || longitude === null) return jsonError(400, "天气坐标无效。", "invalid_coordinates");
    target = new URL("https://api.open-meteo.com/v1/forecast");
    target.searchParams.set("latitude", String(latitude));
    target.searchParams.set("longitude", String(longitude));
    target.searchParams.set("current", "weather_code,cloud_cover,precipitation,visibility,wind_speed_10m,wind_direction_10m");
    target.searchParams.set("timezone", "UTC");
  } else if (root === "regional-brief" && rest.length === 0) {
    const latitude = validCoordinate(incoming.searchParams.get("latitude"), -90, 90);
    const longitude = validCoordinate(incoming.searchParams.get("longitude"), -180, 180);
    if (latitude === null || longitude === null) return jsonError(400, "区域坐标无效。", "invalid_coordinates");
    target = new URL("https://api.open-meteo.com/v1/forecast");
    target.searchParams.set("latitude", String(latitude));
    target.searchParams.set("longitude", String(longitude));
    target.searchParams.set("current", "temperature_2m,apparent_temperature,precipitation,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,weather_code");
    target.searchParams.set("timezone", "UTC");
  } else if (root === "ais-live" || root === "realtime" || root === "google" || root === "tomtom" || root === "radio" || root === "adsbdb" || root === "cctv" || root === "terrain") {
    return jsonError(503, "该观测源需要在服务端配置后启用。", "upstream_not_configured");
  } else {
    return jsonError(404, "该观测接口未接入 qmdj。", "unknown_observation_endpoint");
  }

  try {
    const response = await fetchWithTimeout(target, { headers: { Accept: "application/json,text/plain;q=0.9", "User-Agent": "qmdj-world-pulse/1.0" } });
    if (root === "celestrak" && !response.ok) {
      const fallback = await fetchSatnogsTleFallback();
      if (fallback) {
        return new NextResponse(fallback, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "X-Satellite-Source": "satnogs-db",
            "X-Satellite-Degraded": "true",
          },
        });
      }
    }
    if (root === "opensky") {
      if (!response.ok) {
        const fallbackTarget = new URL("https://opensky-network.org/api/states/all");
        const latitude = validCoordinate(incoming.searchParams.get("lat"), -90, 90);
        const longitude = validCoordinate(incoming.searchParams.get("lon"), -180, 180);
        const delta = 1.25;
        fallbackTarget.searchParams.set("lamin", String(Math.max(-90, (latitude ?? 0) - delta)));
        fallbackTarget.searchParams.set("lamax", String(Math.min(90, (latitude ?? 0) + delta)));
        fallbackTarget.searchParams.set("lomin", String(Math.max(-180, (longitude ?? 0) - delta)));
        fallbackTarget.searchParams.set("lomax", String(Math.min(180, (longitude ?? 0) + delta)));
        try {
          const fallbackResponse = await fetchWithTimeout(fallbackTarget, { headers: { Accept: "application/json", "User-Agent": "qmdj-world-pulse/1.0" } });
          if (fallbackResponse.ok) {
            const fallbackPayload = await readJsonCapped(fallbackResponse) as { states?: unknown; time?: unknown };
            if (Array.isArray(fallbackPayload.states)) {
              const payload = { time: fallbackPayload.time, states: fallbackPayload.states };
              lastFlightSnapshot = payload;
              lastFlightSnapshotAt = Date.now();
              return NextResponse.json(payload, { headers: {
                "Cache-Control":"public, max-age=10", "X-Flight-Source":"OpenSky Network",
                "X-Flight-Coverage":"2.5° regional observed snapshot", "X-Flight-Degraded":"true",
                "X-OpenSky-Auth-Mode-Used":"anonymous-regional", "X-OpenSky-Auth-Reason":"adsblol-rate-limit-fallback",
              } });
            }
          }
        } catch { /* return the explicit unavailable state below */ }
        // A data refresh must not erase a previously verified real snapshot
        // merely because both public providers are momentarily throttled.
        // The stale timestamp is explicit for the UI and downstream consumers.
        if (lastFlightSnapshot) {
          return NextResponse.json(lastFlightSnapshot, { headers: {
            "Cache-Control":"public, max-age=10", "X-Flight-Source":"adsb.lol / OpenSky cached snapshot",
            "X-Flight-Coverage":`${ADSBLOL_RADIUS_NM}nm regional observed snapshot`, "X-Flight-Degraded":"true",
            "X-Flight-Stale-At":new Date(lastFlightSnapshotAt).toISOString(),
            "X-OpenSky-Auth-Mode-Used":"last-known-observed-snapshot", "X-OpenSky-Auth-Reason":"upstream-temporary-unavailable",
          } });
        }
        return jsonError(503, "区域航班观测源暂时不可用。", "upstream_unavailable");
      }
      const payload = normalizeAdsbLolPointResponse(await readJsonCapped(response));
      lastFlightSnapshot = payload;
      lastFlightSnapshotAt = Date.now();
      return NextResponse.json(payload, { headers: {
        "Cache-Control":"public, max-age=10",
        "X-Flight-Source":"adsb.lol",
        "X-Flight-Coverage":`${ADSBLOL_RADIUS_NM}nm regional observed snapshot`,
        "X-OpenSky-Auth-Mode-Used":"adsblol-regional",
        "X-OpenSky-Auth-Reason":"commercial-safe-regional-source",
      } });
    }
    if (root === "adsblol" && rest[0] === "mil") {
      if (response.ok) {
        const payload = await readJsonCapped(response);
        lastMilitarySnapshot = payload;
        lastMilitarySnapshotAt = Date.now();
        return NextResponse.json(payload, { headers: { "Cache-Control":"public, max-age=10", "X-Flight-Source":"adsb.lol" } });
      }
      if (lastMilitarySnapshot) {
        return NextResponse.json(lastMilitarySnapshot, { headers: {
          "Cache-Control":"public, max-age=10", "X-Flight-Source":"adsb.lol", "X-Flight-Degraded":"true",
          "X-Flight-Stale-At": new Date(lastMilitarySnapshotAt).toISOString(),
        } });
      }
      return jsonError(503, "军事航班观测源暂时不可用。", "upstream_unavailable");
    }
    if (root === "adsbdb") {
      if (!response.ok) return NextResponse.json({ found:false }, { headers:{ "Cache-Control":"public, max-age=86400" } });
      const source = await readJsonCapped(response);
      if (rest[0] === "type") {
        const aircraft = (source.response as Record<string, unknown> | undefined)?.aircraft as Record<string, unknown> | undefined;
        return NextResponse.json(aircraft ? { found:true, typeCode:aircraft.icao_type ?? null, typeName:aircraft.manufacturer && aircraft.type ? `${aircraft.manufacturer} ${aircraft.type}` : aircraft.type ?? null, registration:aircraft.registration ?? null } : { found:false }, { headers:{ "Cache-Control":"public, max-age=86400" } });
      }
      const route = (source.response as Record<string, unknown> | undefined)?.flightroute as Record<string, unknown> | undefined;
      const airport = (value: unknown) => { const item = value as Record<string, unknown> | undefined; return item ? { code:item.iata_code || item.icao_code || "", name:item.municipality || item.name || "", lat:Number.isFinite(item.latitude) ? item.latitude : null, lon:Number.isFinite(item.longitude) ? item.longitude : null } : null; };
      return NextResponse.json(route?.origin && route?.destination ? { found:true, airline:(route.airline as Record<string, unknown> | undefined)?.name ?? null, origin:airport(route.origin), destination:airport(route.destination) } : { found:false }, { headers:{ "Cache-Control":"public, max-age=86400" } });
    }
    if (root === "radio") {
      if (!response.ok) return jsonError(503, "Radio 目录暂时不可用。", "upstream_unavailable");
      const raw = await readJsonCapped(response);
      const rows = Array.isArray(raw) ? raw : [];
      const stations = rows.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value))).map(normalizeRadioBrowserStation).filter((value) => value !== null);
      servedRadioIds.clear(); stations.forEach((station) => servedRadioIds.add(station.id));
      const updatedAt = new Date().toISOString();
      return NextResponse.json({ stations, updatedAt, stale:false, degraded:stations.length < 100, degradedReason:stations.length < 100 ? "low_station_coverage" : null, coverage:{ stationCount:stations.length }, acceptedGeneration:Math.max(1,Math.floor(Date.now()/2_700_000)), catalogInstance:"qmdj-radio-browser-v1" }, { headers:{ "Cache-Control":"public, max-age=900" } });
    }
    if (root === "weather-effects" && response.ok) {
      const payload = await response.json() as { current?: Record<string, unknown> };
      const current = payload.current ?? {};
      return NextResponse.json({ status: "ready", retrievedAt: new Date().toISOString(), coordinates: { latitude: target.searchParams.get("latitude"), longitude: target.searchParams.get("longitude") }, weather: { weatherCode: current.weather_code, cloudCover: current.cloud_cover, precipitation: current.precipitation, visibility: current.visibility, windSpeed: current.wind_speed_10m, windDirectionDeg: current.wind_direction_10m } }, { status: 200, headers: { "Cache-Control": "public, max-age=60" } });
    }
    if (root === "regional-brief" && response.ok) {
      const payload = await response.json() as { current?: Record<string, unknown> };
      const current = payload.current ?? {};
      return NextResponse.json({ status: "partial", retrievedAt: new Date().toISOString(), place: null, weather: { observedAt: current.time ?? null, temperatureC: current.temperature_2m ?? null, apparentTemperatureC: current.apparent_temperature ?? null, precipitationMm: current.precipitation ?? null, cloudCoverPct: current.cloud_cover ?? null, windKph: current.wind_speed_10m ?? null, windDirectionDeg: current.wind_direction_10m ?? null, visibilityM: current.visibility ?? null, weatherCode: current.weather_code ?? null }, articles: [], sources: { headlines: "unavailable", weather: "open-meteo" } }, { status: 200, headers: { "Cache-Control": "public, max-age=60" } });
    }
    return relay(response);
  } catch {
    return jsonError(503, "观测源暂时不可用。", "upstream_unavailable");
  }
}

async function proxyOverpass(request: Request) {
  const rawBody = await request.text();
  // The untouched upstream frontend posts standard form encoding
  // (`data=<overpass query>`).  Accept that contract as well as a raw query.
  const body = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")
    ? new URLSearchParams(rawBody).get("data") ?? ""
    : rawBody;
  if (!body || body.length > 256_000 || !/\bout\s+(?:json|geom)\b/i.test(body) || !/\b(?:around|bbox|poly|area|geocodeArea)\b/i.test(body)) return jsonError(400, "Overpass 查询必须是有空间边界的请求。", "invalid_overpass_query");
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(endpoint, { method: "POST", headers: { "Content-Type": "text/plain", Accept: "application/json", "User-Agent": "qmdj-world-pulse/1.0" }, body });
      if (response.ok || response.status === 400) return relay(response);
    } catch { /* try the next mirror */ }
  }
  return jsonError(503, "地图上下文观测源暂时不可用。", "overpass_unavailable");
}

export async function GET(request: Request, context: Context) {
  const { path } = await context.params;
  return proxyGet(path ?? [], request);
}

export async function POST(request: Request, context: Context) {
  const { path } = await context.params;
  if (path?.length === 1 && path[0] === "overpass") return proxyOverpass(request);
  if (path?.length === 3 && path[0] === "radio" && path[1] === "click") {
    const id = path[2].toLowerCase();
    if (!radioStationIdValid(id) || !servedRadioIds.has(id)) return jsonError(404, "Radio 站点不存在。", "radio_station_not_found");
    void fetchWithTimeout(`https://de1.api.radio-browser.info/json/url/${id}`, { method:"GET", headers:{ "User-Agent":"qmdj-world-pulse/1.0" } }).catch(() => undefined);
    return new NextResponse(null, { status:204, headers:{ "Cache-Control":"no-store" } });
  }
  return jsonError(405, "该观测接口不支持此方法。", "method_not_allowed");
}
