/**
 * 神数（铁板神数 / 邵子神数）条文库与索引表。
 *
 * 硬约束：本仓**不得自造条文内容**，也不得接入许可不明（无 license / AGPL / 扫描件 OCR）的数据。
 * 因此这里只放三样东西：
 *   1. 来自 `ForceMind/Tieban-Shenshu`（Apache-2.0）的铁板神数索引表与 12000 条条文断词；
 *   2. 由上游表**推出**的缺口/投影（如 `TIEBAN_HEXAGRAM_HOLES`、`deriveCorrectionMaps`），不手工录入；
 *   3. 邵子神数的**编号空间与导入校验**（`SHAOZI_SHENSHU_SOURCE` 等）——仅登记结构，不含条文、不含编号规则。
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

/**
 * 14-8 简表（`HEXAGRAM_MAP`）在其本命数范围 181–930 内缺行的本命数（由上游表推出，非手工录入）。
 *
 * 上游缺口，非本仓偏差：14-8 共 726 键，181–930 共 750 个本命数，缺 24 个；14-9 详表只登记
 * 「初刻 / 正刻」两栏，一刻…六刻时详表落空、退到 14-8，落在这些缺口上即"卦名未匹配"。
 */
export const TIEBAN_HEXAGRAM_HOLES: readonly number[] = (() => {
  const covered = new Set(Object.keys(TIEBAN_HEXAGRAM_TABLE).map(Number));
  const numbers = [...covered];
  if (!numbers.length) return [];
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const holes: number[] = [];
  for (let n = min; n <= max; n += 1) if (!covered.has(n)) holes.push(n);
  return holes;
})();


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

// ---------------------------------------------------------------------------
// 邵子神数：编号空间（条文源未接入，只登记空间与导入校验）
// ---------------------------------------------------------------------------

/**
 * 邵子神数条文编号空间（**不含条文本体，也不含编号规则**）。
 *
 * 结构属事实性描述，可核验来源：
 * - 「邵子条文数从 1111 起至 12888 结束，总共 6144 条」；十二部集按千位分：子集 1000 / 丑集 2000 /
 *   … / 亥集 12000，每集 512 条，又以先天八卦乾一兑二离三震四巽五坎六艮七坤八为序分八类，每类 64 条。
 *   见《陈抟神数秘旨 · 正统邵子神数》公开演算讲义，与周通新《邵子神數》（2018）图书简介。
 * - 本仓**没有**接入任何邵子条文：未找到宽松许可（MIT/ISC/Apache-2.0/CC0/公共领域）的条文本体，
 *   也未获得可核验的「生辰 → 编号」推算法来源，故只登记编号空间与导入通道（`importTieshenTiaowen`）。
 */
export const SHAOZI_SHENSHU_SOURCE = {
  name: "邵子神数（6144 条谱）",
  firstNumber: 1111,
  lastNumber: 12888,
  count: 6144,
  volumes: 12,
  perVolume: 512,
  /** 结构描述来源（非条文本体）。 */
  structureSources: [
    "《陈抟神数秘旨 · 正统邵子神数》演算讲义（公开网页）：「邵子条文数从 1111 起至 12888 结束，总共 6144 条」",
    "周通新《邵子神數》（2018）图书简介：十二部集 子集1000…亥集12000，每集 512 条",
  ],
  /** 条文本体与编号规则均未获得可用来源。 */
  licenseBlocked: true as const,
} as const;

export const SHAOZI_SHENSHU_FIRST_NUMBER = SHAOZI_SHENSHU_SOURCE.firstNumber;
export const SHAOZI_SHENSHU_LAST_NUMBER = SHAOZI_SHENSHU_SOURCE.lastNumber;
export const SHAOZI_SHENSHU_COUNT = SHAOZI_SHENSHU_SOURCE.count;

/** 邵子集名：与铁板同用十二集名，但按千位 1→子集 … 12→亥集（区间 1111–12888）。 */
export const volumeOfShaoziTiaowen = (number: number) => {
  const index = Math.floor(number / 1000) - 1;
  return TIESHEN_VOLUMES[index] ?? "";
};

/** 邵子条文号是否落在登记区间内（区间是外框，6144 条并非区间内每个整数）。 */
export const isShaoziShenshuNumber = (number: number) =>
  Number.isInteger(number) && number >= SHAOZI_SHENSHU_FIRST_NUMBER && number <= SHAOZI_SHENSHU_LAST_NUMBER;

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
    /** 集名换算（缺省用铁板 1001–13000 口径；邵子等异本可传自己的换算）。 */
    volumeOf?: (number: number) => string;
  },
): TieshenTiaowenLibrary => {
  if (!PERMISSIVE_DATA_LICENSES.includes(input.license as (typeof PERMISSIVE_DATA_LICENSES)[number])) {
    throw new Error(`条文库 ${input.id} 的许可 ${input.license} 不在允许列表内，拒绝导入。`);
  }
  const { entries: rawEntries, volumeOf = volumeOfTiaowen, ...meta } = input;
  const entries = new Map<number, TieshenTiaowenEntry>();
  for (const row of rawEntries) {
    if (!Number.isFinite(row.number) || row.number <= 0) continue;
    entries.set(row.number, {
      number: row.number,
      volume: volumeOf(row.number),
      age: row.age ?? "",
      text: row.text ?? "",
    });
  }
  return { ...meta, size: entries.size, entries };
};

/**
 * 邵子神数条文库构建：与铁板同一导入通道，但集名按 1111–12888 / 千位 1→子集…12→亥集 换算，
 * 并校验条文号落在登记区间内（区间外的条目直接丢弃，不猜测、不改造）。
 */
export const createShaoziShenshuLibrary = (
  input: Omit<Parameters<typeof createTieshenTiaowenLibrary>[0], "volumeOf">,
): TieshenTiaowenLibrary =>
  createTieshenTiaowenLibrary({
    ...input,
    volumeOf: volumeOfShaoziTiaowen,
    entries: [...input.entries].filter((row) => isShaoziShenshuNumber(row.number)),
  });


/**
 * 条文库导入接口：把一份 `qmdj-tieshen-tiaowen-v1` 载荷转成本仓的条文库。
 *
 * 邵子神数**没有**可合法使用的条文源，所以这个接口目前只被内置铁板条文库与测试使用；一旦拿到
 * 宽松许可的条文源（或用户自有数据），可直接调用本接口，或对邵子编号空间用 `createShaoziShenshuLibrary`
 * （自动按 1111–12888 校验并换算集名），把结果传给 `buildTieshenChart`。
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
