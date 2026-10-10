import { describe, expect, it } from "vitest";
import { JIAZI } from "3meta";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildLiurenChart, julianDayAt } from "./chart";
import { DI_ZHI, JI_GONG, SHEN_JIANG, liuQin, xunAndKong, xunDun, yueJiangFromSunLongitude } from "./data";
import { GE_NAMES, SANCHUAN_TABLE } from "./sanchuan-table";
import { serializeLiurenToCompactJson, serializeLiurenToStructuredText } from "./serializer";

const profile = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return normalizeProfileInput(input);
};

describe("liuren tables", () => {
  it("ships the sixty day-cycle and the twelve generals", () => {
    expect(JIAZI).toHaveLength(60);
    expect(DI_ZHI).toHaveLength(12);
    expect(SHEN_JIANG).toHaveLength(12);
    expect(GE_NAMES).toHaveLength(11);
    expect(Object.keys(JI_GONG)).toHaveLength(10);
  });

  it("derives the month general from the sun's longitude (中气换将)", () => {
    expect(yueJiangFromSunLongitude(340)).toBe(11); // 雨水后：登明亥
    expect(yueJiangFromSunLongitude(345)).toBe(11); // 惊蛰（未过春分）
    expect(yueJiangFromSunLongitude(0)).toBe(10); // 春分：河魁戌
    expect(yueJiangFromSunLongitude(120)).toBe(6); // 大暑：胜光午
    expect(yueJiangFromSunLongitude(270)).toBe(1); // 冬至：大吉丑
    expect(yueJiangFromSunLongitude(315)).toBe(0); // 立春：神后子
  });

  it("computes the xun head, the void branches and the xun dun", () => {
    expect(xunAndKong(JIAZI, "甲子")).toEqual({ xunShou: "甲子", kong: ["戌", "亥"] });
    expect(xunAndKong(JIAZI, "癸酉")).toEqual({ xunShou: "甲子", kong: ["戌", "亥"] });
    expect(xunAndKong(JIAZI, "甲戌")).toEqual({ xunShou: "甲戌", kong: ["申", "酉"] });
    // 末旬（甲寅旬）的旬空回绕到最初两支
    expect(xunAndKong(JIAZI, "甲寅")).toEqual({ xunShou: "甲寅", kong: ["子", "丑"] });
    expect(xunAndKong(JIAZI, "癸亥")).toEqual({ xunShou: "甲寅", kong: ["子", "丑"] });
    expect(xunDun("甲子")).toMatchObject({ 子: "甲", 丑: "乙", 酉: "癸" });
    expect(xunDun("甲子")["戌"]).toBeUndefined();
  });

  it("classifies the six relations from the day stem", () => {
    // 甲(木) 与 火=子孙、土=妻财、水=父母、金=官鬼、木=兄弟
    expect(liuQin("甲", "午")).toBe("子孙");
    expect(liuQin("甲", "辰")).toBe("妻财");
    expect(liuQin("甲", "亥")).toBe("父母");
    expect(liuQin("甲", "酉")).toBe("官鬼");
    expect(liuQin("甲", "卯")).toBe("兄弟");
  });
});

describe("sanchuan table", () => {
  it("covers all sixty days with twelve offsets and valid branches", () => {
    const days = Object.keys(SANCHUAN_TABLE);
    expect(days).toHaveLength(60);
    let total = 0;
    for (const day of days) {
      expect(SANCHUAN_TABLE[day]).toHaveLength(12);
      for (const [chuan, ge] of SANCHUAN_TABLE[day]) {
        total += 1;
        expect(chuan).toHaveLength(3);
        for (const zhi of chuan) expect(DI_ZHI).toContain(zhi);
        expect(ge).toBeGreaterThanOrEqual(0);
        expect(ge).toBeLessThan(GE_NAMES.length);
      }
    }
    expect(total).toBe(720);
  });

  it("agrees with the heaven/earth plate: 伏吟 at zero offset, 反吟 at six", () => {
    let fuyin = 0;
    let fanyin = 0;
    for (const day of Object.keys(SANCHUAN_TABLE)) {
      const jiIndex = DI_ZHI.indexOf(JI_GONG[day.slice(0, 1)]);
      if (GE_NAMES[SANCHUAN_TABLE[day][jiIndex][1]] === "伏吟") fuyin += 1;
      if (GE_NAMES[SANCHUAN_TABLE[day][(jiIndex + 6) % 12][1]] === "反吟") fanyin += 1;
    }
    expect(fuyin).toBe(60);
    // 乙酉 的返吟因有贼克而记作涉害，属该表自身的命名口径
    expect(fanyin).toBeGreaterThanOrEqual(59);
  });
});

describe("liuren chart", () => {
  const chart = buildLiurenChart(profile());

  it("builds the twelve-palace plate, four lessons and three transmissions", () => {
    expect(chart.format).toBe("qmdj-liuren-v1");
    expect(chart.plate).toHaveLength(12);
    expect(chart.lessons).toHaveLength(4);
    expect(chart.transmissions).toHaveLength(3);
    expect(chart.kongWang).toHaveLength(2);
    expect(GE_NAMES).toContain(chart.keTi.replace(/·.*$/, ""));
  });

  it("互乘：天盘 is the earth plate rotated by (月将 − 占时)", () => {
    const yueJiangIndex = DI_ZHI.indexOf(chart.yueJiang.zhi);
    const hourIndex = DI_ZHI.indexOf(chart.hourZhi);
    for (const cell of chart.plate) {
      const diIndex = DI_ZHI.indexOf(cell.di);
      expect(cell.tian).toBe(DI_ZHI[((yueJiangIndex + diIndex - hourIndex) % 12 + 12) % 12]);
    }
    // 天盘为双射
    expect(new Set(chart.plate.map((cell) => cell.tian)).size).toBe(12);
  });

  it("derives the four lessons from the 干寄宫 and the 日支", () => {
    const tian = new Map(chart.plate.map((cell) => [cell.di, cell.tian]));
    const jiGong = JI_GONG[chart.dayGanZhi.slice(0, 1)];
    const riZhi = chart.dayGanZhi.slice(1);
    const [ke1, ke2, ke3, ke4] = chart.lessons;
    expect(ke1.upper).toBe(tian.get(jiGong));
    expect(ke1.lower).toBe(chart.dayGanZhi.slice(0, 1));
    expect(ke2.upper).toBe(tian.get(ke1.upper));
    expect(ke2.lower).toBe(ke1.upper);
    expect(ke3.upper).toBe(tian.get(riZhi));
    expect(ke3.lower).toBe(riZhi);
    expect(ke4.upper).toBe(tian.get(ke3.upper));
    expect(ke4.lower).toBe(ke3.upper);
  });

  it("looks the three transmissions up by 日干支 and 干上神", () => {
    const index = DI_ZHI.indexOf(chart.lessons[0].upper);
    const [chuan, ge] = SANCHUAN_TABLE[chart.dayGanZhi][index];
    expect(chart.transmissions.map((item) => item.zhi).join("")).toBe(chuan);
    expect(chart.keTi.startsWith(GE_NAMES[ge])).toBe(true);
  });

  it("fills the general, the six relation and the xun stem for every entry", () => {
    for (const item of [...chart.lessons, ...chart.transmissions]) {
      expect(SHEN_JIANG).toContain(item.jiang);
      expect(item.liuQin.length).toBeGreaterThan(0);
    }
    for (const item of chart.transmissions) {
      expect(DI_ZHI).toContain(item.zhi);
    }
  });

  it("serializes both forms", () => {
    expect(serializeLiurenToStructuredText(chart)).toContain("天地盘");
    const payload = JSON.parse(serializeLiurenToCompactJson(chart)) as { format: string; plate: unknown[]; transmissions: unknown[] };
    expect(payload.format).toBe("qmdj-liuren-v1");
    expect(payload.plate).toHaveLength(12);
    expect(payload.transmissions).toHaveLength(3);
    expect(julianDayAt("1990-05-20T08:30", "Asia/Shanghai")).toBeGreaterThan(2448000);
  });
});
