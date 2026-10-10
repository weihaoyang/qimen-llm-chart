import { LETTERS, LETTER_BY_GLYPH, SEPHIROT, WORLDS } from "./data";
import { METHODS, METHOD_LABELS, allMethods, digitalRoot, letterValues, substitute, tokenize, type GematriaMethod } from "./gematria";

export type QabalahLetterHit = {
  letter: string;
  base: string;
  value: number;
  name: string;
  zh: string;
  path: number | null;
  kind: string;
  attribution: string;
  tarot: string;
};

export type QabalahReading = {
  format: "qmdj-qabalah-v1";
  input: string;
  words: string[];
  letters: QabalahLetterHit[];
  methods: Array<{ method: GematriaMethod; label: string; value: number }>;
  standard: number;
  digitalRoot: number;
  sameValueLetters: Array<{ name: string; zh: string; glyph: string }>;
  sephirah: (typeof SEPHIROT)[number] | null;
  world: (typeof WORLDS)[number] | null;
  atbash: string;
  albam: string;
  disclaimer: string;
};

export const buildQabalahReading = (input: string): QabalahReading => {
  const words = tokenize(input).map((word) => word.join(""));
  const letters: QabalahLetterHit[] = letterValues(input, "hechrachi").map((entry) => {
    const meta = LETTER_BY_GLYPH[entry.base] ?? LETTERS[0];
    return {
      letter: entry.letter,
      base: entry.base,
      value: entry.value,
      name: meta.name,
      zh: meta.zh,
      path: LETTER_BY_GLYPH[entry.base] ? meta.path : null,
      kind: meta.kind,
      attribution: meta.attribution,
      tarot: meta.tarot,
    };
  });

  const standard = letters.reduce((sum, entry) => sum + entry.value, 0);
  const root = digitalRoot(standard);
  const sephirah = root >= 1 && root <= 9 ? SEPHIROT[root - 1] : null;
  const world = sephirah ? WORLDS.find((item) => item.sephirot.includes(sephirah.name)) ?? null : null;
  const sameValueLetters = LETTERS.filter((letter) => letter.value === standard).map((letter) => ({ name: letter.name, zh: letter.zh, glyph: letter.glyph }));

  const values = allMethods(input);
  return {
    format: "qmdj-qabalah-v1",
    input,
    words,
    letters,
    methods: METHODS.map((method) => ({ method, label: METHOD_LABELS[method], value: values[method] })),
    standard,
    digitalRoot: root,
    sameValueLetters,
    sephirah,
    world,
    atbash: substitute(input, "atbash"),
    albam: substitute(input, "albam"),
    disclaimer:
      "赫尔墨斯卡巴拉研究盘：十辉与二十二字母的名称、数值与三分法出自《创造之书》（公共领域）；「四界 / 十辉」的神名、天使与天使序，以及「字母 ↔ 塔罗 / 元素 / 行星 / 星座」对照为赫尔墨斯传统（Golden Dawn 一系）的通行对应。数术（gematria）十三法移植自 MIT 的 `mispar`。数根 → 辉位的对应为该体系的对照，不是等式或预测。",
  };
};
