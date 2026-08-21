/**
 * Offline four-pillar and corpus-integrity audit for Fate-Bench.
 *
 * Fate-Bench is an open collection of historical contest questions. Its
 * answers are useful for controlled regression research, not evidence that a
 * system can predict an individual user's future. This script makes no model
 * request and transmits no birth data.
 *
 * Usage:
 *   node ops/audit-fate-bench.mjs <cases.json> [fate_bench.jsonl]
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { astro } from "iztro";
import { Solar } from "lunar-typescript";

const [casesPath, questionsPath] = process.argv.slice(2);
if (!casesPath) throw new Error("Usage: node ops/audit-fate-bench.mjs <cases.json> [fate_bench.jsonl]");

const source = await readFile(casesPath);
const cases = JSON.parse(source.toString("utf8"));
const conventions = [
  ["li-chun", "midnight"],
  ["li-chun", "zi-start"],
  ["lunar-new-year", "midnight"],
  ["lunar-new-year", "zi-start"],
];
// Fate-Bench's mlb_case_31 exported a different Ziwei structure from the
// upstream MingLi-Bench record for the same 1988-02-15 16:50 input. The
// product's iztro version reproduces upstream MingLi-Bench (天同 / 火六局),
// not the Fate-Bench export (文昌 / 土五局). Keep this source disagreement
// explicit instead of silently changing a product calculation to fit it.
const knownZiweiSourceVariances = new Map([
  ["mlb_case_31", "Fate-Bench Ziwei export conflicts with upstream MingLi-Bench; product iztro matches upstream."],
]);

const fourPillarsFor = (birth, resolvedTime, yearBoundary, dayBoundary) => {
  const lunar = Solar
    .fromYmdHms(birth.year, birth.month, birth.day, resolvedTime.hour, resolvedTime.minute ?? 0, 0)
    .getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(dayBoundary === "zi-start" ? 1 : 2);
  return [
    yearBoundary === "lunar-new-year" ? lunar.getYearInGanZhi() : eightChar.getYear(),
    eightChar.getMonth(),
    eightChar.getDay(),
    eightChar.getTime(),
  ].join(" ");
};

const skipped = [];
const mismatches = [];
const resolved = [];
const ziweiSkipped = [];
const ziweiMismatches = [];
const ziweiSourceVariances = [];
let ziweiMatched = 0;
for (const entry of cases) {
  const birth = entry.birth_info;
  const time = entry.resolved_time;
  const pillars = entry.charts?.bazi?.pillars;
  if (birth?.calendar_type !== "solar" || !time || !pillars) {
    skipped.push({ caseId: entry.case_id, reason: entry.charts_unavailable ?? "missing solar birth time or Bazi pillars" });
    continue;
  }
  const expected = [pillars.year, pillars.month, pillars.day, pillars.hour].join(" ");
  const matchingConventions = conventions.filter(([yearBoundary, dayBoundary]) =>
    fourPillarsFor(birth, time, yearBoundary, dayBoundary) === expected,
  );
  const defaultMatched = matchingConventions.some(([yearBoundary, dayBoundary]) =>
    yearBoundary === "li-chun" && dayBoundary === "midnight",
  );
  const row = { caseId: entry.case_id, birth: { year: birth.year, month: birth.month, day: birth.day, hour: time.hour, minute: time.minute ?? 0 }, expected, matchingConventions };
  if (!matchingConventions.length) mismatches.push(row);
  else resolved.push({ ...row, defaultMatched });

  const expectedZiwei = entry.charts?.ziwei;
  if (!expectedZiwei) {
    ziweiSkipped.push({ caseId: entry.case_id, reason: entry.charts_unavailable ?? "missing Ziwei chart" });
    continue;
  }
  const hour = time.hour;
  const timeIndex = hour === 0 ? 0 : hour === 23 ? 12 : Math.floor((hour + 1) / 2);
  const actualZiwei = astro.bySolar(
    `${birth.year}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")}`,
    timeIndex,
    birth.gender === "女" ? "female" : "male",
    true,
    "zh-CN",
  );
  const actualStructure = {
    soul: actualZiwei.soul,
    body: actualZiwei.body,
    fiveElementsClass: actualZiwei.fiveElementsClass,
    palaces: actualZiwei.palaces.map((palace) => ({
      name: palace.name,
      branch: palace.earthlyBranch,
      majorStars: palace.majorStars.map((star) => star.name),
    })),
  };
  const expectedStructure = {
    soul: expectedZiwei.soul,
    body: expectedZiwei.body,
    fiveElementsClass: expectedZiwei.five_elements_class,
    palaces: expectedZiwei.palaces.map((palace) => ({
      name: palace.name,
      branch: palace.branch,
      majorStars: palace.major_stars.map((star) => star.name),
    })),
  };
  if (JSON.stringify(actualStructure) === JSON.stringify(expectedStructure)) ziweiMatched += 1;
  else {
    const sourceVariance = knownZiweiSourceVariances.get(entry.case_id);
    const result = { caseId: entry.case_id, ...(sourceVariance ? { reason: sourceVariance } : {}), expected: expectedStructure, actual: actualStructure };
    if (sourceVariance) ziweiSourceVariances.push(result);
    else ziweiMismatches.push(result);
  }
}

let questionAudit;
if (questionsPath) {
  const questionSource = await readFile(questionsPath);
  const questions = questionSource.toString("utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const knownCases = new Set(cases.map((entry) => entry.case_id));
  const duplicateIds = questions
    .map((row) => row.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  const invalidQuestions = questions.flatMap((row) => {
    const errors = [];
    if (!knownCases.has(row.case_id)) errors.push("unknown case_id");
    if (!Array.isArray(row.options) || !row.options.some((option) => option.letter === row.answer)) errors.push("answer absent from options");
    if (row.num_options !== row.options?.length) errors.push("num_options mismatch");
    return errors.length ? [{ id: row.id, errors }] : [];
  });
  questionAudit = {
    sha256: createHash("sha256").update(questionSource).digest("hex"),
    total: questions.length,
    categories: Object.fromEntries(questions.reduce((map, row) => map.set(row.category ?? "unlabelled", (map.get(row.category ?? "unlabelled") ?? 0) + 1), new Map())),
    options: Object.fromEntries(questions.reduce((map, row) => map.set(row.num_options, (map.get(row.num_options) ?? 0) + 1), new Map())),
    duplicateIds: [...new Set(duplicateIds)],
    invalidQuestions,
    scoreable: questions.filter((row) => row.charts?.bazi?.pillars && row.birth_info?.year).length,
  };
}

const report = {
  corpus: "shunshi-ai/fate-bench (data CC BY 4.0; retrieved locally by operator)",
  limitations: [
    "This audit verifies published chart-field reproduction and corpus integrity only.",
    "Historical contest-answer scores are not prospective prediction accuracy and must not be used in product marketing.",
    "Fate-Bench applies no true-solar-time correction; this audit uses the published civil time.",
  ],
  cases: {
    sha256: createHash("sha256").update(source).digest("hex"),
    total: cases.length,
    eligible: resolved.length + mismatches.length,
    skipped,
    defaultMatched: resolved.filter((row) => row.defaultMatched).length,
    conventionResolved: resolved.length,
    unresolved: mismatches,
  },
  ziwei: {
    eligible: ziweiMatched + ziweiSourceVariances.length + ziweiMismatches.length,
    skipped: ziweiSkipped,
    matched: ziweiMatched,
    knownSourceVariances: ziweiSourceVariances,
    mismatches: ziweiMismatches,
  },
  questions: questionAudit,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = mismatches.length || ziweiMismatches.length || questionAudit?.duplicateIds.length || questionAudit?.invalidQuestions.length ? 1 : 0;
