import { RUNES, SPREADS, type Rune, type Spread, type SpreadId } from "./data";

export type RuneOrientation = "upright" | "reversed";
export type DrawnRune = { rune: Rune; orientation: RuneOrientation };

export type RuneReading = {
  format: "qmdj-runes-v1";
  spreadId: SpreadId;
  spread: Spread;
  draws: DrawnRune[];
};

const hash = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => () => {
  let a = (seed += 0x6d2b79f5);
  a = Math.imul(a ^ (a >>> 15), 1 | a);
  a = (a + Math.imul(a ^ (a >>> 7), 61 | a)) ^ a;
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
};

/**
 * 由种子确定性地抽取符文（同一 seed + 牌阵恒得同一结果）。
 * 上下同形的九个符文只会正位；其余以 50% 概率取逆位。
 */
export const buildRuneReading = (seed: string, spreadId: SpreadId): RuneReading => {
  const spread = SPREADS[spreadId];
  const random = mulberry32(hash(seed || "runes"));
  const pool = [...RUNES];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const draws: DrawnRune[] = pool.slice(0, spread.positions.length).map((rune) => ({
    rune,
    orientation: rune.reversed && random() < 0.5 ? "reversed" : "upright",
  }));
  return { format: "qmdj-runes-v1", spreadId, spread, draws };
};
