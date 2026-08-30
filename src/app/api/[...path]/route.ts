import { NextResponse } from "next/server";
import { normalizeAdsbLolPointResponse } from "@/lib/scenarios/adsb-lol";

type Context = { params: Promise<{ path: string[] }> };

const UPSTREAM_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;
const ADSBLOL_RADIUS_NM = 250;

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
  } else if (root === "opensky-track" && rest.length === 0) {
    // The upstream snapshot API does not provide historical traces. Keep the
    // same-origin contract explicit so the GEV panel can show an unavailable
    // track instead of receiving a misleading synthetic line.
    return jsonError(503, "OpenSky 航迹需要已配置的历史轨迹源。", "track_source_unavailable");
  } else if (root === "adsblol" && rest.length === 1 && rest[0] === "mil") {
    target = new URL("https://api.adsb.lol/v2/mil");
  } else if (root === "adsblol" && rest.length === 1 && rest[0] === "trace") {
    const hex = incoming.searchParams.get("hex")?.trim().toLowerCase() ?? "";
    if (!/^[0-9a-f~]{6,7}$/.test(hex)) return jsonError(400, "航空器标识无效。", "invalid_aircraft_id");
    target = new URL(`https://adsb.lol/data/traces/${hex.slice(-2)}/trace_full_${hex}.json`);
  } else if (root === "celestrak" && rest.length <= 1 && (rest.length === 0 || /^[A-Za-z0-9_.-]+$/.test(rest[0]))) {
    target = new URL("https://celestrak.org/NORAD/elements/gp.php");
    if (rest[0]) target.searchParams.set("GROUP", rest[0]);
    incoming.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  } else if (root === "launches" && rest.length === 0) {
    target = new URL("https://ll.thespacedevs.com/2.3.0/launches/");
    target.searchParams.set("limit", incoming.searchParams.get("limit") ?? "100");
    target.searchParams.set("net__gte", incoming.searchParams.get("net__gte") ?? new Date().toISOString());
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
  } else if (root === "firms" || root === "ais-live" || root === "realtime" || root === "military-installations" || root === "google" || root === "gbfs" || root === "tomtom" || root === "radio" || root === "adsbdb" || root === "cctv" || root === "terrain") {
    return jsonError(503, "该观测源需要在服务端配置后启用。", "upstream_not_configured");
  } else {
    return jsonError(404, "该观测接口未接入 qmdj。", "unknown_observation_endpoint");
  }

  try {
    const response = await fetchWithTimeout(target, { headers: { Accept: "application/json,text/plain;q=0.9", "User-Agent": "qmdj-world-pulse/1.0" } });
    if (root === "opensky") {
      if (!response.ok) return jsonError(503, "区域航班观测源暂时不可用。", "upstream_unavailable");
      const payload = normalizeAdsbLolPointResponse(await readJsonCapped(response));
      return NextResponse.json(payload, { headers: {
        "Cache-Control":"public, max-age=10",
        "X-Flight-Source":"adsb.lol",
        "X-Flight-Coverage":`${ADSBLOL_RADIUS_NM}nm regional observed snapshot`,
        "X-OpenSky-Auth-Mode-Used":"adsblol-regional",
        "X-OpenSky-Auth-Reason":"commercial-safe-regional-source",
      } });
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
  const body = await request.text();
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
  return jsonError(405, "该观测接口不支持此方法。", "method_not_allowed");
}
