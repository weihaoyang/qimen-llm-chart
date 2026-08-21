/**
 * Recompute historical Agent results without contacting a model provider.
 *
 * Usage:
 *   node ops/audit-agent-history-results.mjs fate_bench.jsonl result-a.json result-b.json
 *   node ops/audit-agent-history-results.mjs mingli_bench_data.json result-a.json
 *
 * The tool intentionally reports coverage, all-item accuracy, and selective
 * (answered-only) accuracy separately. It is an internal audit, not a product
 * feature and not evidence of prospective prediction accuracy.
 */
import { readFile } from "node:fs/promises";

const [corpusPath, ...reportPaths] = process.argv.slice(2);
if (!corpusPath || !reportPaths.length) {
  throw new Error("Usage: node ops/audit-agent-history-results.mjs <questions.jsonl|questions.json> <report.json> [...report.json]");
}

const corpusSource = await readFile(corpusPath, "utf8");
const corpusRows = corpusPath.toLowerCase().endsWith(".jsonl")
  ? corpusSource.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line))
  : (JSON.parse(corpusSource).questions ?? []);
const corpus = new Map(corpusRows.map((row) => [row.id, row]));

const rate = (numerator, denominator) => denominator ? numerator / denominator : null;
const formatRate = (value) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const wilson95 = (successes, total) => {
  if (!total) return null;
  const z = 1.959963984540054;
  const p = successes / total;
  const denominator = 1 + (z ** 2 / total);
  const center = (p + (z ** 2 / (2 * total))) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) / total) + (z ** 2 / (4 * total ** 2))) / denominator;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
};
const interval = (value) => value ? `${formatRate(value[0])}–${formatRate(value[1])}` : "—";

const summarize = (rows) => {
  const answered = rows.filter((row) => row.prediction && !row.error);
  const correct = rows.filter((row) => row.correct).length;
  const answeredCorrect = answered.filter((row) => row.correct).length;
  const randomExpectedCorrect = rows.reduce((sum, row) => sum + 1 / Math.max(1, row.numOptions), 0);
  return {
    total: rows.length,
    answered: answered.length,
    correct,
    coverage: rate(answered.length, rows.length),
    allItemAccuracy: rate(correct, rows.length),
    allItemWilson95: wilson95(correct, rows.length),
    conditionalAccuracy: rate(answeredCorrect, answered.length),
    conditionalWilson95: wilson95(answeredCorrect, answered.length),
    randomExpectedAccuracy: rate(randomExpectedCorrect, rows.length),
  };
};

const tables = [];
for (const reportPath of reportPaths) {
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const rows = (report.results ?? []).map((raw) => {
    const source = corpus.get(raw.id);
    return {
      ...raw,
      category: raw.category ?? source?.category ?? "未分类",
      edition: raw.edition ?? source?.edition ?? source?.year ?? "未知",
      numOptions: raw.numOptions ?? raw.num_options ?? source?.num_options ?? source?.options?.length ?? 0,
      correct: Boolean(raw.correct),
    };
  });
  const summary = summarize(rows);
  const byEdition = Object.fromEntries([...new Set(rows.map((row) => row.edition))].sort().map((edition) => [edition, summarize(rows.filter((row) => row.edition === edition))]));
  tables.push({ reportPath, report, summary, byEdition });
}

console.log("# Agent 历史题离线审计\n");
console.log("本报告只复算已有 JSON，不发送模型请求；历史选择题不构成未来预测准确率。\n");
console.log("| 结果文件 | 题数 | 回答覆盖率 | 全题命中率（95% CI） | 仅回答题命中率（95% CI） | 按选项数随机期望 |\n| --- | ---: | ---: | ---: | ---: | ---: |");
for (const { reportPath, summary } of tables) {
  console.log(`| ${reportPath.replaceAll("|", "\\|")} | ${summary.total} | ${formatRate(summary.coverage)} | ${formatRate(summary.allItemAccuracy)} (${interval(summary.allItemWilson95)}) | ${formatRate(summary.conditionalAccuracy)} (${interval(summary.conditionalWilson95)}) | ${formatRate(summary.randomExpectedAccuracy)} |`);
}
console.log("\n## 分届\n");
for (const { reportPath, byEdition } of tables) {
  console.log(`### ${reportPath}\n`);
  console.log("| 届次 | 题数 | 覆盖率 | 全题命中率 | 条件命中率 |\n| --- | ---: | ---: | ---: | ---: |");
  for (const [edition, summary] of Object.entries(byEdition)) {
    console.log(`| ${edition} | ${summary.total} | ${formatRate(summary.coverage)} | ${formatRate(summary.allItemAccuracy)} | ${formatRate(summary.conditionalAccuracy)} |`);
  }
  console.log("");
}
