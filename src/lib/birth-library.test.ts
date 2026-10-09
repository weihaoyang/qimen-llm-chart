import { describe, expect, it } from "vitest";
import type { ProfileInput } from "@/lib/profile";
import {
  BIRTH_LIBRARY_FORMAT,
  MAX_BIRTH_PROFILES,
  formatBirthProfileMeta,
  mergeBirthProfiles,
  parseBirthLibrary,
  serializeBirthLibrary,
  type BirthProfileEntry,
} from "./birth-library";

const profile = (datetime: string): ProfileInput => ({
  calendarMode: "solar",
  datetime,
  timeZone: "Asia/Shanghai",
  gender: "male",
  timeBasis: "civil",
});

const entry = (id: string, name: string): BirthProfileEntry => ({ id, name, profile: profile("1990-01-01T12:00") });

describe("birth library import/export", () => {
  it("round-trips through the export envelope", () => {
    const profiles = [entry("a", "甲"), entry("b", "乙")];
    const parsed = JSON.parse(serializeBirthLibrary(profiles)) as { format: string; count: number; profiles: unknown[] };
    expect(parsed.format).toBe(BIRTH_LIBRARY_FORMAT);
    expect(parsed.count).toBe(2);

    const result = parseBirthLibrary(serializeBirthLibrary(profiles));
    expect(result.skipped).toBe(0);
    expect(result.entries.map((item) => item.name)).toEqual(["甲", "乙"]);
  });

  it("also accepts a bare array payload", () => {
    const result = parseBirthLibrary(JSON.stringify([entry("a", "甲")]));
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.name).toBe("甲");
  });

  it("counts malformed rows instead of failing the whole import", () => {
    const result = parseBirthLibrary(JSON.stringify([entry("a", "甲"), { name: "" }, { profile: {} }, 42]));
    expect(result.entries.map((item) => item.name)).toEqual(["甲"]);
    expect(result.skipped).toBe(3);
  });

  it("returns an empty result for unparseable input", () => {
    expect(parseBirthLibrary("{not json")).toEqual({ entries: [], skipped: 0 });
    expect(parseBirthLibrary(JSON.stringify({ format: "x" }))).toEqual({ entries: [], skipped: 0 });
  });

  it("mints an id for entries that lack one", () => {
    const result = parseBirthLibrary(JSON.stringify([{ name: "无 id", profile: profile("1990-01-01T12:00") }]));
    expect(result.entries[0]?.id).toBeTruthy();
  });

  it("merges by id, prefers the imported copy, and caps the list", () => {
    const current = [entry("a", "旧甲"), entry("b", "乙")];
    const incoming = [entry("a", "新甲"), entry("c", "丙")];
    const merged = mergeBirthProfiles(current, incoming);
    expect(merged.map((item) => item.name)).toEqual(["新甲", "丙", "乙"]);

    const many = Array.from({ length: MAX_BIRTH_PROFILES + 5 }, (_, index) => entry(`id-${index}`, `名${index}`));
    expect(mergeBirthProfiles([], many)).toHaveLength(MAX_BIRTH_PROFILES);
  });

  it("formats the secondary profile meta line", () => {
    expect(formatBirthProfileMeta(profile("1990-01-01T12:00"))).toBe("1990-01-01 12:00 · 男 · Asia/Shanghai");
    expect(formatBirthProfileMeta({
      ...profile("1990-01-01T12:00"),
      calendarMode: "lunar",
      gender: "female",
      timeBasis: "true-solar",
      location: { city: "上海" },
    })).toBe("1990-01-01 12:00 · 女 · 农历 · 真太阳时 · 上海");
  });
});
