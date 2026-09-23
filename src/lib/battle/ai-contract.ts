export type BattleAiKind = "interview" | "cards" | "red_team" | "breakthrough" | "review";

const objectValue = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const nonEmptyText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const probability = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const percentage = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
const arrayOfObjects = (value: unknown) => Array.isArray(value) && value.every(objectValue);

/**
 * Bounds on the structured result, applied to the whole object rather than to
 * named fields.
 *
 * The result is stored verbatim in `battle_ai_jobs.result` and rendered by the
 * client, so an unbounded value is a storage and rendering problem regardless of
 * which field it hides in. `MAX_TEXT_LENGTH` matches the cap the routes already
 * apply to user-supplied text (`asText(body?.question, 6000)`), so a model
 * answer is bounded by the same order of magnitude as the question it answers.
 */
const MAX_TEXT_LENGTH = 6_000;
const MAX_ARRAY_ITEMS = 40;
const MAX_OBJECT_KEYS = 40;
const MAX_DEPTH = 6;

/**
 * Whether an item carries anything a reader could actually see.
 *
 * The arrays whose schema this contract does not own — `updatedFields`,
 * `phases`, `strategies`, `actions` — are opaque to the server and rendered
 * generically. An item like `{}` or `{ weight: 3 }` is what "畸形但为对象" looks
 * like in practice, and it reaches the database as if it were a real answer.
 * Rather than invent field names no caller agreed to, the rule is the minimum a
 * renderer needs: at least one non-empty string somewhere inside the item.
 */
const carriesText = (value: unknown, depth = 0): boolean => {
  if (typeof value === "string") return value.trim().length > 0;
  if (depth >= 3) return false;
  if (Array.isArray(value)) return value.some((item) => carriesText(item, depth + 1));
  if (objectValue(value)) return Object.values(value).some((field) => carriesText(field, depth + 1));
  return false;
};

const everyItemCarriesText = (value: unknown) =>
  Array.isArray(value) && value.every((item) => objectValue(item) && carriesText(item));

/**
 * The first balanced `{...}` span in `text`, or `null`.
 *
 * String literals and escapes are tracked so a brace inside a value does not
 * close the span early — which matters because the payload is model-authored
 * prose that routinely quotes braces.
 */
const extractBalancedObject = (text: string): string | null => {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
};

/** The body of the first Markdown code fence, if the text contains one. */
const stripCodeFence = (text: string) => {
  const match = text.match(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)```/);
  return (match ? match[1] : text).trim();
};

const parseJson = (text: string): { ok: true; value: unknown } | { ok: false } => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
};

/**
 * Recover the result object from whatever the model actually returned.
 *
 * The previous implementation stripped a fence anchored to the start and end of
 * the string, so anything a model does routinely — a sentence of preamble, a
 * closing remark, an unlabelled fence, a fence it forgot to close — failed to
 * parse and the paid turn ended in a 500.
 *
 * The order matters: a text that *is* valid JSON is taken at face value, so a
 * top-level array or a bare string is still rejected rather than having an object
 * scavenged out of it. Only text that does not parse at all falls through to the
 * scan.
 */
export function parseBattleAiJson(value: string) {
  const trimmed = value.trim();

  const direct = parseJson(trimmed);
  if (direct.ok) return objectValue(direct.value) ? direct.value : null;

  const unfenced = stripCodeFence(trimmed);
  const unfencedParsed = parseJson(unfenced);
  if (unfencedParsed.ok) return objectValue(unfencedParsed.value) ? unfencedParsed.value : null;

  const extracted = extractBalancedObject(unfenced);
  if (extracted === null) return null;
  const extractedParsed = parseJson(extracted);
  return extractedParsed.ok && objectValue(extractedParsed.value) ? extractedParsed.value : null;
}

/** Reject a value that is too deep, too long or too wide to store and render. */
const describeUnboundedJson = (value: unknown, path = "$", depth = 0): string | null => {
  if (depth > MAX_DEPTH) return `结果嵌套层级超过 ${MAX_DEPTH} 层。`;
  if (typeof value === "string") {
    return value.length > MAX_TEXT_LENGTH ? `${path} 超过 ${MAX_TEXT_LENGTH} 字。` : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? null : `${path} 含非有限数字。`;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) return `${path} 超过 ${MAX_ARRAY_ITEMS} 项。`;
    for (let index = 0; index < value.length; index += 1) {
      const violation = describeUnboundedJson(value[index], `${path}[${index}]`, depth + 1);
      if (violation) return violation;
    }
    return null;
  }
  if (objectValue(value)) {
    const keys = Object.keys(value);
    if (keys.length > MAX_OBJECT_KEYS) return `${path} 超过 ${MAX_OBJECT_KEYS} 个字段。`;
    for (const key of keys) {
      const violation = describeUnboundedJson(value[key], `${path}.${key}`, depth + 1);
      if (violation) return violation;
    }
    return null;
  }
  return null;
};

const validateKindShape = (kind: BattleAiKind, value: Record<string, unknown>): string | null => {
  if (kind === "interview") {
    if (!nonEmptyText(value.assistantMessage)) return "assistantMessage 必须是非空文本。";
    if (!arrayOfObjects(value.extractedFacts)) return "extractedFacts 必须是对象数组。";
    if (!arrayOfObjects(value.extractedConstraints)) return "extractedConstraints 必须是对象数组。";
    if (!arrayOfObjects(value.updatedFields)) return "updatedFields 必须是对象数组。";
    if (!nonEmptyText(value.nextQuestion)) return "nextQuestion 必须是非空文本。";
    if (!probability(value.confidence)) return "confidence 必须是 0 到 1 之间的数字。";
    for (const item of value.extractedFacts) if (!nonEmptyText(item.content) || !percentage(item.confidence)) return "事实候选必须包含 content 和 0 到 100 的 confidence。";
    for (const item of value.extractedConstraints) if (!nonEmptyText(item.label) || !nonEmptyText(item.description)) return "约束候选必须包含 label 和 description。";
    if (!everyItemCarriesText(value.updatedFields)) return "updatedFields 的每一项都必须至少包含一处可展示文本。";
    return null;
  }
  if (kind === "cards") {
    if (!arrayOfObjects(value.cards)) return "cards 必须是对象数组。";
    for (const card of value.cards) if (!nonEmptyText(card.title ?? card.label) || !nonEmptyText(card.description ?? card.content)) return "每张底牌必须包含标题和描述。";
    return null;
  }
  if (kind === "red_team") {
    for (const key of ["critique", "biasWarning", "fatalVulnerability", "suggestedFocus"] as const) if (!nonEmptyText(value[key])) return `${key} 必须是非空文本。`;
    return probability(value.failureProbability) ? null : "failureProbability 必须是 0 到 1 之间的数字。";
  }
  if (kind === "breakthrough") {
    for (const key of ["phases", "strategies", "actions"] as const) if (!arrayOfObjects(value[key])) return `${key} 必须是对象数组。`;
    if (!Array.isArray(value.stopConditions) || !value.stopConditions.every(nonEmptyText)) return "stopConditions 必须是非空文本数组。";
    // The three arrays above are persisted and rendered opaquely, so an item with
    // nothing displayable in it would be stored as though it were an answer.
    for (const key of ["phases", "strategies", "actions"] as const) if (!everyItemCarriesText(value[key])) return `${key} 的每一项都必须至少包含一处可展示文本。`;
    return null;
  }
  for (const key of ["summary", "facts", "whatChanged", "nextAdjustment"] as const) if (!nonEmptyText(value[key])) return `${key} 必须是非空文本。`;
  return objectValue(value.diagnosis) ? null : "diagnosis 必须是 JSON 对象。";
};

export function validateBattleAiResult(kind: BattleAiKind, value: Record<string, unknown> | null): string | null {
  if (!value) return "模型没有返回合法 JSON 对象。";
  const shapeError = validateKindShape(kind, value);
  if (shapeError) return shapeError;
  return describeUnboundedJson(value);
}
