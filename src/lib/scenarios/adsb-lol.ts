const KNOT_TO_MPS = 0.514444;
const FOOT_TO_M = 0.3048;
const FPM_TO_MPS = 0.00508;

const finite = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const category = (value: unknown) => ({
  A1:2, A2:3, A3:4, A4:5, A5:6, A6:7, A7:8,
  B1:9, B2:10, B3:11, B4:12, B6:14, B7:15,
}[String(value ?? "").trim().toUpperCase()] ?? 0);

export function normalizeAdsbLolAircraftState(aircraft: Record<string, unknown>, nowSeconds: number) {
  const hex = String(aircraft.hex ?? "").trim().toLowerCase();
  const latitude = finite(aircraft.lat);
  const longitude = finite(aircraft.lon);
  if (!/^[0-9a-f~]{6,7}$/.test(hex) || latitude === null || longitude === null) return null;
  const seenPosition = Math.max(0, finite(aircraft.seen_pos) ?? finite(aircraft.seen) ?? 0);
  const seen = Math.max(0, finite(aircraft.seen) ?? seenPosition);
  const onGround = aircraft.alt_baro === "ground";
  const barometricFeet = onGround ? null : finite(aircraft.alt_baro);
  const geometricFeet = finite(aircraft.alt_geom);
  const speedKnots = finite(aircraft.gs);
  const verticalRateFpm = finite(aircraft.baro_rate) ?? finite(aircraft.geom_rate);
  return [
    hex,
    String(aircraft.flight ?? aircraft.r ?? "").trim() || null,
    null,
    Math.max(0, nowSeconds - seenPosition),
    Math.max(0, nowSeconds - seen),
    longitude,
    latitude,
    barometricFeet === null ? null : barometricFeet * FOOT_TO_M,
    onGround,
    speedKnots === null ? null : speedKnots * KNOT_TO_MPS,
    finite(aircraft.track),
    verticalRateFpm === null ? null : verticalRateFpm * FPM_TO_MPS,
    null,
    geometricFeet === null ? null : geometricFeet * FOOT_TO_M,
    aircraft.squawk || null,
    aircraft.spi === 1,
    0,
    category(aircraft.category),
  ];
}

export function normalizeAdsbLolPointResponse(payload: Record<string, unknown>) {
  const responseNow = finite(payload.now);
  const nowSeconds = responseNow === null
    ? Math.floor(Date.now() / 1000)
    : Math.floor(responseNow > 10_000_000_000 ? responseNow / 1000 : responseNow);
  const aircraft = Array.isArray(payload.ac) ? payload.ac : [];
  return {
    time: nowSeconds,
    states: aircraft
      .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value)))
      .map((value) => normalizeAdsbLolAircraftState(value, nowSeconds))
      .filter((value) => value !== null),
  };
}
