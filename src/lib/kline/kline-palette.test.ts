import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KLINE_PALETTE, KLINE_PALETTE_LOCAL } from "./kline-palette";

/**
 * Recharts paints into `stroke`/`fill` attributes, so `kline-palette.ts` has to
 * repeat colours that already exist in `paipan.css`. A repeated literal is a
 * copy that can silently go stale: change the token, and the chart keeps
 * rendering the old colour with nothing failing.
 *
 * This test closes that loop by reading the stylesheet and checking every entry
 * against the declaration it claims to mirror. It is the same shape of guard as
 * `src/app/api/cache-policy.test.ts` — a structural rule that the compiler
 * cannot express.
 *
 * Measured, not assumed: flipping `--paipan-red` to a different hex turns
 * exactly one assertion red (`rise`). Renaming it trips the `no longer
 * declares` branch instead. Both directions are covered.
 */

const tokensCssPath = fileURLToPath(new URL("../../app/paipan/paipan.css", import.meta.url));
const chartCssPath = fileURLToPath(new URL("../../app/paipan/research.css", import.meta.url));
const tokensCss = readFileSync(tokensCssPath, "utf8");
const chartCss = readFileSync(chartCssPath, "utf8");

/** `--paipan-ink: #121214;` → `#121214` */
const customProperty = (name: string) => {
  const match = tokensCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!match) throw new Error(`paipan.css no longer declares --${name}`);
  return match[1].toLowerCase();
};

/** The `fill`/`color`/`stroke` a named selector sets, e.g. `fill` of `.kline-chart__candle.is-down .kline-chart__body`. */
const declarationIn = (selector: string, property: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = chartCss.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!rule) throw new Error(`paipan.css no longer has a rule for ${selector}`);
  const match = rule[1].match(new RegExp(`${property}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!match) throw new Error(`${selector} no longer sets ${property}`);
  return match[1].toLowerCase();
};

/** Palette keys backed by a `--paipan-*` custom property, and which one. */
const MIRRORED_TOKENS = {
  ink: "paipan-ink",
  paper: "paipan-paper",
  ground: "paipan-ground",
  rise: "paipan-red",
  accent: "paipan-yellow",
  violet: "paipan-violet",
  slate: "paipan-slate",
  slateLight: "paipan-slate-light",
} as const;

/** Palette keys backed by a plain rule in `research.css`, as `[selector, property]`. */
const MIRRORED_RULES = {
  fall: [".kline-chart__candle.is-down .kline-chart__body", "fill"],
  muted: [".kline-hud__reason", "color"],
} as const;

describe("kline palette mirrors its theme and shared tokens", () => {
  const tokenBacked: Array<[keyof typeof KLINE_PALETTE, string]> = [
    ...Object.entries(MIRRORED_TOKENS).map(
      ([key, token]) => [key as keyof typeof KLINE_PALETTE, customProperty(token)] as [keyof typeof KLINE_PALETTE, string],
    ),
    ...Object.entries(MIRRORED_RULES).map(
      ([key, [selector, property]]) =>
        [key as keyof typeof KLINE_PALETTE, declarationIn(selector, property)] as [keyof typeof KLINE_PALETTE, string],
    ),
  ];

  it.each(tokenBacked)("%s matches its stylesheet declaration", (key, expected) => {
    expect(KLINE_PALETTE[key].toLowerCase()).toBe(expected);
  });

  it("accounts for every entry: either token-backed or declared chart-local", () => {
    const accounted = new Set<string>([...tokenBacked.map(([key]) => key), ...Object.keys(KLINE_PALETTE_LOCAL)]);
    expect([...Object.keys(KLINE_PALETTE)].filter((key) => !accounted.has(key))).toEqual([]);
  });

  it("keeps the chart-local list free of entries that do have a token", () => {
    // A stale exemption is worse than none: it would let a future colour skip
    // the check while looking deliberate.
    expect(Object.keys(KLINE_PALETTE_LOCAL).filter((key) => key in KLINE_PALETTE)).toEqual(["grid"]);
  });

  it("pins every mirrored token to exactly one declaration", () => {
    // `customProperty` takes the *first* match in the file. The moment a token
    // is declared twice — a media-query override, a scoped theme, a print
    // block — the guard keeps checking whichever one comes first while the
    // chart renders under the other. That is a silent wrong answer, so the
    // single-declaration assumption is asserted rather than assumed.
    //
    // There are no duplicates today; this keeps it that way.
    const repeated = Object.values(MIRRORED_TOKENS).filter(
      (token) => (tokensCss.match(new RegExp(`--${token}\\s*:`, "g"))?.length ?? 0) !== 1,
    );
    expect(repeated).toEqual([]);
  });

  it("fails loudly when the stylesheet moves, rather than silently checking nothing", () => {
    expect(chartCss.length).toBeGreaterThan(1000);
    expect(() => customProperty("paipan-does-not-exist")).toThrow(/no longer declares/);
  });
});
