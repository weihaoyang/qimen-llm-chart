import { describe, expect, it } from "vitest";
import type { ProfileInput } from "@/lib/profile/types";
import { resolveQimenDatetime, toQimenProfileInput } from "./chart-times";

const base = (overrides: Partial<ProfileInput> = {}): ProfileInput => ({
  calendarMode: "solar",
  datetime: "1990-05-05T08:00",
  timeZone: "Asia/Shanghai",
  gender: "male",
  timeBasis: "civil",
  ...overrides,
});

describe("resolveQimenDatetime", () => {
  it("shares the birth time when the split is off or unset", () => {
    expect(resolveQimenDatetime(base())).toBe("1990-05-05T08:00");
    expect(resolveQimenDatetime(base({ splitChartTimes: true }))).toBe("1990-05-05T08:00");
    expect(resolveQimenDatetime(base({ questionDatetime: "2026-10-10T15:30" }))).toBe("1990-05-05T08:00");
  });

  it("uses the question time only when the split is on and a time is given", () => {
    expect(resolveQimenDatetime(base({ splitChartTimes: true, questionDatetime: "2026-10-10T15:30" }))).toBe("2026-10-10T15:30");
  });
});

describe("toQimenProfileInput", () => {
  it("returns the same input when the time is shared (so callers can reuse the normalized profile)", () => {
    const input = base();
    expect(toQimenProfileInput(input)).toBe(input);
  });

  it("forces a solar datetime and drops lunar state when the question time differs", () => {
    const input = base({
      calendarMode: "lunar",
      lunar: { year: 1990, month: 4, day: 11, isLeapMonth: false },
      splitChartTimes: true,
      questionDatetime: "2026-10-10T15:30",
    });
    const resolved = toQimenProfileInput(input);
    expect(resolved.calendarMode).toBe("solar");
    expect(resolved.datetime).toBe("2026-10-10T15:30");
    expect(resolved.lunar).toBeUndefined();
  });
});
