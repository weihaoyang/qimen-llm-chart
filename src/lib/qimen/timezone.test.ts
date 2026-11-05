import { describe, expect, it } from "vitest";
import { toZonedDate } from "./timezone";

describe("local time around daylight saving transitions", () => {
  it("selects the first occurrence when the autumn wall time repeats", () => {
    expect(toZonedDate("2024-10-27T02:30", "Europe/Berlin").toISOString()).toBe("2024-10-27T00:30:00.000Z");
    expect(toZonedDate("2024-11-03T01:30", "America/New_York").toISOString()).toBe("2024-11-03T05:30:00.000Z");
  });
  it("uses the new offset after the spring transition", () => {
    expect(toZonedDate("2024-03-10T03:30", "America/New_York").toISOString())
      .toBe("2024-03-10T07:30:00.000Z");
    expect(() => toZonedDate("2024-03-10T02:30", "America/New_York")).toThrow();
  });
});

it("represents midnight as hour zero on the same calendar date", () => {
  expect(toZonedDate("2024-03-20T00:00", "Asia/Shanghai").toISOString())
    .toBe("2024-03-19T16:00:00.000Z");
});

it("does not reinterpret two-digit Gregorian years as twentieth century", () => {
  expect(toZonedDate("0099-01-01T00:00", "UTC").toISOString())
    .toBe("0099-01-01T00:00:00.000Z");
});
