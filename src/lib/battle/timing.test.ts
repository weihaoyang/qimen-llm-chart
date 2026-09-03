import { describe, expect, it } from "vitest";
import { buildBattleTiming } from "./timing";

describe("buildBattleTiming", () => {
  it("builds a traceable current-time qimen snapshot", () => {
    const result = buildBattleTiming(new Date("2026-09-01T04:00:00.000Z"), "Asia/Shanghai");

    expect(result.isViewed).toBe(true);
    expect(result.solarTerm).toBe("处暑");
    expect(result.lunarDate).toBe("二〇二六年七月二十");
    expect(result.qiMenChart).toMatchObject({
      gong: "兑7宫",
      door: "死门",
      star: "天芮",
      deity: "值符",
      elementEnergy: "金",
    });
    expect(result.provenance).toMatchObject({
      source: "server_qimen_chart",
      calculatedAt: "2026-09-01T04:00:00.000Z",
      localDateTime: "2026-09-01T12:00",
      timeZone: "Asia/Shanghai",
      engine: "3meta",
      engineVersion: "3meta-current-time-v1",
      dunType: "阴遁",
      juNumber: 7,
    });
  });

  it("rejects an invalid IANA timezone", () => {
    expect(() => buildBattleTiming(new Date("2026-09-01T04:00:00.000Z"), "Invalid/Zone"))
      .toThrow();
  });
});
