import { createHash } from "node:crypto";

export const BAZI_RESEARCH_DSL_VERSION = "bazi-axis-rule-v1";
export const BAZI_RESEARCH_RELEASE_VERSION = "bazi-research-release-v1";
export const RESEARCH_AXES = ["ei", "sn", "tf", "jp"] as const;

type Axis = (typeof RESEARCH_AXES)[number];
type Scalar = string | number | boolean | null;
type Json = Scalar | Json[] | { [key: string]: Json };

export type ResearchCondition = {
  field: string;
  op: "equals" | "in" | "gte" | "lte" | "truthy";
  value?: Json;
};

export type ResearchRule = {
  id: string;
  all: ResearchCondition[];
  adjustments: Partial<Record<Axis, number>>;
};

export type ResearchRuleDefinition = {
  dsl_version: typeof BAZI_RESEARCH_DSL_VERSION;
  rules: ResearchRule[];
};

export type ResearchReleaseBundle = {
  release_contract_version: typeof BAZI_RESEARCH_RELEASE_VERSION;
  experiment_id: string;
  rule_hash: string;
  base_prediction_version: string;
  rule_definition: ResearchRuleDefinition;
  validation_metrics: Record<string, Json>;
  published_at_iso: string;
};

const allowedOperators = new Set<ResearchCondition["op"]>(["equals", "in", "gte", "lte", "truthy"]);
const allowedFields = new Set([
  "chart.day_master_strength", "chart.follow_structure", "chart.diagnosis_confidence",
  "chart.audit.engineVersion", "chart.audit.dayMasterElement", "chart.audit.monthCommandElement",
  "chart.audit.supportWeight", "chart.audit.drainWeight", "chart.audit.rootCount", "chart.audit.visibleSupportCount",
  "boundary.sensitive", "boundary.changed_pillar_count", "boundary.window_minutes",
]);
const allowedFieldPrefixes = [
  "chart.audit.elementWeights.", "prediction.base_axes.", "prediction.axis_confidence.",
  "prediction.axis_evidence_count.", "prediction.axis_contradiction_count.",
];

const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!value || typeof value !== "object") throw new Error("研究规则包含不支持的数据类型。");
  const source = value as Record<string, unknown>;
  return `{${Object.keys(source).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(source[key])}`).join(",")}}`;
};

export const researchRuleHash = (basePredictionVersion: string, definition: ResearchRuleDefinition) =>
  createHash("sha256").update(canonicalJson({ base_prediction_version: basePredictionVersion, definition }), "utf8").digest("hex");

const isJson = (value: unknown): value is Json => value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string"
  || (Array.isArray(value) && value.every(isJson))
  && (Array.isArray(value) ? value.length <= 32 : true);

const normalizeRuleValue = (value: unknown, depth = 0): Json => {
  if (depth > 3) throw new Error("规则条件值嵌套过深。");
  if (value === null || typeof value === "boolean" || typeof value === "string" || typeof value === "number") {
    if (typeof value === "string") return value.slice(0, 160);
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("规则条件数值无效。");
    if (typeof value === "number" && Math.abs(value) > 10000) throw new Error("规则条件数值超出范围。");
    return typeof value === "number" ? (Number.isInteger(value) ? value : Number(value.toFixed(8))) : value;
  }
  if (Array.isArray(value) && value.length <= 32 && value.every(isJson)) return value.map((item) => normalizeRuleValue(item, depth + 1));
  throw new Error("规则条件值必须是有限的 JSON 标量或标量数组。");
};

export const validateResearchRuleDefinition = (value: unknown): ResearchRuleDefinition => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("研究规则必须是对象。");
  const input = value as Record<string, unknown>;
  if (input.dsl_version !== BAZI_RESEARCH_DSL_VERSION || !Array.isArray(input.rules) || input.rules.length < 1 || input.rules.length > 20) {
    throw new Error("研究规则必须使用 bazi-axis-rule-v1，且含 1–20 条子规则。");
  }
  const ids = new Set<string>();
  const rules = input.rules.map((rawRule, index): ResearchRule => {
    if (!rawRule || typeof rawRule !== "object" || Array.isArray(rawRule)) throw new Error("子规则格式无效。");
    const rule = rawRule as Record<string, unknown>;
    const id = String(rule.id ?? `rule-${index + 1}`).trim();
    if (!id || id.length > 64 || ids.has(id)) throw new Error("子规则 ID 必须唯一且不超过 64 个字符。");
    ids.add(id);
    if (!Array.isArray(rule.all) || !rule.all.length || rule.all.length > 8 || !rule.adjustments || typeof rule.adjustments !== "object" || Array.isArray(rule.adjustments)) {
      throw new Error("每条子规则必须包含 all 条件和 adjustments 调整。");
    }
    const all = rule.all.map((rawCondition): ResearchCondition => {
      if (!rawCondition || typeof rawCondition !== "object" || Array.isArray(rawCondition)) throw new Error("规则条件格式无效。");
      const condition = rawCondition as Record<string, unknown>;
      const field = String(condition.field ?? "").trim();
      const op = String(condition.op ?? "") as ResearchCondition["op"];
      if (!allowedFields.has(field) && !allowedFieldPrefixes.some((prefix) => field.startsWith(prefix))) throw new Error("规则只能读取已批准的去标识化特征。");
      if (!allowedOperators.has(op) || (op !== "truthy" && !isJson(condition.value))) throw new Error("规则条件不安全或不受支持。");
      return { field, op, value: op === "truthy" ? null : normalizeRuleValue(condition.value) };
    });
    const adjustments: Partial<Record<Axis, number>> = {};
    for (const [axis, rawDelta] of Object.entries(rule.adjustments as Record<string, unknown>)) {
      if (!(RESEARCH_AXES as readonly string[]).includes(axis) || typeof rawDelta !== "number" || !Number.isInteger(rawDelta) || rawDelta < -30 || rawDelta > 30) {
        throw new Error("每轴调整只能是 -30 到 30 的整数。");
      }
      adjustments[axis as Axis] = rawDelta;
    }
    if (!Object.keys(adjustments).length) throw new Error("每条子规则至少需要一个轴调整。");
    return { id, all, adjustments };
  });
  return { dsl_version: BAZI_RESEARCH_DSL_VERSION, rules };
};

const readPath = (snapshot: Record<string, unknown>, path: string): unknown => path.split(".").reduce<unknown>((value, segment) => (
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>)[segment] : undefined
), snapshot);

const matches = (condition: ResearchCondition, snapshot: Record<string, unknown>) => {
  const actual = readPath(snapshot, condition.field);
  if (condition.op === "equals") return actual === condition.value;
  if (condition.op === "in") return Array.isArray(condition.value) && condition.value.slice(0, 32).includes(actual as Json);
  if (condition.op === "gte") return typeof actual === "number" && typeof condition.value === "number" && actual >= condition.value;
  if (condition.op === "lte") return typeof actual === "number" && typeof condition.value === "number" && actual <= condition.value;
  return Boolean(actual);
};

export const applyResearchRules = (
  baseAxes: Record<string, number>, snapshot: Record<string, unknown>, definition: ResearchRuleDefinition,
) => {
  const axes = Object.fromEntries(RESEARCH_AXES.map((axis) => [axis, Math.max(0, Math.min(100, Math.round(baseAxes[axis] ?? 50)))])) as Record<Axis, number>;
  const applied: Array<{ id: string; adjustments: Partial<Record<Axis, number>> }> = [];
  for (const rule of validateResearchRuleDefinition(definition).rules) {
    if (!rule.all.every((condition) => matches(condition, snapshot))) continue;
    const adjustments: Partial<Record<Axis, number>> = {};
    for (const [axis, delta] of Object.entries(rule.adjustments) as Array<[Axis, number]>) {
      const before = axes[axis];
      axes[axis] = Math.max(0, Math.min(100, before + delta));
      adjustments[axis] = axes[axis] - before;
    }
    applied.push({ id: rule.id, adjustments });
  }
  return { axes, applied };
};
