import { describe, expect, it } from "vitest";
import { buildMayaChart } from "./chart";
import { buildDreamspell, dreamspellKin, moonDate } from "./dreamspell";
import { serializeMayaToCompactJson, serializeMayaToStructuredText } from "./serializer";
import { buildTraditionalCalendar, HAAB_MONTHS, julianDayNumber, KICHE_DAY_SIGNS, YUCATEC_DAY_SIGNS } from "./traditional";

describe("traditional maya calendar", () => {
  it("anchors 0.0.0.0.0 at 4 Ajaw 8 Kumkʼu (GMT 584283)", () => {
    expect(julianDayNumber([2012, 12, 21]) - 584283).toBe(1872000);
    expect(YUCATEC_DAY_SIGNS).toHaveLength(20);
    expect(KICHE_DAY_SIGNS).toHaveLength(20);
    expect(HAAB_MONTHS).toHaveLength(19);
  });

  it("converts 2012-12-21 to 13.0.0.0.0 / 4 Ajaw / 3 Kʼankʼin", () => {
    const value = buildTraditionalCalendar("2012-12-21");
    expect(value.longCount.label).toBe("13.0.0.0.0");
    expect(value.longCount.baktun).toBe(13);
    expect(value.tzolkin.number).toBe(4);
    expect(value.tzolkin.yucatec).toBe("Ajaw");
    expect(value.tzolkin.kiche).toBe("Ajpu");
    expect(value.haab.label).toBe("3 Kʼankʼin");
    expect(value.nightLord).toBe(9);
    expect(value.daysSinceEpoch).toBe(1872000);
  });

  it("matches the highland day count anchor 1983-09-16 = 1 Bʼatzʼ", () => {
    const value = buildTraditionalCalendar("1983-09-16");
    expect(value.tzolkin.number).toBe(1);
    expect(value.tzolkin.kiche).toBe("Bʼatzʼ");
    expect(value.tzolkin.yucatec).toBe("Chuwen");
    expect(value.tzolkin.signIndex).toBe(10);
  });

  it("keeps the calendar round inside the 18980-day cycle", () => {
    const value = buildTraditionalCalendar("2026-10-10");
    expect(value.calendarRoundDay).toBeGreaterThanOrEqual(0);
    expect(value.calendarRoundDay).toBeLessThan(18980);
    expect(value.nightLord).toBeGreaterThanOrEqual(1);
    expect(value.nightLord).toBeLessThanOrEqual(9);
  });
});

describe("dreamspell 13:20", () => {
  it("matches the reference kin 164 at 2013-07-26", () => {
    expect(dreamspellKin("2013-07-26")).toBe(164);
    const value = buildDreamspell("2013-07-26");
    expect(value.sealName).toBe("黄种子");
    expect(value.toneName).toBe("银河");
    expect(value.color).toBe("黄");
    expect(value.wavespell).toBe(13);
    expect(value.wavespellStartKin).toBe(157);
  });

  it("matches the widely cited closing signature 2012-12-21 = Kin 207", () => {
    const value = buildDreamspell("2012-12-21");
    expect(value.kin).toBe(207);
    expect(value.sealName).toBe("蓝手");
    expect(value.toneName).toBe("水晶");
    expect(value.castle).toBe(4);
  });

  it("matches the law-of-time reference samples", () => {
    const samples: Array<[string, number, string, string]> = [
      ["1997-07-26", 44, "黄种子", "超频"],
      ["2012-07-26", 59, "蓝风暴", "共振"],
      ["2013-07-26", 164, "黄种子", "银河"],
      ["2014-07-26", 9, "红月", "太阳"],
      ["2018-02-08", 1, "红龙", "磁性"],
    ];
    for (const [date, kin, seal, tone] of samples) {
      const value = buildDreamspell(date);
      expect([date, value.kin, value.sealName, value.toneName]).toEqual([date, kin, seal, tone]);
    }
  });

  it("does not advance the kin across a leap day", () => {
    expect(dreamspellKin("2024-02-28")).toBe(dreamspellKin("2024-02-29"));
    expect(dreamspellKin("2024-03-01")).toBe((dreamspellKin("2024-02-28") % 260) + 1);
  });

  it("derives the five-position oracle from seal and tone", () => {
    const value = buildDreamspell("2013-07-26");
    const roles = value.oracle.map((position) => position.role);
    expect(roles).toEqual(["主印记", "支持", "引导", "挑战", "隐藏推动"]);
    const [main, support, guide, challenge, occult] = value.oracle;
    expect(main.seal).toBe(4);
    expect(support.seal).toBe(15);
    expect(guide.seal).toBe(8);
    expect(challenge.seal).toBe(14);
    expect(occult.seal).toBe(17);
    expect(occult.tone).toBe(6);
  });
});

describe("dreamspell 13-moon calendar", () => {
  it("places 1985-07-23 in moon 13, day 27, week 4 (plasma Limi)", () => {
    const moon = moonDate("1985-07-23");
    expect(moon).toMatchObject({ moon: 13, day: 27, week: 4, dayOfWeek: 6, plasma: "Limi" });
    expect(moon.outOfTime).toBe(false);
  });

  it("treats Feb 28 and Feb 29 of a leap year as the same moon day", () => {
    expect(moonDate("2020-02-28")).toMatchObject({ moon: 8, day: 22, week: 4 });
    expect(moonDate("2020-02-29")).toMatchObject({ moon: 8, day: 22, week: 4 });
  });

  it("marks 25 July as the day out of time", () => {
    expect(moonDate("2026-07-25").outOfTime).toBe(true);
    expect(moonDate("2026-07-26")).toMatchObject({ moon: 1, day: 1, outOfTime: false });
  });
});

describe("maya chart", () => {
  it("assembles both systems and serializes them", () => {
    const chart = buildMayaChart("2012-12-21");
    expect(chart.format).toBe("qmdj-maya-v1");
    expect(chart.correlation).toBe(584283);
    expect(chart.traditional.longCount.label).toBe("13.0.0.0.0");
    expect(chart.dreamspell.kin).toBe(207);

    const text = serializeMayaToStructuredText(chart);
    expect(text).toContain("13.0.0.0.0");
    expect(text).toContain("Kin 207");
    expect(text).toContain("13:20");

    const payload = JSON.parse(serializeMayaToCompactJson(chart)) as { format: string; traditional: { longCount: string }; dreamspell: { kin: number } };
    expect(payload.format).toBe("qmdj-maya-v1");
    expect(payload.traditional.longCount).toBe("13.0.0.0.0");
    expect(payload.dreamspell.kin).toBe(207);
  });

  it("accepts a long ISO datetime by using its date part", () => {
    const chart = buildMayaChart("1990-05-20T08:30");
    expect(chart.date).toBe("1990-05-20");
    expect(chart.dreamspell.kin).toBeGreaterThan(0);
  });
});
