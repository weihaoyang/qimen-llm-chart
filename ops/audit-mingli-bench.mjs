/**
 * Compare this product's deterministic Bazi dependency with the published
 * MingLi-Bench chart corpus. This is an offline audit only: it does not call
 * an LLM and never sends birth data anywhere.
 *
 * Usage:
 *   node ops/audit-mingli-bench.mjs F:\\temp\\mingli-bench-fortune-api-results.json
 */
import { readFile } from "node:fs/promises";
import { Solar } from "lunar-typescript";

const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error("Provide the downloaded MingLi-Bench fortune_api_results.json path.");
}

const cases = JSON.parse(await readFile(sourcePath, "utf8"));
const mismatches = [];
const conventionResolved = [];

for (const entry of cases) {
  const birth = entry.birth_info;
  const expected = entry.api_response?.data?.data?.chineseDate;
  if (!birth || !expected) continue;

  const lunar = Solar
    .fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute, 0)
    .getLunar();
  const evaluate = (yearBoundary, dayBoundary) => {
    const eightChar = lunar.getEightChar();
    eightChar.setSect(dayBoundary === "zi-start" ? 1 : 2);
    const year = yearBoundary === "lunar-new-year" ? lunar.getYearInGanZhi() : eightChar.getYear();
    return [year, eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()].join(" ");
  };
  const actual = evaluate("li-chun", "midnight");
  const matchingConventions = [
    ["li-chun", "midnight"], ["li-chun", "zi-start"],
    ["lunar-new-year", "midnight"], ["lunar-new-year", "zi-start"],
  ].filter(([yearBoundary, dayBoundary]) => evaluate(yearBoundary, dayBoundary) === expected);

  if (actual !== expected) {
    mismatches.push({ caseId: entry.case_id, birth, expected, actual, matchingConventions });
  }
  if (matchingConventions.length === 0) {
    conventionResolved.push({ caseId: entry.case_id, birth, expected, actual });
  }
}

const report = {
  corpus: "DestinyLinker/MingLi-Bench data/fortune_api_results.json",
  checked: cases.length,
  matched: cases.length - mismatches.length,
  mismatched: mismatches.length,
  conventionResolved: cases.length - conventionResolved.length,
  unresolved: conventionResolved,
  mismatches,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = conventionResolved.length ? 1 : 0;
