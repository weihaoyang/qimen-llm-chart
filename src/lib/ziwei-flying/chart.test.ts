import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildZiweiFlyingChart } from "./chart";
import { buildZiweiChartFromProfile } from "@/lib/ziwei/chart";
import { HE_TU, LUO_SHU, MUTAGEN_NAMES, STEM_MUTAGENS, TECHNIQUES, TIAN_YI } from "./data";
import { serializeZiweiFlyingToCompactJson, serializeZiweiFlyingToStructuredText } from "./serializer";

const profile = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  input.gender = "male";
  return normalizeProfileInput(input);
};

describe("ziwei flying tables", () => {
  it("ships the ten-stem four-transformation table", () => {
    expect(Object.keys(STEM_MUTAGENS)).toHaveLength(10);
    expect(MUTAGEN_NAMES).toEqual(["禄", "权", "科", "忌"]);
    for (const stars of Object.values(STEM_MUTAGENS)) expect(stars).toHaveLength(4);
    // 口诀：甲廉破武阳 … 癸破巨阴贪
    expect(STEM_MUTAGENS["甲"]).toEqual(["廉贞", "破军", "武曲", "太阳"]);
    expect(STEM_MUTAGENS["乙"]).toEqual(["天机", "天梁", "紫微", "太阴"]);
    expect(STEM_MUTAGENS["辛"]).toEqual(["巨门", "太阳", "文曲", "文昌"]);
    expect(STEM_MUTAGENS["癸"]).toEqual(["破军", "巨门", "太阴", "贪狼"]);
  });

  it("ships the tian-yi noble table and the He-Luo numbers", () => {
    expect(Object.keys(TIAN_YI)).toHaveLength(10);
    expect(TIAN_YI["甲"]).toEqual(["丑", "未"]);
    expect(TIAN_YI["辛"]).toEqual(["午", "寅"]);
    expect(Object.keys(LUO_SHU)).toHaveLength(12);
    expect(LUO_SHU["子"]).toMatchObject({ number: 1, trigram: "坎", nineStar: "一白" });
    expect(LUO_SHU["午"]).toMatchObject({ number: 9, trigram: "离", nineStar: "九紫" });
    expect(LUO_SHU["丑"].number).toBe(LUO_SHU["寅"].number);
    expect(HE_TU["坎"]).toEqual({ pair: [1, 6], element: "水", direction: "北" });
    expect(HE_TU["离"].pair).toEqual([2, 7]);
    expect(TECHNIQUES.length).toBeGreaterThanOrEqual(6);
  });
});

describe("ziwei flying chart", () => {
  const chart = buildZiweiFlyingChart(profile());

  it("applies the Jielan Ren-year transformation rather than the Quanshu variant", () => {
    const input = normalizeProfileInput(getDefaultProfileInput(new Date("2022-06-01T04:00:00Z"), "Asia/Shanghai"));
    const natal = buildZiweiChartFromProfile(input);
    const flying = buildZiweiFlyingChart(input);
    expect(flying.year.stem).toBe("壬");
    expect(flying.natives.map(({ star }) => star)).toEqual(["天梁", "紫微", "左辅", "武曲"]);
    const stars = natal.raw.palaces.flatMap(({ majorStars, minorStars }) => [...majorStars, ...minorStars]);
    expect(stars.find(({ name }) => name === "左辅")?.mutagen).toBe("科");
    expect(stars.find(({ name }) => name === "天府")?.mutagen).not.toBe("科");
  });

  it("builds twelve flying rows and the native four transformations", () => {
    expect(chart.format).toBe("qmdj-ziwei-flying-v1");
    expect(chart.rows).toHaveLength(12);
    expect(chart.natives).toHaveLength(4);
    expect(chart.year.ganZhi).toHaveLength(2);
    // 生年四化与十干四化表一致，且都落了宫
    const expected = STEM_MUTAGENS[chart.year.stem];
    expect(chart.natives.map((item) => item.star)).toEqual(expected);
    for (const item of chart.natives) expect(item.palace).not.toBe("—");
  });

  it("derives each palace's four transformations from its own stem", () => {
    for (const row of chart.rows) {
      expect(row.hits).toHaveLength(4);
      expect(row.hits.map((hit) => hit.mutagen)).toEqual([...MUTAGEN_NAMES]);
      expect(row.hits.map((hit) => hit.star)).toEqual(STEM_MUTAGENS[row.stem]);
      for (const hit of row.hits) {
        // 十四主星与辅弼昌曲均在盘中，故落宫必须解析成功
        expect(hit.toPalace).not.toBe("—");
        expect(hit.self).toBe(hit.toIndex === row.index);
      }
    }
  });

  it("finds the 来因宫 independently of inner/outer palace classification", () => {
    expect(chart.laiYin).not.toBeNull();
    const laiYinRow = chart.rows.find((row) => row.palace === chart.laiYin?.palace);
    expect(laiYinRow?.stem).toBe(chart.year.stem);
    // 宫职可以是六内或六外，支位排除子丑。
    expect(chart.laiYin?.isInner).toBe(laiYinRow?.isInner);
    const candidates = chart.rows.filter((row) => row.stem === chart.year.stem);
    expect(["子", "丑"]).not.toContain(laiYinRow?.branch);
    expect(chart.rows.filter((row) => row.isLaiYin).length).toBe(1);
    expect(chart.rows.filter((row) => row.isYearStemPalace).length).toBe(candidates.length);
    expect(chart.tianYi.branches).toEqual(TIAN_YI[chart.year.stem]);
    for (const name of chart.tianYi.palaces) expect(name).not.toBe("—");
    expect(chart.rows.filter((row) => row.isTianYi).length).toBe(chart.tianYi.palaces.filter((name) => name !== "—").length);
  });

  it("matches the ten-stem Qintian candidates when 子 and 丑 are excluded", () => {
    const expectedBranches = ["庚辰", "辛卯", "壬寅", "癸亥", "甲戌", "乙酉", "丙申", "丁未", "戊午", "己巳"];
    for (const [offset, expected] of expectedBranches.entries()) {
      const input = normalizeProfileInput(getDefaultProfileInput(new Date(Date.UTC(2020 + offset, 5, 1, 4)), "Asia/Shanghai"));
      const chart = buildZiweiFlyingChart(input);
      const candidates = chart.rows.filter((row) => row.isYearStemPalace);
      expect(candidates.filter((row) => row.branch !== "子" && row.branch !== "丑")
        .map((row) => row.stem + row.branch)).toEqual([expected]);
      if (offset === 4) {
        expect(chart.laiYin).toMatchObject({ palace: "兄弟", isInner: false });
        expect(candidates[0]).toMatchObject({ branch: "戌", isLaiYin: true });
      }
    }
  });

  it("flags self-transformation and incoming transformation", () => {
    const children = chart.rows.find((row) => row.palace === "子女");
    expect(children?.stem).toBe("乙");
    expect(children?.hits.filter((hit) => hit.self)).toMatchObject([
      { mutagen: "禄", star: "天机", toPalace: "子女" },
    ]);
    expect(children?.incoming).toEqual([
      { fromPalace: "田宅", mutagen: "忌", star: "文曲" },
    ]);
  });

  it("follows 禄转忌 / 忌转忌 by the landing palace's stem", () => {
    const all = [...chart.chains.luZhuanJi, ...chart.chains.jiZhuanJi, ...chart.chains.selfLuZhuanJi, ...chart.chains.selfJiZhuanJi];
    expect(all.length).toBeGreaterThan(0);
    for (const item of all) {
      const viaRow = chart.rows.find((row) => row.palace === item.via);
      expect(viaRow).toBeTruthy();
      expect(item.star2).toBe(STEM_MUTAGENS[viaRow!.stem][3]);
    }
  });

  it("anchors 自化转忌 on palaces whose own stem transforms a star onto itself", () => {
    expect(chart.chains.selfLuZhuanJi).toContainEqual({
      origin: "子女", star: "天机", via: "子女", to: "疾厄", star2: "太阴",
    });
    for (const item of chart.chains.selfLuZhuanJi) {
      const row = chart.rows.find((entry) => entry.palace === item.origin);
      expect(row?.hits.some((hit) => hit.self && hit.mutagen === "禄")).toBe(true);
    }
    for (const item of chart.chains.selfJiZhuanJi) {
      const row = chart.rows.find((entry) => entry.palace === item.origin);
      expect(row?.hits.some((hit) => hit.self && hit.mutagen === "忌")).toBe(true);
    }
  });

  it("carries the He-Luo numbers on every palace", () => {
    for (const row of chart.rows) {
      expect(row.luoShu).toBeGreaterThanOrEqual(1);
      expect(row.luoShu).toBeLessThanOrEqual(9);
      expect(row.nineStar.length).toBeGreaterThan(0);
      expect(row.heTu.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic and serializes both forms", () => {
    const again = buildZiweiFlyingChart(profile());
    expect(again.rows).toEqual(chart.rows);
    const text = serializeZiweiFlyingToStructuredText(chart);
    expect(text).toContain("飞星矩阵");
    expect(text).toContain("河洛化象");
    expect(text).toContain("禄转忌");
    const payload = JSON.parse(serializeZiweiFlyingToCompactJson(chart)) as { format: string; rows: unknown[]; natives: unknown[] };
    expect(payload.format).toBe("qmdj-ziwei-flying-v1");
    expect(payload.rows).toHaveLength(12);
    expect(payload.natives).toHaveLength(4);
  });
});

it("keeps Xin at Mao and Ren at Yin across changing palace roles", () => {
  for (const [year, branch] of [[2021, "卯"], [2022, "寅"]] as const) {
    for (let hour = 0; hour < 24; hour += 2) {
      const input = normalizeProfileInput(getDefaultProfileInput(
        new Date(Date.UTC(year, 5, 1, hour)), "Asia/Shanghai",
      ));
      const chart = buildZiweiFlyingChart(input);
      const row = chart.rows.find(item => item.isLaiYin);
      expect(row?.branch).toBe(branch);
      expect(chart.laiYin?.palace).toBe(row?.palace);
      expect(chart.rows.filter(item => item.isLaiYin)).toHaveLength(1);
    }
  }
});
