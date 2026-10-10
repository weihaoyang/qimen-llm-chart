import { formatDial } from "./dial";
import type { UranianChart } from "./chart";

const fmt = (value: number, digits = 4) => Number(value.toFixed(digits));

export const serializeUranianToStructuredText = (chart: UranianChart) => [
  "汉堡学派（Uranian / 天王星系统）研究盘",
  `时刻：${chart.input.datetime}（${chart.input.timeZone}）· 儒略日 ${chart.input.julianDay} · 出生地：${chart.input.hasPlace ? "有" : "无（无上升/中天）"}`,
  `盘面：${chart.settings.modulus}° 盘 · 容许度 ${chart.settings.orb}°`,
  "",
  "天体（地心黄经 → 盘面位置）：",
  ...chart.bodies.map((body) => `- ${body.name}${body.glyph} 黄经 ${fmt(body.longitude, 3)}° → ${formatDial(((body.longitude % chart.settings.modulus) + chart.settings.modulus) % chart.settings.modulus)}`),
  "",
  `八虚星（Cupido…Poseidon，Neely/Matrix 要素 + Astrolog 口径 aber 更正，共 ${chart.tnps.length} 颗）：`,
  ...chart.tnps.map((row) => `- ${row.nameZh}${row.name} ${row.code}：黄经 ${fmt(row.longitude, 3)}°（${row.zodiac.label}）→ ${row.dialLabel}；日心 ${fmt(row.heliocentric, 3)}°；aber 更正 ${fmt(row.aberration, 4)}°（几何 ${fmt(row.geometricLongitude, 3)}°）；原则 ${row.principles.join("、")}`),
  "",
  `被占据的中点（A/B = C，命中 ${chart.totals.midpoints} 条，仅列前 ${chart.limits.structures} 条，按容许度排序）：`,
  ...chart.midpoints.map((entry) => `- ${entry.a.name}/${entry.b.name} = ${entry.occupied.map((hit) => `${hit.body.name}（±${fmt(hit.orb, 2)}°）`).join("、")}；中点 ${formatDial(entry.axis)}`),
  "",
  `和点（A+B = C，命中 ${chart.totals.sums} 条，仅列前 ${chart.limits.structures} 条）：`,
  ...chart.sums.map((entry) => `- ${entry.a.name}+${entry.b.name} = ${entry.occupied.map((hit) => `${hit.body.name}（±${fmt(hit.orb, 2)}°）`).join("、")}；和点 ${formatDial(entry.axis)}`),
  "",
  `差点（A−B = C，命中 ${chart.totals.differences} 条，仅列前 ${chart.limits.structures} 条）：`,
  ...chart.differences.map((entry) => `- ${entry.a.name}−${entry.b.name} = ${entry.occupied.map((hit) => `${hit.body.name}（±${fmt(hit.orb, 2)}°）`).join("、")}；差点 ${formatDial(entry.axis)}`),
  "",
  `和点等式（A+B = C+D，命中 ${chart.totals.equations} 条，仅列前 ${chart.limits.equations} 条）：`,
  ...chart.equations.map((entry) => `- ${entry.left[0].name}+${entry.left[1].name} = ${entry.right[0].name}+${entry.right[1].name}（±${fmt(entry.orb, 2)}°）`),
  "",
  `边界：${chart.disclaimer}`,
].join("\n");

export const serializeUranianToCompactJson = (chart: UranianChart) =>
  JSON.stringify({
    format: "qmdj-uranian-v1",
    input: chart.input,
    settings: chart.settings,
    /** 结构检索命中总数与展示上限（列表仅列前 limits.structures 条）。 */
    totals: chart.totals,
    limits: chart.limits,
    bodies: chart.bodies.map((body) => [body.id, body.name, body.glyph, fmt(body.longitude, 4), fmt(((body.longitude % chart.settings.modulus) + chart.settings.modulus) % chart.settings.modulus, 4)]),
    tnps: chart.tnps.map((row) => [row.code, row.nameZh, row.name, fmt(row.longitude, 4), fmt(row.dial, 4), fmt(row.heliocentric, 4), fmt(row.distance, 6), fmt(row.aberration, 5)]),
    midpoints: chart.midpoints.map((entry) => [entry.a.name, entry.b.name, fmt(entry.axis, 4), entry.occupied.map((hit) => [hit.body.name, fmt(hit.orb, 3)])]),
    sums: chart.sums.map((entry) => [entry.a.name, entry.b.name, fmt(entry.axis, 4), entry.occupied.map((hit) => [hit.body.name, fmt(hit.orb, 3)])]),
    differences: chart.differences.map((entry) => [entry.a.name, entry.b.name, fmt(entry.axis, 4), entry.occupied.map((hit) => [hit.body.name, fmt(hit.orb, 3)])]),
    equations: chart.equations.map((entry) => [entry.left[0].name, entry.left[1].name, entry.right[0].name, entry.right[1].name, fmt(entry.orb, 3)]),
    boundary: `八虚星为汉堡学派名义天体（非真实行星）；地心黄经按 Astrolog matrix.cpp:640 的同口径 aber 项更正（非真实天体的光行差沿用参考实现口径）。中点/和点/差点仅列前 ${chart.limits.structures} 条、和点等式仅列前 ${chart.limits.equations} 条（均为按容许度排序后的截断）。盘面与图景为研究设定，不构成预测或现实裁决。`,
  });
