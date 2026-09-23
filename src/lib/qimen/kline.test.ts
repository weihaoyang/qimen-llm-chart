import { describe, expect, it } from "vitest";
import { buildQimenKline } from "./kline";
import type { ChartSequenceItem } from "./sequence";

const chart = (overrides: Record<string, unknown> = {}) => ({
  engine: "3meta",
  input: { datetime: "2026-08-01T10:00", timeZone: "Asia/Shanghai" },
  interpretedDateTime: "2026-08-01T10:00",
  hiddenStemsByPalace: {},
  palaceMap: {},
  raw: {
    timeInfo: { solarTerm: "大暑" },
    palaces: [
      { position: 1, trigram: "坎", gate: "生门", deity: "六合", isZhiFu: true, isZhiShi: false, isPostHorse: false, voidness: { hasVoidness: false }, gatePressure: "无", status: { gate: "旺", star: "相" } },
      { position: 2, trigram: "坤", gate: "死门", deity: "白虎", isZhiFu: false, isZhiShi: true, isPostHorse: true, voidness: { hasVoidness: true }, gatePressure: "门迫", status: { gate: "囚", star: "死" } },
    ],
    ...overrides,
  },
}) as unknown as ChartSequenceItem["chart"];

describe("buildQimenKline", () => {
  it("is deterministic and preserves evidence/prediction for every sequence point", () => {
    const sequence = [0, 1, 2].map((index) => ({ index, input: { datetime: `2026-08-0${index + 1}T10:00`, timeZone: "Asia/Shanghai" }, chart: chart() })) as ChartSequenceItem[];
    const first = buildQimenKline(sequence, "life");
    const second = buildQimenKline(sequence, "life");
    expect(first).toEqual(second);
    expect(first.points).toHaveLength(3);
    expect(first.points.every((point) => point.evidence.length > 0 && point.prediction.length > 0)).toBe(true);
    first.points.forEach((point, index) => {
      expect(point.low).toBeLessThanOrEqual(Math.min(point.open, point.close));
      expect(point.high).toBeGreaterThanOrEqual(Math.max(point.open, point.close));
      expect(point.low).toBeGreaterThanOrEqual(0);
      expect(point.high).toBeLessThanOrEqual(100);
      expect(point.open).toBe(index === 0 ? 50 : first.points[index - 1].close);
    });
  });

  it("requires at least two charts", () => {
    expect(buildQimenKline([], "relationship").points).toEqual([]);
  });

  it("uses 乙庚落宫和值使宫作为关系主轴，而不是九宫平均分", () => {
    const relationshipChart = chart({
      zhiFu: { position: 6, star: "天心" },
      zhiShi: { position: 3, gate: "开门" },
      palaces: [
        { position: 3, trigram: "震", heavenlyStem: "乙", earthlyStem: "丙", earthBranch: "卯", gate: "开门", star: "天辅", deity: "六合", isZhiFu: false, isZhiShi: true, isPostHorse: false, voidness: { hasVoidness: false }, gatePressure: "无", status: { gate: "旺", star: "相" } },
        { position: 6, trigram: "乾", heavenlyStem: "庚", earthlyStem: "戊", earthBranch: "酉", gate: "休门", star: "天心", deity: "太阴", isZhiFu: true, isZhiShi: false, isPostHorse: false, voidness: { hasVoidness: false }, gatePressure: "无", status: { gate: "旺", star: "相" } },
      ],
    });
    const sequence = [0, 1].map((index) => ({ index, input: { datetime: `2026-08-0${index + 1}T10:00`, timeZone: "Asia/Shanghai" }, chart: relationshipChart })) as ChartSequenceItem[];
    const result = buildQimenKline(sequence, "relationship", "double-hour");

    expect(result.points[0].evidence.join("\n")).toContain("乙在3宫，庚在6宫");
    expect(result.points[0].evidence.join("\n")).toContain("值使开门在3宫");
    expect(result.points[0].score).toBeGreaterThan(50);
  });

  it("applies distinct deterministic profiles to the four relationship time scales", () => {
    const relationshipChart = chart({
      zhiFu: { position: 6, star: "天心" },
      zhiShi: { position: 3, gate: "开门" },
      palaces: [
        { position: 3, trigram: "震", heavenlyStem: "乙", earthlyStem: "丙", earthBranch: "卯", gate: "开门", star: "天辅", deity: "六合", isZhiFu: false, isZhiShi: true, isPostHorse: false, voidness: { hasVoidness: false }, gatePressure: "无", status: { gate: "旺", star: "相" } },
        { position: 6, trigram: "乾", heavenlyStem: "庚", earthlyStem: "戊", earthBranch: "酉", gate: "伤门", star: "天柱", deity: "白虎", isZhiFu: true, isZhiShi: false, isPostHorse: false, voidness: { hasVoidness: false }, gatePressure: "门迫", status: { gate: "囚", star: "死" } },
      ],
    });
    const sequence = [0, 1].map((index) => ({ index, input: { datetime: `2026-08-0${index + 1}T10:00`, timeZone: "Asia/Shanghai" }, chart: relationshipChart })) as ChartSequenceItem[];
    const scores = (["double-hour", "day", "month", "year"] as const).map((scale) => buildQimenKline(sequence, "relationship", scale).points[0].score);

    expect(new Set(scores).size).toBeGreaterThan(1);
    expect(buildQimenKline(sequence, "relationship", "month")).toEqual(buildQimenKline(sequence, "relationship", "month"));
  });

  // `palaceStructureSignal` used to `JSON.stringify` the whole 十干克应 object and
  // substring-search it for 生/合/克/刑. A serialized object also carries its keys
  // and `params`, so any of those containing one of the four characters flipped
  // the signal on regardless of the actual relation. These two cases pin the
  // signal to `relation`/`description` only.
  describe("十干克应 生克判定", () => {
    const neutralPalace = (position: number, stem: string, tenStemResponse: unknown) => ({
      position,
      trigram: "震",
      heavenlyStem: stem,
      earthlyStem: "丙",
      earthBranch: "卯",
      gate: "开门",
      star: "天辅",
      deity: "六合",
      isZhiFu: false,
      isZhiShi: false,
      isPostHorse: false,
      voidness: { hasVoidness: false },
      gatePressure: "无",
      // Neutral 旺衰/格局 so the only possible reason is the 十干克应 one.
      status: { gate: "", star: "" },
      tenStemResponse,
    });
    const evidenceFor = (palaces: unknown[]) => {
      const relationshipChart = chart({
        zhiFu: { position: 6, star: "天心" },
        zhiShi: { position: 3, gate: "开门" },
        palaces,
      });
      const sequence = [0, 1].map((index) => ({ index, input: { datetime: `2026-08-0${index + 1}T10:00`, timeZone: "Asia/Shanghai" }, chart: relationshipChart })) as ChartSequenceItem[];
      return buildQimenKline(sequence, "relationship", "double-hour").points[0].evidence.join("\n");
    };

    it("不被键名/params 里的生合克刑字样误触发", () => {
      const decoy = {
        heavenlyToEarthly: { relation: "无", params: { 生合: true } },
        timeToDay: { relation: "无", params: { 克刑: true } },
        heavenlyToDay: { relation: "无" },
      };
      const evidence = evidenceFor([
        neutralPalace(3, "乙", decoy),
        neutralPalace(6, "庚", decoy),
      ]);
      expect(evidence).not.toContain("干支关系有生合");
      expect(evidence).not.toContain("干支关系有克刑");
    });

    it("description 里的字样仍然计入", () => {
      const described = {
        heavenlyToEarthly: { relation: "无", description: "有合意，可生发" },
        timeToDay: { relation: "无" },
        heavenlyToDay: { relation: "无" },
      };
      expect(evidenceFor([neutralPalace(3, "乙", described), neutralPalace(6, "庚", described)]))
        .toContain("干支关系有生合");
    });

    it("relation 命中时才给出对应理由", () => {
      const generating = {
        heavenlyToEarthly: { relation: "生我" },
        timeToDay: { relation: "无" },
        heavenlyToDay: { relation: "无" },
      };
      expect(evidenceFor([neutralPalace(3, "乙", generating), neutralPalace(6, "庚", generating)]))
        .toContain("干支关系有生合");
    });
  });
});
