const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clean = (value: unknown, max: number) => String(value ?? "")
  .replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max).trim();

function privateIpv4(host: string) {
  const values = host.split(".").map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [a,b,c] = values;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 0)
    || (a === 192 && b === 88 && c === 99) || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113);
}

export function publicHttpsUrl(value: unknown) {
  try {
    const url = new URL(String(value ?? ""));
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
    if (url.protocol !== "https:" || url.username || url.password || !host || host === "localhost"
      || host.endsWith(".localhost") || host.endsWith(".local") || host.includes(":") || privateIpv4(host)) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}

export function normalizeRadioBrowserStation(raw: Record<string, unknown>) {
  const id = clean(raw.stationuuid, 40).toLowerCase();
  const lat = raw.geo_lat === null || raw.geo_lat === "" ? null : Number(raw.geo_lat);
  const lon = raw.geo_long === null || raw.geo_long === "" ? null : Number(raw.geo_long);
  const codec = clean(raw.codec, 16).toUpperCase();
  const streamUrl = publicHttpsUrl(raw.url_resolved || raw.url);
  const name = clean(raw.name, 140);
  if (!UUID.test(id) || Number(raw.lastcheckok) !== 1 || Number(raw.hls) === 1 || !name || !streamUrl
    || !Number.isFinite(lat) || lat! < -90 || lat! > 90 || !Number.isFinite(lon) || lon! < -180 || lon! > 180
    || !/^(?:MP3|AAC(?:\+|-LC|-HE)?|HE-AAC)$/i.test(codec)) return null;
  const bitrate = Number(raw.bitrate);
  return {
    id, name, lat, lon, streamUrl, homepage:publicHttpsUrl(raw.homepage),
    tags:String(raw.tags ?? "").split(",").map((value) => clean(value, 80).toLowerCase()).filter(Boolean).slice(0,24),
    languages:String(raw.language ?? "").split(",").map((value) => clean(value, 40)).filter(Boolean).slice(0,8),
    state:clean(raw.state,80), country:clean(raw.country,80), countryCode:clean(raw.countrycode,2).toUpperCase(),
    metadataTrust:"untrusted-community", codec,
    bitrate:Number.isInteger(bitrate) && bitrate >= 8 && bitrate <= 1024 ? bitrate : null,
  };
}

export const radioStationIdValid = (value: string) => UUID.test(value);
