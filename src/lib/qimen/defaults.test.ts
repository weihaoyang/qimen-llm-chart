import { describe, expect, it } from "vitest";
import {
  getDefaultChartInput,
  getDefaultSequenceInput,
  getSelectableTimeZones,
} from "./defaults";

describe("qimen defaults", () => {
  it("uses the current time in the resolved timezone for the default chart input", () => {
    const now = new Date("2026-07-02T09:08:07.000Z");

    expect(getDefaultChartInput(now, "Asia/Shanghai")).toEqual({
      datetime: "2026-07-02T17:08",
      timeZone: "Asia/Shanghai",
    });
  });

  it("uses the current time point for sequence defaults and keeps the same local clock next day", () => {
    const now = new Date("2026-07-02T09:08:07.000Z");

    expect(getDefaultSequenceInput(now, "Asia/Shanghai")).toEqual({
      startDatetime: "2026-07-02T17:08",
      endDatetime: "2026-07-03T17:08",
      timeZone: "Asia/Shanghai",
      step: "double-hour",
    });
  });

  it("keeps the detected timezone visible even when it is outside the preset list", () => {
    expect(
      getSelectableTimeZones("Asia/Seoul", [
        "Asia/Shanghai",
        "Asia/Tokyo",
        "Asia/Seoul",
      ]),
    ).toEqual(["Asia/Seoul", "Asia/Shanghai", "Asia/Tokyo"]);
  });
});
