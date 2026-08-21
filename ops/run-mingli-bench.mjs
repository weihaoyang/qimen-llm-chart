/**
 * Explicit, opt-in evaluation runner for MingLi-Bench (MIT).
 *
 * This benchmark measures multiple-choice historical-event prediction on a
 * small public corpus. It is useful for detecting prompt/model regressions,
 * not for claiming that any system can predict a user's future.
 *
 * Dry run (no API calls):
 *   node ops/run-mingli-bench.mjs <data.json> <fortune_api_results.json>
 * Execute (incurs the configured model provider's cost):
 *   node ops/run-mingli-bench.mjs <data.json> <fortune_api_results.json> --execute --sample 20
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const [questionsPath, chartsPath, ...flags] = process.argv.slice(2);
if (!questionsPath || !chartsPath) {
  throw new Error("Usage: node ops/run-mingli-bench.mjs <data.json> <fortune_api_results.json> [--execute] [--sample N] [--output path]");
}

const valueAfter = (flag) => {
  const index = flags.indexOf(flag);
  return index >= 0 ? flags[index + 1] : undefined;
};
const execute = flags.includes("--execute");
const sample = Math.max(1, Number(valueAfter("--sample") ?? Number.POSITIVE_INFINITY));
const outputPath = valueAfter("--output") ?? resolve("outputs", "benchmarks", `mingli-${new Date().toISOString().replaceAll(":", "-")}.json`);
const questions = JSON.parse(await readFile(questionsPath, "utf8")).questions;
const chartEntries = JSON.parse(await readFile(chartsPath, "utf8"));
const charts = new Map(chartEntries.map((entry) => [entry.case_id, entry.api_response?.data?.data]));
const selected = questions.slice(0, sample);

const categoryCounts = Object.fromEntries(
  selected.reduce((counts, question) => counts.set(question.category, (counts.get(question.category) ?? 0) + 1), new Map()),
);

if (!execute) {
  console.log(JSON.stringify({
    mode: "dry-run",
    corpus: "DestinyLinker/MingLi-Bench (MIT)",
    questions: selected.length,
    categories: categoryCounts,
    note: "No model request was made. Add --execute only after choosing a model budget and output path.",
  }, null, 2));
  process.exit(0);
}

const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
const baseUrl = process.env.OPENAI_BASE_URL ?? process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
const model = process.env.OPENAI_MODEL ?? process.env.AI_MODEL ?? "gpt-4.1-mini";
if (!apiKey) throw new Error("OPENAI_API_KEY or AI_API_KEY is required with --execute.");

const compactChart = (chart) => ({
  bazi: chart?.chineseDate,
  time: chart?.time,
  ziwei: chart?.palaces?.map((palace) => ({
    palace: palace.name,
    majorStars: palace.majorStars?.map((star) => star.name) ?? [],
    minorStars: palace.minorStars?.map((star) => star.name) ?? [],
  })) ?? [],
});

const answerFrom = (content) => {
  const matches = [...String(content ?? "").matchAll(/(?:答案|answer)\s*[：:]?\s*([ABCD])/gi)];
  if (matches.length) return matches.at(-1)?.[1]?.toUpperCase() ?? null;
  const direct = String(content ?? "").trim().match(/^([ABCD])$/i);
  return direct?.[1]?.toUpperCase() ?? null;
};

const ask = async (question) => {
  const chart = charts.get(question.case_id);
  if (!chart) throw new Error(`Missing chart context for ${question.id} / ${question.case_id}`);
  const prompt = {
    role: "user",
    content: [
      "这是一个公开命理比赛历史题的离线研究评测，不是对现实用户的预测。",
      "只依据所给八字/紫微结构化材料作答；不补造未提供的字段。",
      "请在内部审慎判断，最终只输出 `答案：A`、`答案：B`、`答案：C` 或 `答案：D`。",
      `命盘材料：${JSON.stringify(compactChart(chart))}`,
      `问题：${question.question}`,
      `选项：${question.options.map((option) => `${option.letter}. ${option.text}`).join("；")}`,
    ].join("\n"),
  };
  const endpoint = new URL("chat/completions", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 96,
      messages: [{
        role: "system",
        content: "你是传统术数研究评测助手。不要把选择题结果表述为真实世界确定因果。",
      }, prompt],
    }),
  });
  if (!response.ok) throw new Error(`Model request failed ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const body = await response.json();
  const content = body.choices?.[0]?.message?.content ?? "";
  return { prediction: answerFrom(content), content: String(content).slice(0, 800) };
};

const results = [];
for (const question of selected) {
  const response = await ask(question);
  results.push({
    id: question.id,
    caseId: question.case_id,
    category: question.category,
    expected: question.answer,
    ...response,
    correct: response.prediction === question.answer,
  });
}

const scored = results.filter((result) => result.prediction);
const byCategory = Object.fromEntries(Object.keys(categoryCounts).map((category) => {
  const rows = scored.filter((result) => result.category === category);
  return [category, { total: rows.length, correct: rows.filter((result) => result.correct).length }];
}));
const report = {
  corpus: "DestinyLinker/MingLi-Bench (MIT)",
  model,
  evaluatedAt: new Date().toISOString(),
  total: selected.length,
  parseable: scored.length,
  correct: scored.filter((result) => result.correct).length,
  accuracy: scored.length ? scored.filter((result) => result.correct).length / scored.length : null,
  byCategory,
  results,
  limitations: [
    "This is a 160-question public historical multiple-choice corpus, not prospective validation.",
    "Scores compare model/prompt variants only; they must not be presented as a user's future prediction accuracy.",
    "The runner is separate from the paid product Agent and never changes its prompt or user data.",
  ],
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...report, results: undefined, outputPath }, null, 2));
