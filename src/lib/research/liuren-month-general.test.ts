import { expect, it } from "vitest";
import { monthGeneralAt } from "./liuren-month-general";

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
