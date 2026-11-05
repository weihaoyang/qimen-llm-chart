import { describe, expect, it } from "vitest";
import { normalizeProfileInput } from "./normalize";

describe("normalizeProfileInput", () => {
  it("preserves four-digit years in historical lunar conversions", () => {
    const result = normalizeProfileInput({
      calendarMode: "lunar",
      datetime: "2000-01-01T00:00",
      timeZone: "UTC",
      gender: "male",
      timeBasis: "civil",
      lunar: { year: 99, month: 6, day: 1, isLeapMonth: false },
    });
    expect(result.normalized.datetime).toBe("0099-07-07T00:00");
  });
  it("normalizes a solar civil-time input into a stable interpreted datetime", () => {
    const result = normalizeProfileInput({
      calendarMode: "solar",
      datetime: "2026-07-03T11:30",
      timeZone: "Asia/Shanghai",
      gender: "male",
      timeBasis: "civil",
      solar: { year: 2026, month: 7, day: 3, hour: 11, minute: 30 },
    });

    expect(result.normalized.datetime).toBe("2026-07-03T11:30");
    expect(result.normalized.timeZone).toBe("Asia/Shanghai");
  });

  it("converts a lunar input into the matching solar local datetime", () => {
    const result = normalizeProfileInput({
      calendarMode: "lunar",
      datetime: "2000-01-01T00:00",
      timeZone: "Asia/Shanghai",
      gender: "female",
      timeBasis: "civil",
      lunar: {
        year: 2026,
        month: 5,
        day: 19,
        isLeapMonth: false,
        hour: 11,
        minute: 30,
      },
    });

    expect(result.normalized.datetime).toBe("2026-07-03T11:30");
    expect(result.normalized.calendarMode).toBe("lunar");
  });

  it("respects leap-month lunar input when converting to solar datetime", () => {
    const result = normalizeProfileInput({
      calendarMode: "lunar",
      datetime: "2000-01-01T00:00",
      timeZone: "Asia/Shanghai",
      gender: "male",
      timeBasis: "civil",
      lunar: {
        year: 2025,
        month: 6,
        day: 1,
        isLeapMonth: true,
        hour: 9,
        minute: 15,
      },
    });

    expect(result.normalized.datetime).toBe("2025-07-25T09:15");
  });

  it("applies true-solar correction from timezone meridian and longitude", () => {
    const result = normalizeProfileInput({
      calendarMode: "solar",
      datetime: "2026-07-03T11:30",
      timeZone: "Asia/Shanghai",
      gender: "male",
      timeBasis: "true-solar",
      solar: { year: 2026, month: 7, day: 3, hour: 11, minute: 30 },
      location: { longitude: 116.4 },
    });

    expect(result.normalized.datetime).toBe("2026-07-03T11:12");
    expect(result.normalized.timeBasis).toBe("true-solar");
  });
});

it("applies apparent solar correction on the wall clock without a second DST jump", () => {
  const input = { calendarMode: "solar", datetime: "2024-03-10T03:05", timeZone: "America/New_York", gender: "male" } as const;
  const result = normalizeProfileInput({
    ...input,
    timeBasis: "true-solar",
    location: { longitude: -75, latitude: 40 },
  });
  expect(result.normalized.datetime).toBe("2024-03-10T01:54");
});
