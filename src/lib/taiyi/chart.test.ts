import { describe, expect, it } from "vitest";
import { accumulatedYears, buildTaiyiChart, countSum, dunOf, generalPalace, generalSuPalace, harmonyCombined, harmonyLabel, jiShenPosition, lengthLabel, ruJuNumber, shiJiPosition, taiyiPalace, tianMuPosition } from "./chart";
import { DEITIES, GENERALS, PALACES, PALACE_SEQUENCE, PATTERNS } from "./data";
import { serializeTaiyiToCompactJson, serializeTaiyiToStructuredText } from "./serializer";

describe("taiyi tables", () => {
  it("ships the sixteen deities, nine palaces, eight generals and six patterns", () => {
    expect(DEITIES).toHaveLength(16);
    expect(PALACES).toHaveLength(9);
    expect(GENERALS).toHaveLength(8);
    expect(PATTERNS).toHaveLength(6);
    expect(PALACE_SEQUENCE).toEqual([1, 2, 3, 4, 6, 7, 8, 9]);
    expect(DEITIES.map((deity) => deity.position).join("")).toBe("子丑艮寅卯辰巽巳午未坤申酉戌乾亥");
  });
});

describe("accumulation and palaces", () => {
  it("anchors the 金镜 epoch: 724 CE = 1937281 accumulated years", () => {
    expect(accumulatedYears(724)).toBe(1937281);
    expect(accumulatedYears(2024)).toBe(1938581);
  });

  it("reduces the accumulated years to the 入局数", () => {
    expect(ruJuNumber(1938581, 365)).toBe(66);
    expect(ruJuNumber(1938581, 360)).toBe(53);
  });

  it("moves the star three years per palace without entering the centre", () => {
    expect(taiyiPalace(1)).toEqual({ palace: 1, block: 1 });
    expect(taiyiPalace(4)).toEqual({ palace: 2, block: 2 });
    expect(taiyiPalace(24)).toEqual({ palace: 9, block: 8 });
    expect(taiyiPalace(25)).toEqual({ palace: 1, block: 9 });
    // 阴遁逆行：局 1 起九宫，逆行至一宫
    expect(taiyiPalace(1, "阴遁").palace).toBe(9);
    expect(taiyiPalace(4, "阴遁").palace).toBe(8);
    expect(taiyiPalace(24, "阴遁").palace).toBe(1);
    for (const palace of PALACE_SEQUENCE) expect(palace).not.toBe(5);
  });

  it("splits the seventy-two ju into 阳遁 1–36 and 阴遁 37–72", () => {
    expect(dunOf(1)).toBe("阳遁");
    expect(dunOf(36)).toBe("阳遁");
    expect(dunOf(37)).toBe("阴遁");
    expect(dunOf(72)).toBe("阴遁");
  });
});

describe("tian mu (文昌) — validated against the 太乙全书 example", () => {
  it("places 入局 71 at 坤 (阳遁) and 艮 (阴遁)", () => {
    expect(tianMuPosition(71, "阳遁")).toBe("坤");
    expect(tianMuPosition(71, "阴遁")).toBe("艮");
    expect(tianMuPosition(1, "阳遁")).toBe("申"); // 起于武德
    expect(tianMuPosition(1, "阴遁")).toBe("寅"); // 起于吕申
  });

  it("completes the eighteen-position cycle", () => {
    expect(tianMuPosition(1 + 18, "阳遁")).toBe(tianMuPosition(1, "阳遁"));
  });
});

describe("ji shen and shi ji", () => {
  it("runs 计神 backwards through the twelve branches (口诀「一寅、二丑、三子」)", () => {
    expect(jiShenPosition(1, "阳遁")).toBe("寅");
    expect(jiShenPosition(2, "阳遁")).toBe("丑");
    expect(jiShenPosition(3, "阳遁")).toBe("子");
    expect(jiShenPosition(13, "阳遁")).toBe("寅");
    expect(jiShenPosition(1, "阴遁")).toBe("申");
    expect(jiShenPosition(2, "阴遁")).toBe("未");
  });

  it("derives 始击 by adding 计神 to 和德 and taking the 天目 offset", () => {
    // 计神在寅（环序 3），天目在坤（环序 10）→ 偏移 7，自艮（环序 2）顺行 7 位 = 未
    expect(shiJiPosition("坤", "寅")).toBe("未");
    // 天目与计神同位时，始击即落和德艮
    expect(shiJiPosition("寅", "寅")).toBe("艮");
  });
});

describe("host and guest counts", () => {
  it("sums the main palaces from the 目 up to the palace before 太乙", () => {
    // 自坤（宫 7）顺数正宫至午（太乙，离 2）前：7 + 6 + 1 + 8 + 3 + 4 + 9 = 38
    expect(countSum("坤", "午")).toBe(38);
    // 目在间神则初起为一
    expect(countSum("未", "未")).toBe(1);
    expect(countSum("未", "申")).toBe(8); // 1 + 坤(7)，至申前止
  });

  it("takes the general palace from the unit digit, or mod 9 for tens", () => {
    expect(generalPalace(13)).toBe(3);
    expect(generalPalace(9)).toBe(9);
    expect(generalPalace(10)).toBe(1);
    expect(generalPalace(20)).toBe(2);
    expect(generalPalace(30)).toBe(3);
    expect(generalPalace(90)).toBe(9);
  });

  it("derives 参将 with 「三因大将，满十去之」", () => {
    expect(generalSuPalace(7)).toBe(1); // 主大将 7 → 主参 1
    expect(generalSuPalace(3)).toBe(9); // 客大将 3 → 客参 9
    expect(generalSuPalace(6)).toBe(8); // 主大将 6 → 主参 8
    expect(generalSuPalace(1)).toBe(3); // 客大将 1 → 客参 3
  });

  it("labels the length of a count (十一以上为长、单九以下为短)", () => {
    expect(lengthLabel(9)).toBe("短数（力不足）");
    expect(lengthLabel(10)).toBe("中数（十，平）");
    expect(lengthLabel(11)).toBe("长数（谋事长远）");
    expect(lengthLabel(31)).toBe("长数（谋事长远）");
  });

  it("combines host and guest harmony into 上和/次和/下和", () => {
    expect(harmonyCombined("和", "和")).toBe("上和");
    expect(harmonyCombined("和", "不和之数（x）")).toBe("次和");
    expect(harmonyCombined("不和之数（x）", "不和之数（y）")).toBe("下和");
  });

  it("flags 不和 when the star's palace parity contradicts the count", () => {
    expect(harmonyLabel(1, 3)).toContain("不和"); // 阳宫得奇数
    expect(harmonyLabel(1, 4)).toBe("和");
    expect(harmonyLabel(2, 4)).toContain("不和"); // 阴宫得偶数
    expect(harmonyLabel(2, 3)).toBe("和");
  });
});

describe("taiyi chart", () => {
  it("reproduces the 太乙秘書 worked examples (入局 1 阳遁, 万历戊子 阴遁)", () => {
    const yang = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 1 });
    expect(yang.taiyi.palace).toBe(1); // 太乙乾一宫
    expect(yang.tianMu.position).toBe("申");
    expect(yang.counts.host).toBe(7);
    expect(yang.counts.guest).toBe(13);
    expect(yang.counts.hostSuPalace).toBe(1); // 主参 1
    expect(yang.counts.guestSuPalace).toBe(9); // 客参 9

    // 万历戊子（1588）：积年 1938145 → 入局 49 → 阴遁，太乙九宫、主算 16、客算 1
    const yin = buildTaiyiChart({ year: 1588, cycle: 360, dun: "auto", ruJu: null });
    expect(yin.accumulation.ruJu).toBe(49);
    expect(yin.input.dun).toBe("阴遁");
    expect(yin.taiyi.palace).toBe(9);
    expect(yin.counts.host).toBe(16);
    expect(yin.counts.guest).toBe(1);
    expect(yin.counts.hostSuPalace).toBe(8);
    expect(yin.counts.guestSuPalace).toBe(3);
  });

  it("uses the 360 cycle and the classical 遁 rule for 2024 (入局 53 → 阴遁)", () => {
    const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "auto", ruJu: null });
    expect(chart.accumulation).toEqual({ jiyear: 1938581, eraRemainder: 341, ruJu: 53 });
    expect(chart.input.dun).toBe("阴遁"); // 局 53 属阴遁三十六局
    expect(chart.taiyi.palace).toBe(8); // 阴遁逆行：18 段 → 坎八宫
    expect(chart.taiyi.trigram).toBe("坎");
    expect(chart.input.derived).toBe(true);
    expect(chart.tianMu.position).toBe(tianMuPosition(53, "阴遁"));
    expect(chart.shiJi.position).toBe(shiJiPosition(chart.tianMu.position, chart.jiShen.position));
    expect(chart.patterns.every((entry) => PATTERNS.some((pattern) => entry.startsWith(pattern.name)))).toBe(true);
  });

  it("differs when the era cycle is 365", () => {
    const chart = buildTaiyiChart({ year: 2024, cycle: 365, dun: "auto", ruJu: null });
    expect(chart.accumulation.ruJu).toBe(66);
    expect(chart.taiyi.palace).toBe(3); // 局 66 亦属阴遁，逆行得艮三宫
  });

  it("honours an explicit 入局数 and 遁 override", () => {
    const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu: 71 });
    expect(chart.input.derived).toBe(false);
    expect(chart.input.dun).toBe("阳遁");
    expect(chart.tianMu.position).toBe("坤");
    expect(chart.accumulation.ruJu).toBe(71);
  });

  it("serializes both forms", () => {
    const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "auto", ruJu: null });
    expect(chart.format).toBe("qmdj-taiyi-v1");
    const text = serializeTaiyiToStructuredText(chart);
    expect(text).toContain("十六神");
    expect(text).toContain("主算");
    const payload = JSON.parse(serializeTaiyiToCompactJson(chart)) as { format: string; deities: unknown[]; palaces: unknown[]; generals: unknown[] };
    expect(payload.format).toBe("qmdj-taiyi-v1");
    expect(payload.deities).toHaveLength(16);
    expect(payload.palaces).toHaveLength(9);
    expect(payload.generals).toHaveLength(8);
  });
});
