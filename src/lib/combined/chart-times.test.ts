import { describe, expect, it } from "vitest";
import { normalizeProfileInput } from "@/lib/profile";
import type { ProfileInput } from "@/lib/profile/types";
import { buildQimenChartFromProfile } from "@/lib/qimen/chart";
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

it("keeps the explicit civil question time even when it matches a lunar profile placeholder", () => {
  const input = base({
    calendarMode: "lunar",
    lunar: { year: 1990, month: 4, day: 11, isLeapMonth: false },
    splitChartTimes: true,
    questionDatetime: "1990-05-05T08:00",
  });
  expect(toQimenProfileInput(input)).toMatchObject({
    calendarMode: "solar",
    datetime: input.questionDatetime,
    lunar: undefined,
  });
  const birth = buildQimenChartFromProfile(normalizeProfileInput(input));
  const question = buildQimenChartFromProfile(normalizeProfileInput(toQimenProfileInput(input)));
  expect(birth.interpretedDateTime).toBe("1990-05-05 00:00:00");
  expect(question.interpretedDateTime).toBe("1990-05-05 08:00:00");
});
