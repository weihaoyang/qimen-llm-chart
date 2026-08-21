/**
 * Offline parity check for 紫微斗数 structural fields against the published
 * MingLi-Bench corpus. It intentionally compares palace structure rather
 * than the provider's chineseDate display, because iztro represents that
 * display with lunar-month text while this product's Bazi output is defined
 * by the selected solar-term convention.
 */
import { readFile } from "node:fs/promises";
import { astro } from "iztro";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Provide the downloaded MingLi-Bench fortune_api_results.json path.");

const cases = JSON.parse(await readFile(sourcePath, "utf8"));
const mismatches = [];

for (const entry of cases) {
  const birth = entry.birth_info;
  const expected = entry.api_response?.data?.data;
  if (!birth || !expected) continue;
  const timeIndex = birth.hour === 0 ? 0 : birth.hour === 23 ? 12 : Math.floor((birth.hour + 1) / 2);
  const actual = astro.bySolar(`${birth.year}-${birth.month}-${birth.day}`, timeIndex, birth.gender, true, "zh-CN");
  const actualPalaces = actual.palaces.map((palace) => ({
    name: palace.name,
    earthlyBranch: palace.earthlyBranch,
    majorStars: palace.majorStars.map((star) => star.name),
  }));
  const expectedPalaces = expected.palaces.map((palace) => ({
    name: palace.name,
    earthlyBranch: palace.earthlyBranch,
    majorStars: palace.majorStars.map((star) => star.name),
  }));
  const same = JSON.stringify({ soul: actual.soul, body: actual.body, fiveElementsClass: actual.fiveElementsClass, palaces: actualPalaces })
    === JSON.stringify({ soul: expected.soul, body: expected.body, fiveElementsClass: expected.fiveElementsClass, palaces: expectedPalaces });
  if (!same) mismatches.push({ caseId: entry.case_id, birth, expected: { soul: expected.soul, body: expected.body, fiveElementsClass: expected.fiveElementsClass, palaces: expectedPalaces }, actual: { soul: actual.soul, body: actual.body, fiveElementsClass: actual.fiveElementsClass, palaces: actualPalaces } });
}

console.log(JSON.stringify({
  corpus: "DestinyLinker/MingLi-Bench data/fortune_api_results.json",
  checked: cases.length,
  matched: cases.length - mismatches.length,
  mismatched: mismatches.length,
  mismatches,
}, null, 2));
process.exitCode = mismatches.length ? 1 : 0;
