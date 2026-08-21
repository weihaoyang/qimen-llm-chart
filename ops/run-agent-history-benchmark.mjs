/**
 * Opt-in historical multiple-choice regression for the production Agent contract.
 *
 * It bundles the repository's buildAgentMessages() at runtime, so the evaluated
 * system prompt and message construction are the same code used by the product.
 * This is an offline historical-event benchmark only; it does not measure or
 * claim prospective prediction accuracy.
 *
 * Usage:
 *   node ops/run-agent-history-benchmark.mjs questions.json charts.json --execute --sample 20 --seed qmdj-v1
 *   node ops/run-agent-history-benchmark.mjs fate_bench.jsonl --execute --sample 20 --seed qmdj-v1 --exclude-result prior.json
 */
import { build as bundle } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const positionalArgs = process.argv.slice(2);
const questionsPath = positionalArgs[0];
const chartsPath = positionalArgs[1] && !positionalArgs[1].startsWith("--") ? positionalArgs[1] : undefined;
const flags = chartsPath ? positionalArgs.slice(2) : positionalArgs.slice(1);
if (!questionsPath) {
  throw new Error("Usage: node ops/run-agent-history-benchmark.mjs <questions.json|fate_bench.jsonl> [charts.json] [--execute] [--sample N] [--output path]");
}

const flagValue = (flag) => {
  const index = flags.indexOf(flag);
  return index < 0 ? undefined : flags[index + 1];
};
const flagValues = (flag) => flags.flatMap((value, index) => value === flag && flags[index + 1] ? [flags[index + 1]] : []);
const execute = flags.includes("--execute");
const sample = Math.max(1, Number(flagValue("--sample") ?? Number.POSITIVE_INFINITY));
const sampleStrategy = flagValue("--sample-strategy") ?? "stratified";
const seed = flagValue("--seed") ?? "qmdj-history-v1";
const contextMode = flagValue("--context") ?? "product";
const benchmarkMode = flagValue("--mode") ?? (contextMode === "product" ? "bazi" : "combined");
const outputPath = flagValue("--output") ?? resolve("outputs", "benchmarks", `agent-history-${new Date().toISOString().replaceAll(":", "-")}.json`);
const requestTimeoutMs = Math.max(5_000, Number(flagValue("--request-timeout-ms") ?? 30_000));
const questionSource = await readFile(questionsPath, "utf8");
const questions = questionsPath.toLowerCase().endsWith(".jsonl")
  ? questionSource.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line))
  : JSON.parse(questionSource).questions;
const chartEntries = chartsPath ? JSON.parse(await readFile(chartsPath, "utf8")) : [];
const charts = new Map(chartEntries.map((entry) => [entry.case_id, entry.api_response?.data?.data]));
const corpus = questionsPath.toLowerCase().endsWith(".jsonl") ? "shunshi-ai/fate-bench (CC BY 4.0)" : "DestinyLinker/MingLi-Bench (MIT)";
const excludeResultPaths = flagValues("--exclude-result");
const excludedIds = new Set();
for (const resultPath of excludeResultPaths) {
  const report = JSON.parse(await readFile(resultPath, "utf8"));
  for (const row of report.results ?? []) {
    if (typeof row.id === "string") excludedIds.add(row.id);
  }
}
const eligibleQuestions = questions.filter((question) => !excludedIds.has(question.id));
if (!["product", "legacy"].includes(contextMode)) throw new Error("--context must be product or legacy.");
if (!["bazi", "combined"].includes(benchmarkMode)) throw new Error("--mode must be bazi or combined.");
if (!["stratified", "ordered"].includes(sampleStrategy)) throw new Error("--sample-strategy must be stratified or ordered.");

const stableHash = (value) => {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
};

const optionCountOf = (question) => Number(question.num_options ?? question.numOptions ?? question.options?.length ?? 0) || 0;
const stratumOf = (question) => `${question.category ?? "未分类"} | ${optionCountOf(question)}选`;
const counts = (rows, key) => Object.fromEntries(
  [...rows.reduce((map, row) => {
    const value = typeof key === "function" ? key(row) : row[key] ?? "未分类";
    return map.set(value, (map.get(value) ?? 0) + 1);
  }, new Map())],
);

/**
 * Prefix sampling silently over-represented the earliest contest edition and
 * five-option questions.  This uses the smallest reproducible alternative:
 * each category × option-count stratum gets a turn before proportional fill.
 */
const selectQuestions = (allQuestions, requested) => {
  if (!Number.isFinite(requested) || requested >= allQuestions.length) {
    return { rows: [...allQuestions], metadata: { strategy: "all", seed, strata: counts(allQuestions, stratumOf) } };
  }
  if (sampleStrategy === "ordered") {
    const rows = allQuestions.slice(0, requested);
    return { rows, metadata: { strategy: "ordered", seed: null, strata: counts(rows, stratumOf) } };
  }
  const buckets = new Map();
  for (const question of allQuestions) {
    const key = stratumOf(question);
    const bucket = buckets.get(key) ?? [];
    bucket.push(question);
    buckets.set(key, bucket);
  }
  for (const [key, bucket] of buckets) {
    buckets.set(key, [...bucket].sort((left, right) => stableHash(`${seed}:${left.id}`) - stableHash(`${seed}:${right.id}`) || String(left.id).localeCompare(String(right.id))));
  }
  const bucketEntries = [...buckets.entries()].sort(([left], [right]) => left.localeCompare(right));
  const selectedRows = [];
  const selectedIds = new Set();
  const categories = [...new Set(allQuestions.map((question) => question.category ?? "未分类"))].sort();
  // Category coverage is the first priority; option-count strata govern the
  // remaining proportional fill. A 20-item sample cannot cover all 22 strata.
  for (const category of categories) {
    if (selectedRows.length >= requested) break;
    const candidate = allQuestions
      .filter((question) => (question.category ?? "未分类") === category)
      .sort((left, right) => stableHash(`${seed}:${left.id}`) - stableHash(`${seed}:${right.id}`) || String(left.id).localeCompare(String(right.id)))[0];
    if (candidate) {
      selectedRows.push(candidate);
      selectedIds.add(candidate.id);
    }
  }
  while (selectedRows.length < requested) {
    const candidate = bucketEntries
      .filter(([, bucket]) => bucket.some((question) => !selectedIds.has(question.id)))
      .sort(([leftKey, leftBucket], [rightKey, rightBucket]) => {
        const leftTaken = leftBucket.filter((question) => selectedIds.has(question.id)).length;
        const rightTaken = rightBucket.filter((question) => selectedIds.has(question.id)).length;
        const leftRatio = leftTaken / leftBucket.length;
        const rightRatio = rightTaken / rightBucket.length;
        return leftRatio - rightRatio || leftKey.localeCompare(rightKey);
      })[0];
    if (!candidate) break;
    const [, bucket] = candidate;
    const question = bucket.find((item) => !selectedIds.has(item.id));
    if (!question) break;
    selectedRows.push(question);
    selectedIds.add(question.id);
  }
  return {
    rows: selectedRows,
    metadata: {
      strategy: "stratified-category-option-count",
      seed,
      strata: Object.fromEntries(bucketEntries.map(([key, bucket]) => [key, { population: bucket.length, selected: bucket.filter((question) => selectedIds.has(question.id)).length }])),
    },
  };
};

const selection = selectQuestions(eligibleQuestions, sample);
const selected = selection.rows;

const env = process.env;
const apiKey = env.OPENAI_API_KEY ?? env.AI_API_KEY ?? env.DEEPSEEK_API_KEY;
const baseUrl = env.OPENAI_BASE_URL ?? env.AI_BASE_URL ?? env.DEEPSEEK_BASE_URL ?? "https://api.openai.com/v1";
const model = env.OPENAI_MODEL ?? env.AI_MODEL ?? env.DEEPSEEK_MODEL ?? "gpt-4.1-mini";
if (execute && !apiKey) throw new Error("A configured OpenAI-compatible API key is required with --execute.");

const safeRate = (numerator, denominator) => denominator ? numerator / denominator : null;
const wilson95 = (successes, total) => {
  if (!total) return null;
  const z = 1.959963984540054;
  const p = successes / total;
  const denominator = 1 + (z ** 2 / total);
  const center = (p + (z ** 2 / (2 * total))) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) / total) + (z ** 2 / (4 * total ** 2))) / denominator;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
};

const summarizeRows = (rows) => {
  const answered = rows.filter((row) => row.prediction);
  const correct = rows.filter((row) => row.correct).length;
  const answeredCorrect = answered.filter((row) => row.correct).length;
  const randomExpectedCorrect = rows.reduce((sum, row) => sum + (optionCountOf(row) ? 1 / optionCountOf(row) : 0), 0);
  return {
    total: rows.length,
    answered: answered.length,
    abstainedOrUnparseable: rows.length - answered.length,
    correct,
    coverage: safeRate(answered.length, rows.length),
    allItemAccuracy: safeRate(correct, rows.length),
    allItemAccuracyWilson95: wilson95(correct, rows.length),
    conditionalAccuracy: safeRate(answeredCorrect, answered.length),
    conditionalAccuracyWilson95: wilson95(answeredCorrect, answered.length),
    randomExpectedCorrect,
    randomExpectedAccuracy: safeRate(randomExpectedCorrect, rows.length),
  };
};

if (!execute) {
  console.log(JSON.stringify({
    mode: "dry-run",
    corpus,
    total: selected.length,
    eligibleTotal: eligibleQuestions.length,
    excludedPriorResults: excludedIds.size,
    categories: counts(selected, "category"),
    sampling: selection.metadata,
    contextMode,
    benchmarkMode,
    invariant: "No model request is made unless --execute is supplied.",
  }, null, 2));
  process.exit(0);
}

const generatedModule = resolve(".next-accuracy-audit", `agent-prompt-${process.pid}.mjs`);
const generatedContextModule = resolve(".next-accuracy-audit", `agent-history-context-${process.pid}.mjs`);
await mkdir(dirname(generatedModule), { recursive: true });
try {
  await bundle({
    entryPoints: [resolve("src/lib/agent/chat.ts")],
    outfile: generatedModule,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    tsconfig: resolve("tsconfig.json"),
  });
  await bundle({
    entryPoints: [resolve("src/lib/agent/history-benchmark-context.ts")],
    outfile: generatedContextModule,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    tsconfig: resolve("tsconfig.json"),
  });
  const { buildAgentMessages } = await import(`${pathToFileURL(generatedModule).href}?v=${Date.now()}`);
  const { buildHistoricalBenchmarkContext } = await import(`${pathToFileURL(generatedContextModule).href}?v=${Date.now()}`);

  const answerFrom = (content) => {
    const text = String(content ?? "");
    try {
      const parsed = JSON.parse(text);
      const choice = parsed?.decision?.choice;
      if (typeof choice === "string" && /^[A-E]$/.test(choice)) {
        return { prediction: choice, source: "choice_json" };
      }
      if (parsed?.decision?.choice === null) {
        return { prediction: null, source: "choice_json_abstention" };
      }
    } catch {
      // Narrative output remains supported for baseline comparisons.
    }
    const explicit = [...text.matchAll(/(?:答案|answer|最终选择)\s*[：:]?\s*(?:\*\*)?([A-E])/gi)];
    if (explicit.length) return { prediction: explicit.at(-1)?.[1]?.toUpperCase() ?? null, source: "explicit_answer" };
    if (/^\s*([A-E])\s*$/i.test(text)) return { prediction: text.trim().toUpperCase(), source: "bare_answer" };

    // The product Agent was not designed as a multiple-choice endpoint. Keep
    // semantic recovery conservative: only score an unambiguous, affirmative
    // choice; refusals and multi-candidate rankings remain unparseable.
    const candidates = [
      ...text.matchAll(/(?:若必须[^。\n]{0,80}?(?:择一|选择)|传统推断倾向|最接近(?:的选项)?|最符合(?:盘面信号|[^。\n]{0,30})?|最可能(?:的[^。\n]{0,30})?|职业更接近)\s*(?:的选项)?\s*(?:为|是|：)?\s*(?:\*\*)?([A-E])(?:[.。：、）\s]|$)/g).map((match) => match[1].toUpperCase()),
      ...text.matchAll(/(?:^|[。\n])[^。\n]{0,70}?[（(]([A-E])[）)][^。\n]{0,45}?(?:最符合|最可能|最接近)/g).map((match) => match[1].toUpperCase()),
    ];
    const unique = [...new Set(candidates)];
    return unique.length === 1
      ? { prediction: unique[0], source: "conservative_semantic_recovery" }
      : { prediction: null, source: unique.length > 1 ? "ambiguous" : "refusal_or_no_choice" };
  };
  const makePayload = (question) => {
    const chart = charts.get(question.case_id);
    if (contextMode === "legacy" && !chart && !question.birth_info) throw new Error(`Missing chart context for ${question.id} / ${question.case_id}`);
    const candidateYears = [...new Set(question.options.flatMap((option) => [...String(option.text ?? "").matchAll(/(?:19|20)\d{2}/g)].map((match) => Number(match[0]))))];
    const evaluationQuestion = [
      "这是一道公开历史赛事的离线研究题，不是对现实用户的预测。",
      question.question,
      `选项：${question.options.map((option) => `${option.letter}. ${option.text}`).join("；")}`,
      candidateYears.length ? `选项涉及年份：${candidateYears.join("、")}。必须逐年比较随附时间切片后再选择。` : "选项没有明确年份；不得把当前日期的运势当作题目时点。",
      "请依照正常产品的证据边界进行判断。最后单独一行输出“答案：X”（X 为 A 至 E），便于研究统计。",
    ].join("\n");
    const context = contextMode === "product" || !chart
      ? buildHistoricalBenchmarkContext({ birth: question.birth_info, question: question.question, candidateYears })
      : {
          structuredText: [
            "公开历史赛事的结构化命盘材料（仅作离线回归）：",
            `四柱：${chart.chineseDate ?? "未提供"}`,
            `时辰：${chart.time ?? "未提供"}`,
            "紫微宫位与星曜、以及其余字段见紧凑 JSON。",
          ].join("\n"),
          jsonPayload: JSON.stringify(chart),
        };
    return {
      mode: benchmarkMode,
      question: evaluationQuestion,
      focus: "按用户问题综合取证",
      outputContract: "choice_json_forced",
      structuredText: context.structuredText,
      jsonPayload: context.jsonPayload,
    };
  };
  const ask = async (question) => {
    const response = await fetch(new URL("chat/completions", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(requestTimeoutMs),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: buildAgentMessages(makePayload(question)),
      }),
    });
    if (!response.ok) throw new Error(`Model request failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
    const body = await response.json();
    const content = body.choices?.[0]?.message?.content ?? "";
    return { content: String(content), ...answerFrom(content), returnedModel: body.model ?? model };
  };
  const results = [];
  for (const question of selected) {
    try {
      const answer = await ask(question);
      results.push({ id: question.id, caseId: question.case_id, source: question.source, year: question.year, edition: question.edition, numOptions: optionCountOf(question), category: question.category, expected: question.answer, ...answer, correct: answer.prediction === question.answer });
      console.log(`${results.length}/${selected.length}\t${question.id}\t${answer.prediction ?? "UNPARSEABLE"}\t${question.answer}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown request failure";
      results.push({ id: question.id, caseId: question.case_id, source: question.source, year: question.year, edition: question.edition, numOptions: optionCountOf(question), category: question.category, expected: question.answer, prediction: null, content: "", error: errorMessage, correct: false });
      console.log(`${results.length}/${selected.length}\t${question.id}\tERROR\t${question.answer}\t${errorMessage}`);
    }
  }
  const summary = summarizeRows(results);
  const byCategory = Object.fromEntries(Object.keys(counts(selected, "category")).map((category) => [
    category,
    summarizeRows(results.filter((row) => row.category === category)),
  ]));
  const byEdition = Object.fromEntries([...new Set(selected.map((question) => `${question.source ?? "unknown"}-${question.edition ?? question.year ?? "unknown"}`))].map((edition) => [
    edition,
    summarizeRows(results.filter((row) => `${row.source ?? "unknown"}-${row.edition ?? row.year ?? "unknown"}` === edition)),
  ]));
  const report = {
    corpus,
    evaluatedAt: new Date().toISOString(), model, temperature: 0,
    promptContract: "buildAgentMessages() and product Bazi/Ziwei serializers bundled from the same repository source at evaluation time",
    contextMode,
    benchmarkMode,
    sampling: selection.metadata,
    eligibleTotal: eligibleQuestions.length,
    excludedPriorResults: excludedIds.size,
    ...summary,
    requestFailures: results.filter((row) => row.error).length,
    byCategory,
    byEdition,
    results,
    limitations: [
      "Historical public multiple-choice regression only; not prospective prediction validation.",
      "All-item accuracy counts abstentions/unparseable outputs as non-hits. Conditional accuracy is separately labeled because it is selection-biased.",
      "Random expectation is calculated per item from its actual option count, rather than assuming every item has four options.",
      "This corpus assesses the complete prompt/model/chart-context path, not a causal proof of traditional-method validity.",
    ],
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report, results: undefined, outputPath }, null, 2));
} finally {
  await rm(generatedModule, { force: true });
  await rm(generatedContextModule, { force: true });
}
