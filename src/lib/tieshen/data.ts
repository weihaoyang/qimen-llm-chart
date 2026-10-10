/**
 * 神数（铁板神数 / 邵子神数）条文库与索引表。
 *
 * 硬约束：本仓**不得自造条文内容**，也不得接入许可不明（无 license / AGPL / 扫描件 OCR）的数据。
 * 因此这里只放两样东西：
 *   1. 来自 `ForceMind/Tieban-Shenshu`（Apache-2.0）的铁板神数索引表与 12000 条条文断词；
 *   2. 除此之外既不补条文，也不补编号规则——没有来源的部分一律走 `rules.ts` 里的 TODO 与空库降级。
 *
 * 数据文件的来源、许可与"未接入项"见 `./data/SOURCE.md`。
 */

import liunianJson from "./data/liunian.json";
import rulesJson from "./data/rules.json";
import tablesJson from "./data/tables.json";
import tiaowenJson from "./data/tiaowen.json";

/** 本仓允许接入的宽松许可。其它许可（含 AGPL、无 license、来源不明）一律不接。 */
export const PERMISSIVE_DATA_LICENSES = ["MIT", "ISC", "Apache-2.0", "CC0-1.0", "BSD-2-Clause", "BSD-3-Clause"] as const;

export type TieshenSourceInfo = {
  repository: string;
  license: string;
  licenseFile: string;
  commit: string;
  commitDate: string;
  retrievedFiles: readonly string[];
};

const assertPermissive = (source: TieshenSourceInfo, label: string) => {
  if (!PERMISSIVE_DATA_LICENSES.includes(source.license as (typeof PERMISSIVE_DATA_LICENSES)[number])) {
    throw new Error(`神数数据 ${label} 的许可 ${source.license} 不在允许列表（${PERMISSIVE_DATA_LICENSES.join(" / ")}）内，拒绝加载。`);
  }
  return source;
};

export const TIEBAN_DATA_SOURCE = assertPermissive(tablesJson.source as unknown as TieshenSourceInfo, "tables.json");
export const TIEBAN_RULES_SOURCE = assertPermissive(rulesJson.source as unknown as TieshenSourceInfo, "rules.json");
export const TIEBAN_LIUNIAN_SOURCE = assertPermissive(liunianJson.source as unknown as TieshenSourceInfo, "liunian.json");
export const TIEBAN_TIAOWEN_SOURCE = assertPermissive(tiaowenJson.source as unknown as TieshenSourceInfo, "tiaowen.json");

// ---------------------------------------------------------------------------
// 索引表（14-1 ~ 14-14）
// ---------------------------------------------------------------------------

export type TieshenMonthTable = Record<string, number>;
export type TieshenToneTable = Record<string, Record<string, string>>;
export type TieshenDayLifeTable = Record<string, Record<string, number>>;
export type TieshenRuleRow = { 组别: string; 和值条件: string; 刻别: string };
export type TieshenDestinyRow = { base: number; seq: number; offsets: Record<string, number[]> };

const tables = tablesJson.tables as unknown as {
  "14-1": TieshenMonthTable;
  "14-2": TieshenMonthTable;
  "14-3": TieshenToneTable;
  "14-4": TieshenMonthTable;
  "14-5": TieshenDayLifeTable;
  "14-6": TieshenMonthTable;
};

export const TIEBAN_MONTH_TABLE = tables["14-1"];
export const TIEBAN_HOUR_BRANCH_TABLE = tables["14-2"];
export const TIEBAN_TONE_TABLE = tables["14-3"];
export const TIEBAN_TONE_NUMBER_TABLE = tables["14-4"];
export const TIEBAN_DAY_LIFE_TABLE = tables["14-5"];
export const TIEBAN_TIME_LUCK_TABLE = tables["14-6"];

export const TIEBAN_RULE_TABLES = rulesJson.ruleTables as unknown as readonly TieshenRuleRow[];
export const TIEBAN_HEXAGRAM_TABLE = rulesJson.hexagramMap as unknown as Record<string, string>;
export const TIEBAN_HEXAGRAM_DETAIL_TABLE = rulesJson.hexagramDetailMap as unknown as Record<string, string>;
export const TIEBAN_DESTINY_TABLE = rulesJson.destinyData as unknown as Record<string, TieshenDestinyRow>;

export const TIEBAN_LIUNIAN_START_TABLE = liunianJson.liunianStart as unknown as Record<string, number>;
export const TIEBAN_LIUNIAN_SEQ_TABLE = liunianJson.liunianSeq as unknown as Record<string, string[]>;
export const TIEBAN_MARKER_TABLE = liunianJson.markerTable as unknown as Record<string, Record<string, string>>;
export const TIEBAN_LETTER_TABLE = liunianJson.letterTable as unknown as Record<string, string>;
export const TIEBAN_LETTER_ROW_TABLE = liunianJson.dataByLetter as unknown as Record<string, number[]>;

/**
 * 14-14 的两种投影：(条文校正数,岁数) → (基数,加数) 与 → 字母。
 *
 * 上游导出脚本按行序写入，同一「校正数+岁数」被多次覆盖，**末次出现**即最终值；本仓照此复现。
 * 之所以不单独落盘，是为了避免同一张表存三份；已与上游 `db-data.js` 逐键比对一致（1493 键）。
 */
export const deriveCorrectionMaps = (letterRows: Record<string, number[]>) => {
  const byCorrection: Record<string, [number, number]> = {};
  const correctionToLetter: Record<string, string> = {};
  for (const key of Object.keys(letterRows)) {
    const [letter, age] = key.split("|");
    const [base, add, correction] = letterRows[key];
    byCorrection[`${correction}|${age}`] = [base, add];
    correctionToLetter[`${correction}|${age}`] = letter;
  }
  return { byCorrection, correctionToLetter };
};

const correctionMaps = deriveCorrectionMaps(TIEBAN_LETTER_ROW_TABLE);
export const TIEBAN_CORRECTION_ROW_TABLE: Record<string, [number, number]> = correctionMaps.byCorrection;
export const TIEBAN_CORRECTION_LETTER_TABLE: Record<string, string> = correctionMaps.correctionToLetter;

// ---------------------------------------------------------------------------
// 条文库（12000 条断词）
// ---------------------------------------------------------------------------

/** 十二集名，与条文编号区间 1001–13000 一一对应（每集 1000 条）。 */
export const TIESHEN_VOLUMES = ["子集", "丑集", "寅集", "卯集", "辰集", "巳集", "午集", "未集", "申集", "酉集", "戌集", "亥集"] as const;

export type TieshenTiaowenEntry = {
  number: number;
  volume: string;
  age: string;
  text: string;
};

export type TieshenTiaowenLibrary = {
  id: string;
  name: string;
  license: string;
  repository: string;
  commit: string;
  /** 条数（不含空条文）。 */
  size: number;
  entries: ReadonlyMap<number, TieshenTiaowenEntry>;
};

export const TIEBAN_TIAOWEN_FIRST_NUMBER = tiaowenJson.firstNumber;
export const TIEBAN_TIAOWEN_COUNT = tiaowenJson.count;

export const volumeOfTiaowen = (number: number) => {
  const index = Math.floor((number - TIEBAN_TIAOWEN_FIRST_NUMBER) / 1000);
  return TIESHEN_VOLUMES[index] ?? "";
};

/** 外部导入的条文库必须满足的最小合同（邵子神数或其它异本走同一通道）。 */
export type TieshenTiaowenPayload = {
  format: "qmdj-tieshen-tiaowen-v1";
  id: string;
  name: string;
  /** 必须是宽松许可，否则导入接口直接拒绝。 */
  license: string;
  repository?: string;
  commit?: string;
  entries: Array<{ number: number; text: string; age?: string }>;
};

export const createTieshenTiaowenLibrary = (
  input: Pick<TieshenTiaowenLibrary, "id" | "name" | "license" | "repository" | "commit"> & {
    entries: Iterable<{ number: number; text: string; age?: string }>;
  },
): TieshenTiaowenLibrary => {
  if (!PERMISSIVE_DATA_LICENSES.includes(input.license as (typeof PERMISSIVE_DATA_LICENSES)[number])) {
    throw new Error(`条文库 ${input.id} 的许可 ${input.license} 不在允许列表内，拒绝导入。`);
  }
  const entries = new Map<number, TieshenTiaowenEntry>();
  for (const row of input.entries) {
    if (!Number.isFinite(row.number) || row.number <= 0) continue;
    entries.set(row.number, {
      number: row.number,
      volume: volumeOfTiaowen(row.number),
      age: row.age ?? "",
      text: row.text ?? "",
    });
  }
  return { ...input, size: entries.size, entries };
};

/**
 * 条文库导入接口：把一份 `qmdj-tieshen-tiaowen-v1` 载荷转成本仓的条文库。
 *
 * 目前**没有**可合法使用的邵子神数条文源，所以这个接口只被内置铁板条文库与测试使用；
 * 一旦拿到宽松许可的条文源（或用户自有数据），面板可直接把解析结果传给 `buildTieshenChart`。
 */
export const importTieshenTiaowen = (payload: unknown): TieshenTiaowenLibrary => {
  if (!payload || typeof payload !== "object") throw new Error("条文库载荷必须是对象。");
  const value = payload as Partial<TieshenTiaowenPayload>;
  if (value.format !== "qmdj-tieshen-tiaowen-v1") throw new Error("条文库载荷 format 必须是 qmdj-tieshen-tiaowen-v1。");
  if (typeof value.id !== "string" || !value.id) throw new Error("条文库载荷缺少 id。");
  if (typeof value.name !== "string" || !value.name) throw new Error("条文库载荷缺少 name。");
  if (typeof value.license !== "string" || !value.license) throw new Error("条文库载荷缺少 license。");
  if (!Array.isArray(value.entries)) throw new Error("条文库载荷缺少 entries 数组。");
  return createTieshenTiaowenLibrary({
    id: value.id,
    name: value.name,
    license: value.license,
    repository: value.repository ?? "",
    commit: value.commit ?? "",
    entries: value.entries,
  });
};

/** 内置铁板神数条文库（延迟构建：12000 条条目只在首次用到时才解析）。 */
let builtin: TieshenTiaowenLibrary | null = null;

export const getTiebanTiaowenLibrary = (): TieshenTiaowenLibrary => {
  if (builtin) return builtin;
  const rows = tiaowenJson.entries.split("\n").map((line) => {
    const [age, text] = line.split("\t");
    return { age, text };
  });
  builtin = createTieshenTiaowenLibrary({
    id: "tieban-forceMind",
    name: "铁板神数条文断词（12000 条）",
    license: TIEBAN_TIAOWEN_SOURCE.license,
    repository: TIEBAN_TIAOWEN_SOURCE.repository,
    commit: TIEBAN_TIAOWEN_SOURCE.commit,
    entries: rows.map((row, index) => ({ number: TIEBAN_TIAOWEN_FIRST_NUMBER + index, age: row.age, text: row.text })),
  });
  return builtin;
};

/** data.ts 里保留的少量示例条文（完整数据在 `./data/tiaowen.json`）。 */
export const TIEBAN_TIAOWEN_SAMPLE = [
  { number: 1001, volume: "子集", age: "47", text: "一树残花，有枝复茂。" },
  { number: 1005, volume: "子集", age: "11，12", text: "日照纱窗紫艳明，柳阴枝上报新春。" },
  { number: 13000, volume: "亥集", age: "", text: "万象更新，周而复始。" },
] as const satisfies readonly TieshenTiaowenEntry[];

export const lookupTiaowen = (number: number, library: TieshenTiaowenLibrary = getTiebanTiaowenLibrary()) =>
  library.entries.get(number) ?? null;
