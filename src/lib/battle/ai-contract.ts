export type BattleAiKind = "interview" | "cards" | "red_team" | "breakthrough" | "review";

const objectValue = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const nonEmptyText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const probability = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const percentage = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
const arrayOfObjects = (value: unknown) => Array.isArray(value) && value.every(objectValue);

export function parseBattleAiJson(value: string) {
  try {
    const parsed = JSON.parse(value.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
    return objectValue(parsed) ? parsed : null;
  } catch { return null; }
}

export function validateBattleAiResult(kind: BattleAiKind, value: Record<string, unknown> | null): string | null {
  if (!value) return "模型没有返回合法 JSON 对象。";
  if (kind === "interview") {
    if (!nonEmptyText(value.assistantMessage)) return "assistantMessage 必须是非空文本。";
    if (!arrayOfObjects(value.extractedFacts)) return "extractedFacts 必须是对象数组。";
    if (!arrayOfObjects(value.extractedConstraints)) return "extractedConstraints 必须是对象数组。";
    if (!arrayOfObjects(value.updatedFields)) return "updatedFields 必须是对象数组。";
    if (!nonEmptyText(value.nextQuestion)) return "nextQuestion 必须是非空文本。";
    if (!probability(value.confidence)) return "confidence 必须是 0 到 1 之间的数字。";
    for (const item of value.extractedFacts) if (!nonEmptyText(item.content) || !percentage(item.confidence)) return "事实候选必须包含 content 和 0 到 100 的 confidence。";
    for (const item of value.extractedConstraints) if (!nonEmptyText(item.label) || !nonEmptyText(item.description)) return "约束候选必须包含 label 和 description。";
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
    return null;
  }
  for (const key of ["summary", "facts", "whatChanged", "nextAdjustment"] as const) if (!nonEmptyText(value[key])) return `${key} 必须是非空文本。`;
  return objectValue(value.diagnosis) ? null : "diagnosis 必须是 JSON 对象。";
}
