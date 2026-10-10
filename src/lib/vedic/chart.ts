import { calculateChart } from "celestine";
import { offsetMinutes } from "@/lib/astro/chart";
import type { NormalizedProfileInput } from "@/lib/profile";
import { ayanamsa, jdToJDE, nodeLongitude, NODE_MODE_LABELS, type NodeMode } from "./ayanamsa";
import { GRAHAS, GRAHA_ZH, NAKSHATRAS, NAKSHATRA_LORDS, RASHIS, VARGA_CODES, VARGA_DEFINITIONS, type Rashi } from "./data";
import { vargaSign } from "./varga";

const NAKSHATRA_SPAN = 360 / 27;
const PADA_SPAN = NAKSHATRA_SPAN / 4;
const norm360 = (value: number) => ((value % 360) + 360) % 360;

export const julianDayForProfile = (datetime: string, timeZone: string) => {
  const [date, time] = datetime.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes(datetime, timeZone) * 60000;
  return 2440587.5 + utcMillis / 86400000;
};

export type NakshatraPlacement = { index: number; name: string; pada: number; lord: string; lordZh: string };

export const nakshatraOf = (longitude: number): NakshatraPlacement => {
  const lon = norm360(longitude);
  const index0 = Math.floor(lon / NAKSHATRA_SPAN);
  const within = lon - index0 * NAKSHATRA_SPAN;
  const lord = NAKSHATRA_LORDS[index0 % 9];
  return { index: index0 + 1, name: NAKSHATRAS[index0], pada: Math.floor(within / PADA_SPAN) + 1, lord, lordZh: GRAHA_ZH[lord] ?? lord };
};

export const rashiOf = (longitude: number) => {
  const lon = norm360(longitude);
  const index0 = Math.floor(lon / 30);
  return { rasi: index0 + 1, rashi: RASHIS[index0], degreeInRashi: lon - index0 * 30 };
};

export type VedicGraha = {
  id: string;
  zh: string;
  iast: string;
  abbr: string;
  /** 恒星黄经（Lahiri）。 */
  longitude: number;
  rasi: number;
  rashi: Rashi;
  degreeInRashi: number;
  nakshatra: NakshatraPlacement;
  retrograde: boolean;
  /** 各分盘宫序（1 基）。 */
  vargas: Record<string, number>;
};

export type VedicLagna = Omit<VedicGraha, "id" | "zh" | "iast" | "abbr" | "retrograde" | "vargas"> & { vargas: Record<string, number> };

export type VedicVarga = { code: string; divisions: number; iast: string; zh: string; lagnaRashi: number | null; positions: Record<string, number> };

/** 罗睺 / 计都在某种交点口径下的完整落位。 */
export type VedicNodeVariant = { mode: NodeMode; label: string; rahu: VedicGraha; ketu: VedicGraha };

export type VedicChart = {
  format: "qmdj-vedic-v1";
  input: { datetime: string; timeZone: string; julianDay: number; hasPlace: boolean };
  ayanamsa: number;
  /** 本盘 grahas 中罗睺 / 计都实际采用的口径（默认平交点）。 */
  nodeMode: NodeMode;
  /** 平 / 真两种口径下罗睺与计都的完整落位，供界面切换显示。 */
  nodes: Record<NodeMode, VedicNodeVariant>;
  lagna: VedicLagna | null;
  grahas: VedicGraha[];
  vargas: VedicVarga[];
  vargottama: string[];
  disclaimer: string;
};

const vargaSignsFor = (rashi: number, degreeInRashi: number) =>
  Object.fromEntries(VARGA_CODES.map((code) => [code, vargaSign(rashi, degreeInRashi, code)]));

export const buildVedicChart = (profile: NormalizedProfileInput, options: { nodeMode?: NodeMode } = {}): VedicChart => {
  const datetime = profile.normalized.datetime;
  const timeZone = profile.normalized.timeZone;
  const latitude = profile.original.location?.latitude ?? null;
  const longitude = profile.original.location?.longitude ?? null;
  const hasPlace = latitude !== null && longitude !== null;
  const nodeMode: NodeMode = options.nodeMode === "true" ? "true" : "mean";

  const jd = julianDayForProfile(datetime, timeZone);
  const ayan = ayanamsa(jd);
  const jde = jdToJDE(jd);

  const chart = calculateChart({
    year: Number(datetime.slice(0, 4)),
    month: Number(datetime.slice(5, 7)),
    day: Number(datetime.slice(8, 10)),
    hour: Number(datetime.slice(11, 13)),
    minute: Number(datetime.slice(14, 16)),
    second: 0,
    timezone: offsetMinutes(datetime, timeZone) / 60,
    latitude: latitude ?? 0,
    longitude: longitude ?? 0,
  });

  const toGraha = (meta: (typeof GRAHAS)[number], tropicalLongitude: number, retrograde: boolean): VedicGraha => {
    const sidereal = norm360(tropicalLongitude - ayan);
    const { rasi, rashi, degreeInRashi } = rashiOf(sidereal);
    return { id: meta.id, zh: meta.zh, iast: meta.iast, abbr: meta.abbr, longitude: sidereal, rasi, rashi, degreeInRashi, nakshatra: nakshatraOf(sidereal), retrograde, vargas: vargaSignsFor(rasi, degreeInRashi) };
  };

  const tropical = new Map(chart.planets.map((planet) => [planet.name, planet]));
  const rahuMeta = GRAHAS.find((graha) => graha.id === "Rahu")!;
  const ketuMeta = GRAHAS.find((graha) => graha.id === "Ketu")!;
  // 罗睺 / 计都：上游 celestine 亦以「交点恒逆行」处理（`dist/index.js:2241-2242`）。
  const nodes = Object.fromEntries(
    (["mean", "true"] as const).map((mode) => {
      const north = nodeLongitude(jde, mode);
      return [
        mode,
        {
          mode,
          label: NODE_MODE_LABELS[mode],
          rahu: toGraha(rahuMeta, north, true),
          ketu: toGraha(ketuMeta, norm360(north + 180), true),
        },
      ];
    }),
  ) as Record<NodeMode, VedicNodeVariant>;

  const grahas: VedicGraha[] = GRAHAS.map((graha) => {
    if (graha.id === "Rahu") return nodes[nodeMode].rahu;
    if (graha.id === "Ketu") return nodes[nodeMode].ketu;
    const planet = tropical.get(graha.id);
    return toGraha(graha, planet?.longitude ?? 0, planet?.isRetrograde ?? false);
  });

  const lagna: VedicLagna | null = hasPlace
    ? (() => {
        const sidereal = norm360(chart.angles.ascendant.longitude - ayan);
        const { rasi, rashi, degreeInRashi } = rashiOf(sidereal);
        return { longitude: sidereal, rasi, rashi, degreeInRashi, nakshatra: nakshatraOf(sidereal), vargas: vargaSignsFor(rasi, degreeInRashi) };
      })()
    : null;

  const vargas: VedicVarga[] = VARGA_DEFINITIONS.map((definition) => ({
    code: definition.code,
    divisions: definition.divisions,
    iast: definition.iast,
    zh: definition.zh,
    lagnaRashi: lagna ? lagna.vargas[definition.code] : null,
    positions: Object.fromEntries(grahas.map((graha) => [graha.id, graha.vargas[definition.code]])),
  }));

  const nodeNote = `罗睺/计都取${NODE_MODE_LABELS[nodeMode]}（可切换，平交点为默认）`;
  return {
    format: "qmdj-vedic-v1",
    input: { datetime, timeZone, julianDay: Number(jd.toFixed(6)), hasPlace },
    ayanamsa: Number(ayan.toFixed(6)),
    nodeMode,
    nodes,
    lagna,
    grahas,
    vargas,
    vargottama: grahas.filter((graha) => graha.vargas.D1 === graha.vargas.D9).map((graha) => graha.id),
    disclaimer: hasPlace
      ? `吠陀占星研究盘：采用 Lahiri（Chitrapaksha）岁差，行星为 Celestine 回归黄经减去岁差所得恒星黄经；${nodeNote}（真交点公式直接复用 celestine 的 getTrueNodeLongitude）。分盘规则按 Parashara 体系的十六分盘（Shodashavarga）。结果仅供研究，不构成预测或现实裁决。`
      : `吠陀占星研究盘：采用 Lahiri 岁差，行星为恒星黄经、${nodeNote}（真交点公式直接复用 celestine 的 getTrueNodeLongitude）。当前无出生地，未计算上升（Lagna），故分盘只列行星、不含命宫。结果仅供研究，不构成预测或现实裁决。`,
  };
};
