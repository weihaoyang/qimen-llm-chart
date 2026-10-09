/**
 * 生日库（姓名与生日库）的导入/导出与合并。
 *
 * 档案存在浏览器 localStorage（`qmdj-birth-library`）；这里只放纯逻辑，
 * 方便导出成 JSON 备份、换设备导入，并在导入时做形状校验与去重合并。
 */
import type { ProfileInput } from "@/lib/profile";

export type BirthProfileEntry = {
  id: string;
  name: string;
  profile: ProfileInput;
};

/** 与 UI 一致的档案上限：超出时保留最新的。 */
export const MAX_BIRTH_PROFILES = 50;

export const BIRTH_LIBRARY_FORMAT = "qmdj-birth-library-v1";

/** 生日库条目的次要信息：`1990-01-01 12:00 · 男 · 农历 · 真太阳时 · 上海`。 */
const GENDER_LABEL: Record<string, string> = { male: "男", female: "女" };
export const formatBirthProfileMeta = (profile: ProfileInput): string => {
  const parts = [profile.datetime.replace("T", " ")];
  if (profile.gender) parts.push(GENDER_LABEL[profile.gender] ?? profile.gender);
  if (profile.calendarMode === "lunar") parts.push("农历");
  if (profile.timeBasis === "true-solar") parts.push("真太阳时");
  const place = profile.location?.city || profile.timeZone;
  if (place) parts.push(place);
  return parts.join(" · ");
};

/**
 * 读取文件文本：优先用 `Blob.text()`；在缺少该 API 的运行环境
 * （如测试用 jsdom）回退到 `FileReader`。
 */
export const readFileText = (file: Blob): Promise<string> => {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
};

export const serializeBirthLibrary = (profiles: BirthProfileEntry[]): string =>
  JSON.stringify(
    {
      format: BIRTH_LIBRARY_FORMAT,
      exportedAt: new Date().toISOString(),
      count: profiles.length,
      profiles,
    },
    null,
    2,
  );

const coerceEntry = (value: unknown): BirthProfileEntry | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const profile = record.profile;
  if (!name || !profile || typeof profile !== "object") return null;
  const id = typeof record.id === "string" && record.id ? record.id : crypto.randomUUID();
  return { id, name, profile: profile as ProfileInput };
};

const readProfileList = (data: unknown): unknown[] | null => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { profiles?: unknown }).profiles)) {
    return (data as { profiles: unknown[] }).profiles;
  }
  return null;
};

/**
 * 解析导出的 JSON：既接受导出的信封（`{ profiles: [...] }`），也接受裸数组。
 * 无法解析或没有档案列表时返回空结果；逐条校验，坏记录只计入 `skipped`。
 */
export const parseBirthLibrary = (raw: string): { entries: BirthProfileEntry[]; skipped: number } => {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { entries: [], skipped: 0 };
  }

  const list = readProfileList(data);
  if (!list) return { entries: [], skipped: 0 };

  const entries: BirthProfileEntry[] = [];
  let skipped = 0;
  for (const item of list) {
    const entry = coerceEntry(item);
    if (entry) entries.push(entry);
    else skipped += 1;
  }
  return { entries, skipped };
};

/** 合并导入档案：同 id 以导入为准，导入项排在前面（最近使用在前），并封顶。 */
export const mergeBirthProfiles = (
  current: BirthProfileEntry[],
  incoming: BirthProfileEntry[],
): BirthProfileEntry[] => {
  const incomingIds = new Set(incoming.map((entry) => entry.id));
  return [...incoming, ...current.filter((entry) => !incomingIds.has(entry.id))].slice(0, MAX_BIRTH_PROFILES);
};
