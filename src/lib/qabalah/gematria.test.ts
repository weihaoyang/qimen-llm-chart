import { expect, it } from "vitest";
import { gematria, substitute, tokenize } from "./gematria";

it("reproduces the Nedarim 32a calculations with or without presentation forms", () => {
  expect(gematria("אֱלִיעֶזֶר")).toBe(318);
  expect(gematria("ﭏיעזר")).toBe(318);
  expect(gematria("עֵקֶב")).toBe(172);
});

it("treats Hebrew maqaf as a word boundary for positional weighting", () => {
  expect(tokenize("אָב־גָּד")).toEqual([["א", "ב"], ["ג", "ד"]]);
  expect(gematria("אָב־גָּד", "haakhor")).toBe(16);
});

it("decodes Sheshach as Babel in the Hebrew text of Jeremiah 51:41", () => {
  expect(substitute("שֵׁשַׁךְ", "atbash")).toBe("בבל");
  expect(gematria("שֵׁשַׁךְ", "atbash")).toBe(34);
});

it("distinguishes the four traditional milui spellings from the default expansion", () => {
  expect(gematria("יהוה", "milui")).toBe(45);
  expect(gematria("יוד הי ויו הי")).toBe(72);
  expect(gematria("יוד הי ואו הי")).toBe(63);
  expect(gematria("יוד הא ואו הא")).toBe(45);
  expect(gematria("יוד הה וו הה")).toBe(52);
});

it("distinguishes the Etz Chaim prefix sum from ascending positional weights", () => {
  expect(gematria("י יה יהו יהוה")).toBe(72);
  expect(gematria("יהוה", "boneeh")).toBe(72);
  expect(gematria("יהוה", "haakhor")).toBe(58);
});

it("keeps Hebrew words separate across punctuation and mixed scripts", () => {
  for (const input of ["אב,גד", "אב-גד", "אב/גד", "אבABCגד"]) {
    expect(tokenize(input)).toEqual([["א", "ב"], ["ג", "ד"]]);
    expect(gematria(input, "haakhor")).toBe(16);
  }
  expect(tokenize("יהו״ה")).toEqual([["י", "ה", "ו", "ה"]]);
});
