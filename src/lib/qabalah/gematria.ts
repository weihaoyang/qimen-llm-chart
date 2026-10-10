/**
 * 希伯来字母数术（gematria）十三法。
 *
 * 移植自 MIT 许可的 `mispar`（(c) Moshe Malka）：
 *   https://github.com/moshejs/mispar
 * 采用部分：字母数值表、终形（final form）处理、十三种经典算法
 * （hechrachi / gadol / katan / siduri / katan-mispari / perati / meshulash /
 * kidmi / boneeh / haakhor / milui / atbash / albam）与「组合字（milui）」拼写表。
 * 名称与算法本身为犹太数术的古典方法，属公共领域；实现按上述 MIT 来源转写。
 */

export const ALPHABET = "אבגדהוזחטיכלמנסעפצקרשת".split("");

export const STANDARD: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10,
  כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90, ק: 100, ר: 200, ש: 300, ת: 400,
};

export const FINAL_TO_BASE: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
export const GADOL_FINALS: Record<string, number> = { ך: 500, ם: 600, ן: 700, ף: 800, ץ: 900 };
export const MILUI_SPELLINGS: Record<string, string> = {
  א: "אלף", ב: "בית", ג: "גימל", ד: "דלת", ה: "הא", ו: "ואו", ז: "זין", ח: "חית", ט: "טית",
  י: "יוד", כ: "כף", ל: "למד", מ: "מם", נ: "נון", ס: "סמך", ע: "עין", פ: "פה", צ: "צדי",
  ק: "קוף", ר: "ריש", ש: "שין", ת: "תו",
};

export const METHODS = [
  "hechrachi",
  "gadol",
  "katan",
  "siduri",
  "katan-mispari",
  "perati",
  "meshulash",
  "kidmi",
  "boneeh",
  "haakhor",
  "milui",
  "atbash",
  "albam",
] as const;

export type GematriaMethod = (typeof METHODS)[number];

export const METHOD_LABELS: Record<GematriaMethod, string> = {
  hechrachi: "标准值（Mispar Hechrachi）",
  gadol: "大值（含终形 500–900）",
  katan: "小值（去零）",
  siduri: "序数值（1–22）",
  "katan-mispari": "数根（1–9）",
  perati: "平方值（各字平方）",
  meshulash: "立方值（各字立方）",
  kidmi: "累进值（Kidmi）",
  boneeh: "累积值（Bone'eh）",
  haakhor: "倒序加权（Ha'akhor）",
  milui: "拼读值（Milui）",
  atbash: "替换值（Atbash）",
  albam: "替换值（Albam）",
};

const MARKS_RE = /[\u0591-\u05C7]/g;
const MAQAF = "\u05BE";
const IGNORED_PUNCT_RE = /[׳״'"]/g;
const HEBREW_LETTER_RE = /^[א-ת]$/;

const normalizeFinal = (ch: string) => FINAL_TO_BASE[ch] ?? ch;

/** 是否希伯来字母（含终形）。 */
export const isHebrewLetter = (ch: string) => HEBREW_LETTER_RE.test(ch) || ch in FINAL_TO_BASE;

/** 过滤出希伯来字母，保留分词。 */
export const tokenize = (text: string): string[][] => {
  const cleaned = text.replace(MARKS_RE, "").replace(IGNORED_PUNCT_RE, "").split(MAQAF).join(" ");
  const words: string[][] = [];
  let current: string[] = [];
  for (const ch of cleaned) {
    if (isHebrewLetter(ch)) current.push(ch);
    else if (/\s/.test(ch)) {
      if (current.length) words.push(current);
      current = [];
    }
  }
  if (current.length) words.push(current);
  return words;
};

const standardValue = (ch: string) => STANDARD[normalizeFinal(ch)];

const katanValue = (ch: string) => {
  let value = standardValue(ch);
  while (value % 10 === 0 && value > 0) value /= 10;
  return value;
};

const siduriValue = (ch: string) => ALPHABET.indexOf(normalizeFinal(ch)) + 1;

const KIDMI: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let running = 0;
  for (const ch of ALPHABET) {
    running += STANDARD[ch];
    out[ch] = running;
  }
  return out;
})();

export const digitalRoot = (n: number) => (n === 0 ? 0 : 1 + ((n - 1) % 9));

const cipherMap = (pair: (index: number) => number) => {
  const out: Record<string, string> = {};
  for (let i = 0; i < 22; i += 1) out[ALPHABET[i]] = ALPHABET[pair(i)];
  return out;
};
const ATBASH_MAP = cipherMap((i) => 21 - i);
const ALBAM_MAP = cipherMap((i) => (i + 11) % 22);

const perLetterValue = (ch: string, method: GematriaMethod): number => {
  switch (method) {
    case "hechrachi":
      return standardValue(ch);
    case "gadol":
      return GADOL_FINALS[ch] ?? standardValue(ch);
    case "katan":
      return katanValue(ch);
    case "siduri":
      return siduriValue(ch);
    case "perati": {
      const v = standardValue(ch);
      return v * v;
    }
    case "meshulash": {
      const v = standardValue(ch);
      return v * v * v;
    }
    case "kidmi":
      return KIDMI[normalizeFinal(ch)];
    case "milui": {
      const name = MILUI_SPELLINGS[normalizeFinal(ch)];
      if (!name) return 0;
      let sum = 0;
      for (const c of name) sum += standardValue(c);
      return sum;
    }
    case "atbash":
      return standardValue(ATBASH_MAP[normalizeFinal(ch)] ?? ch);
    case "albam":
      return standardValue(ALBAM_MAP[normalizeFinal(ch)] ?? ch);
    default:
      return standardValue(ch);
  }
};

/**
 * 逐字数值（与 mispar 的 letterValues 一致）。
 *
 * 语义对齐：上游 `mispar`（MIT，(c) 2026 Moshe Malka，
 * https://github.com/moshejs/mispar）的 `src/index.ts:257-264` 对
 * `katan-mispari` **直接抛 RangeError** —— 该法把归约作用在「总和」上，
 * 逐字拆解无定义（逐字标准值之和 ≠ 数根）。本仓原先对 katan-mispari 返回
 * 逐字标准值，会让人误以为可以逐字相加得到数根，故按上游语义改为抛错。
 * 需要 katan-mispari 的数值时请调用 `gematria(text, "katan-mispari")`。
 */
export const letterValues = (text: string, method: GematriaMethod = "hechrachi") => {
  if (method === "katan-mispari") {
    throw new RangeError('"katan-mispari" reduces the total — no per-letter values');
  }
  const words = tokenize(text);
  const out: Array<{ letter: string; base: string; value: number }> = [];
  let running = 0;
  for (const word of words) {
    word.forEach((ch, index) => {
      let value: number;
      if (method === "boneeh") {
        running += standardValue(ch);
        value = running;
      } else if (method === "haakhor") {
        value = standardValue(ch) * (index + 1);
      } else {
        value = perLetterValue(ch, method);
      }
      out.push({ letter: ch, base: normalizeFinal(ch), value });
    });
  }
  return out;
};

/** 十三法各自的数值。 */
export const gematria = (text: string, method: GematriaMethod = "hechrachi") => {
  const words: string[] = tokenize(text).map((word) => word.join(""));
  if (method === "katan-mispari") {
    let total = 0;
    for (const word of words) for (const ch of word) total += standardValue(ch);
    return digitalRoot(total);
  }
  if (method === "boneeh") {
    let running = 0;
    let total = 0;
    for (const word of words) for (const ch of word) {
      running += standardValue(ch);
      total += running;
    }
    return total;
  }
  if (method === "haakhor") {
    let total = 0;
    for (const word of words) [...word].forEach((ch, index) => { total += standardValue(ch) * (index + 1); });
    return total;
  }
  let total = 0;
  for (const word of words) for (const ch of word) total += perLetterValue(ch, method);
  return total;
};

export const allMethods = (text: string): Record<GematriaMethod, number> =>
  Object.fromEntries(METHODS.map((method) => [method, gematria(text, method)])) as Record<GematriaMethod, number>;

/** Atbash / Albam 替换后的文本。 */
export const substitute = (text: string, cipher: "atbash" | "albam") => {
  const map = cipher === "atbash" ? ATBASH_MAP : ALBAM_MAP;
  return tokenize(text).map((word) => word.map((ch) => map[normalizeFinal(ch)] ?? ch).join("")).join(" ");
};
