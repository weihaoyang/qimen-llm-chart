import { expect, it } from "vitest";
import { monthGeneralAt } from "./liuren-month-general";
import { buildDaliurenResearch } from "./extensions";

it("changes the month general at the equinox rather than midnight", () => {
  expect(monthGeneralAt(new Date("2024-03-20T10:50:00+08:00"))).toBe("亥");
  expect(monthGeneralAt(new Date("2024-03-20T11:20:00+08:00"))).toBe("戌");
});

it("visits all twelve month generals in order across the year", () => {
  const generals = Array.from({ length: 12 }, (_, month) =>
    monthGeneralAt(new Date(Date.UTC(2024, month, 26))),
  );
  expect(generals).toEqual(["子", "亥", "戌", "酉", "申", "未", "午", "巳", "辰", "卯", "寅", "丑"]);
});

it("switches at each independently published 2026 Hong Kong Observatory major solar term", () => {
  // HKO publishes minute precision in UTC+08; keep three minutes either side, not a claimed exact second.
  const cases = [
    ["大寒", "2026-01-20T09:45:00+08:00", "丑", "子"],
    ["雨水", "2026-02-18T23:52:00+08:00", "子", "亥"],
    ["春分", "2026-03-20T22:46:00+08:00", "亥", "戌"],
    ["谷雨", "2026-04-20T09:39:00+08:00", "戌", "酉"],
    ["小满", "2026-05-21T08:37:00+08:00", "酉", "申"],
    ["夏至", "2026-06-21T16:25:00+08:00", "申", "未"],
    ["大暑", "2026-07-23T03:13:00+08:00", "未", "午"],
    ["处暑", "2026-08-23T10:19:00+08:00", "午", "巳"],
    ["秋分", "2026-09-23T08:05:00+08:00", "巳", "辰"],
    ["霜降", "2026-10-23T17:38:00+08:00", "辰", "卯"],
    ["小雪", "2026-11-22T15:23:00+08:00", "卯", "寅"],
    ["冬至", "2026-12-22T04:50:00+08:00", "寅", "丑"],
  ];
  for (const [term, timestamp, before, after] of cases) {
    const instant = Date.parse(timestamp);
    expect(monthGeneralAt(new Date(instant - 180_000)), `${term}之前`).toBe(before);
    expect(monthGeneralAt(new Date(instant + 180_000)), `${term}之后`).toBe(after);
    for (const [offset, expected] of [[-180_000, before], [180_000, after]] as const) {
      const datetime = new Date(instant + offset).toISOString().slice(0, 16);
      const original = { calendarMode: "solar", datetime, timeZone: "UTC", gender: "male", timeBasis: "civil" } as const;
      const normalized = { datetime, timeZone: "UTC", calendarMode: "solar", timeBasis: "civil" } as const;
      const { text } = buildDaliurenResearch({ original, normalized });
      expect(text, `${term} ${datetime} UTC`).toContain(`月将: ${expected}`);
    }
  }
});
