import { describe, expect, it } from "vitest";
import { buildQabalahReading } from "./chart";
import { LETTERS, SEPHIROT, WORLDS } from "./data";
import { ALPHABET, METHODS, digitalRoot, gematria, letterValues, substitute, tokenize } from "./gematria";
import { serializeQabalahToCompactJson, serializeQabalahToStructuredText } from "./serializer";

describe("qabalah tables", () => {
  it("ships 22 letters, 10 sephirot and 4 worlds", () => {
    expect(LETTERS).toHaveLength(22);
    expect(SEPHIROT).toHaveLength(10);
    expect(WORLDS).toHaveLength(4);
    expect(ALPHABET).toHaveLength(22);
    expect(METHODS).toHaveLength(13);
  });

  it("keeps the Sepher Yetzirah division: 3 mothers, 7 doubles, 12 simples", () => {
    expect(LETTERS.filter((letter) => letter.kind === "母").map((letter) => letter.name)).toEqual(["Aleph", "Mem", "Shin"]);
    expect(LETTERS.filter((letter) => letter.kind === "双").map((letter) => letter.name)).toEqual(["Beth", "Gimel", "Daleth", "Kaph", "Peh", "Resh", "Tav"]);
    expect(LETTERS.filter((letter) => letter.kind === "单")).toHaveLength(12);
  });

  it("numbers the 22 paths 11 to 32 and matches the standard values", () => {
    expect(LETTERS.map((letter) => letter.path)).toEqual(Array.from({ length: 22 }, (_, index) => index + 11));
    expect(LETTERS[0].value).toBe(1);
    expect(LETTERS[9].value).toBe(10);
    expect(LETTERS[10].value).toBe(20);
    expect(LETTERS[21].value).toBe(400);
    // 每辉都有自己的守护天使与天使序
    for (const sephirah of SEPHIROT) {
      expect(sephirah.archangel.length).toBeGreaterThan(0);
      expect(sephirah.order.length).toBeGreaterThan(0);
    }
    for (const world of WORLDS) {
      expect(world.archangel.length).toBeGreaterThan(0);
      expect(world.order.length).toBeGreaterThan(0);
      expect(world.sephirot.length).toBeGreaterThan(0);
    }
  });
});

describe("gematria", () => {
  it("tokenizes Hebrew and strips pointing", () => {
    expect(tokenize("יְהוָה")).toEqual([["י", "ה", "ו", "ה"]]);
    expect(tokenize("שלום עולם")).toEqual([["ש", "ל", "ו", "ם"], ["ע", "ו", "ל", "ם"]]);
    expect(tokenize("abc")).toEqual([]);
  });

  it("computes the standard value of the Tetragrammaton as 26", () => {
    expect(gematria("יהוה")).toBe(26);
    expect(gematria("אמת")).toBe(441);
    expect(gematria("אחד")).toBe(13);
  });

  it("handles final forms: hechrachi folds them, gadol does not", () => {
    expect(gematria("אמן")).toBe(91); // א 1 + מ 40 + ן→נ 50
    expect(gematria("אמן", "gadol")).toBe(741); // … ן 700
  });

  it("implements katan, siduri, perati, meshulash, kidmi, boneeh and haakhor", () => {
    expect(gematria("ת", "katan")).toBe(4);
    expect(gematria("א", "siduri")).toBe(1);
    expect(gematria("ת", "siduri")).toBe(22);
    expect(gematria("אב", "perati")).toBe(5); // 1² + 2²
    expect(gematria("אב", "meshulash")).toBe(9); // 1³ + 2³
    expect(gematria("אבג", "kidmi")).toBe(1 + 3 + 6);
    expect(gematria("אב", "boneeh")).toBe(1 + 3);
    expect(gematria("אבג", "haakhor")).toBe(1 + 4 + 9);
  });

  it("implements milui, atbash, albam and the digital root", () => {
    expect(gematria("א", "milui")).toBe(111); // אלף = 1 + 30 + 80
    expect(gematria("א", "atbash")).toBe(400);
    expect(substitute("אב", "atbash")).toBe("תש");
    expect(gematria("א", "albam")).toBe(30);
    expect(substitute("אב", "albam")).toBe("למ");
    expect(digitalRoot(26)).toBe(8);
    expect(digitalRoot(0)).toBe(0);
    expect(gematria("יהוה", "katan-mispari")).toBe(8);
  });

  it("breaks a word down letter by letter", () => {
    const values = letterValues("אמת");
    expect(values.map((entry) => entry.value)).toEqual([1, 40, 400]);
    expect(values.map((entry) => entry.base)).toEqual(["א", "מ", "ת"]);
  });
});

describe("qabalah reading", () => {
  it("maps the Tetragrammaton to the eighth sephirah and Yetzirah", () => {
    const reading = buildQabalahReading("יהוה");
    expect(reading.format).toBe("qmdj-qabalah-v1");
    expect(reading.letters).toHaveLength(4);
    expect(reading.standard).toBe(26);
    expect(reading.digitalRoot).toBe(8);
    expect(reading.sephirah?.name).toBe("Hod");
    expect(reading.world?.name).toBe("Yetzirah");
    expect(reading.methods).toHaveLength(13);
    expect(reading.sameValueLetters).toHaveLength(0);
  });

  it("finds the same-value letter when the total matches one", () => {
    const reading = buildQabalahReading("את"); // 1 + 400 = 401, 无同值
    expect(reading.standard).toBe(401);
    const reading2 = buildQabalahReading("ים"); // 10 + 40 = 50 → נ
    expect(reading2.standard).toBe(50);
    expect(reading2.sameValueLetters.map((letter) => letter.name)).toEqual(["Nun"]);
  });

  it("stays empty for non-Hebrew input", () => {
    const reading = buildQabalahReading("abc 123");
    expect(reading.letters).toHaveLength(0);
    expect(reading.standard).toBe(0);
    expect(reading.sephirah).toBeNull();
    expect(reading.world).toBeNull();
  });

  it("serializes both forms", () => {
    const reading = buildQabalahReading("יהוה");
    const text = serializeQabalahToStructuredText(reading);
    expect(text).toContain("四界");
    expect(text).toContain("Metatron");
    const payload = JSON.parse(serializeQabalahToCompactJson(reading)) as { format: string; letters: unknown[]; worlds: unknown[]; sephirot: unknown[] };
    expect(payload.format).toBe("qmdj-qabalah-v1");
    expect(payload.letters).toHaveLength(4);
    expect(payload.worlds).toHaveLength(4);
    expect(payload.sephirot).toHaveLength(10);
  });
});
