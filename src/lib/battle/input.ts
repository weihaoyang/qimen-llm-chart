import { BATTLE_STATUSES, CONSTRAINT_KINDS, FACT_KINDS, INVENTORY_CATEGORIES, MOVE_KINDS } from "./types";

export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const isIn = <T extends readonly string[]>(value: unknown, values: T): value is T[number] => typeof value === "string" && values.includes(value);
export const isBattleStatus = (value: unknown) => isIn(value, BATTLE_STATUSES);
export const isFactKind = (value: unknown) => isIn(value, FACT_KINDS);
export const isConstraintKind = (value: unknown) => isIn(value, CONSTRAINT_KINDS);
export const isInventoryCategory = (value: unknown) => isIn(value, INVENTORY_CATEGORIES);
export const isMoveKind = (value: unknown) => isIn(value, MOVE_KINDS);
export const asText = (value: unknown, max: number, required = true) => typeof value === "string" && value.trim().length >= (required ? 1 : 0) && value.length <= max ? value.trim() : null;
export const asOptionalText = (value: unknown, max: number) => value === undefined || value === null ? "" : asText(value, max, false);
export const asDate = (value: unknown) => value === null || value === undefined ? null : typeof value === "string" && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : undefined;
export const asRecord = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const isStorageReference = (value: unknown): value is string => typeof value === "string" && value.length <= 512 && (value.startsWith("https://") || value.startsWith("s3://") || value.startsWith("gs://") || value.startsWith("azure://"));
