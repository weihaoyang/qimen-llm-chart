import { describe, expect, it } from "vitest";
import { accumulatedYears, annualDutyGate, annualThreeGateStatus, buildTaiyiChart, countSum, detectPatterns, fixedPlanEyePosition, generalPalace, generalSuPalace, harmonyLevel, harmonyLevelVariant, jiShenPosition, PALACE_RING, parityLabel, RING, ruJuNumber, shiJiPosition, taiyiEightGatePalaces, taiyiPalace, tianMuPosition, wujingReadiness } from "./chart";

it("rejects fractional and out-of-range inputs before indexing the Taiyi tables", () => {
  const settings = { year: 2026, cycle: 360, dun: "阳遁", ruJu: null } as const;
  expect(() => buildTaiyiChart({ ...settings, year: 2026.5 })).toThrow(RangeError);
  expect(() => buildTaiyiChart({ ...settings, cycle: 0 })).toThrow(RangeError);
  expect(() => buildTaiyiChart({ ...settings, ruJu: 1.5 })).toThrow(RangeError);
  expect(() => buildTaiyiChart({ ...settings, ruJu: 73 })).toThrow(RangeError);
});
import { DEITIES, GENERALS, PALACES, PALACE_SEQUENCE, PATTERNS } from "./data";
import { DEITY_POSITION, MISHU_CORPUS, type MishuField } from "./mishu-corpus";
import { serializeTaiyiToCompactJson, serializeTaiyiToStructuredText } from "./serializer";

describe("taiyi tables", () => {
  it("uses the final chart of the 72-chart cycle at an exact multiple", () => {
    const chart = buildTaiyiChart({ year: 1971, cycle: 360, dun: "阳遁", ruJu: null });
    expect(chart.input.ruJu).toBe(72);
    expect(chart.taiyi.palace).toBe(9);
    expect(ruJuNumber(accumulatedYears(1972), 360)).toBe(1);
  });

  it("ships the sixteen deities, nine palaces, eight generals and the sourced patterns", () => {
    expect(DEITIES).toHaveLength(16);
    expect(PALACES).toHaveLength(9);
    expect(GENERALS).toHaveLength(8);
    expect(PATTERNS.map((pattern) => pattern.name)).toEqual(["掩", "击", "迫", "囚", "关", "格", "对", "四郭固", "四郭杜", "提挟", "大小将挟", "杜塞"]);
    expect(PALACE_SEQUENCE).toEqual([1, 2, 3, 4, 6, 7, 8, 9]);
    expect(DEITIES.map((deity) => deity.position).join("")).toBe("子丑艮寅卯辰巽巳午未坤申酉戌乾亥");
  });
});

describe("accumulation and palaces", () => {
  it("matches the two 万历 examples and all twelve 合神 pairs for 定计目", () => {
    for (const [year, yang, yin] of [[1587, "丑", "未"], [1588, "辰", "戌"]] as const) {
      const chartYang = buildTaiyiChart({ year, cycle: 360, dun: "阳遁", ruJu: null });
      const chartYin = buildTaiyiChart({ year, cycle: 360, dun: "阴遁", ruJu: null });
      expect(chartYang.fixedPlanEye.position).toBe(yang);
      expect(chartYin.fixedPlanEye.position).toBe(yin);
      expect(serializeTaiyiToStructuredText(chartYang)).toContain(`定目${yang}`);
      expect(JSON.parse(serializeTaiyiToCompactJson(chartYin)).fixedPlanEye.position).toBe(yin);
    }
    const branches = "子丑寅卯辰巳午未申酉戌亥";
    const partners = "丑子亥戌酉申未午巳辰卯寅";
    for (let i = 0; i < 12; i++) {
      // 文昌放在合神上时，其下应恰为太岁；完整验证六合和旋转方向。
      expect(fixedPlanEyePosition(2020 + i, partners[i])).toEqual({ yearBranch: branches[i], combiningBranch: partners[i], position: branches[i] });
    }
    expect(() => fixedPlanEyePosition(2024, "中")).toThrow(RangeError);
  });
  it("exposes the unresolved 定计 count discrepancy in the 万历戊子 example", () => {
    // 探索假说：合神丑加太岁子，文昌所在天盘回推地盘；数至太乙后一正宫。
    // 只锁定假说与书例之间的差异，不将假说用于生产排盘。
    const result = (["阳遁", "阴遁"] as const).map((dun) => {
      const chart = buildTaiyiChart({ year: 1588, cycle: 360, dun, ruJu: null });
      const shift = (RING.indexOf("丑") - RING.indexOf("子") + RING.length) % RING.length;
      const eye = RING[(RING.indexOf(chart.tianMu.position) - shift + RING.length) % RING.length];
      const next = PALACE_RING[(PALACE_RING.indexOf(chart.taiyi.palace) + 1) % PALACE_RING.length];
      const hypothesis = countSum(eye, chart.taiyi.position) + chart.taiyi.palace + next;
      return { eye, hypothesis };
    });
    expect(result).toEqual([{ eye: "辰", hypothesis: 34 }, { eye: "戌", hypothesis: 28 }]);
    // 原书记阳三十四、阴二十五；阴例未吻合，禁止将此假说当作完整规则。
    expect(result[1].hypothesis).not.toBe(25);
  });

  it("reconstructs 講武全書 庚辰 seventeen-chart 定计 from the stated positions", () => {
    // 原书：庚辰十七局，大武居坤，太乙七宫；合神酉加辰，文昌下吕申，间神起一至大威，得十六。
    // 1580 仅作为庚辰输入载体，入局强制为 17，不声称是原文具体年份。
    const chart = buildTaiyiChart({ year: 1580, cycle: 360, dun: "阳遁", ruJu: 17 });
    expect(chart.taiyi).toMatchObject({ palace: 7, position: "坤" });
    expect(chart.tianMu).toMatchObject({ position: "坤", deity: { name: "大武" } });
    expect(chart.fixedPlanEye).toMatchObject({ yearBranch: "辰", combiningBranch: "酉", position: "寅", deity: { name: "吕申" } });
    expect(chart.fixedPlan).toMatchObject({ count: 16, generalPalace: 6, deputyPalace: 8 });
    expect(countSum("寅", "坤")).toBe(1 + 4 + 9 + 2);
    // 吕申是十六神的名称，不是地支申；混淆二者会得到另一数值。
    expect(countSum("申", "坤")).toBe(34);
    expect(JSON.parse(serializeTaiyiToCompactJson(chart)).fixedPlan.count).toBe(16);
    expect(serializeTaiyiToStructuredText(chart)).toContain("太乙前止法）：16");
  });
  it("follows the 金钥匙 定算 examples and preserves its contrast with 秘书", () => {
    // 金钥匙戊戌月：定目戌，太乙巽，1+1+8+3+4=17；丁未日：定目艮，太乙子，3+4+9+2+7+6+1=32。
    expect(countSum("戌", "巽")).toBe(17);
    expect(countSum("艮", "子")).toBe(32);
    expect([generalPalace(17), generalSuPalace(generalPalace(17))]).toEqual([7, 1]);
    expect([generalPalace(32), generalSuPalace(generalPalace(32))]).toEqual([2, 6]);
    const chart = buildTaiyiChart({ year: 1588, cycle: 360, dun: "阴遁", ruJu: null });
    expect(chart.fixedPlanEye.position).toBe("戌");
    expect(chart.taiyi.position).toBe("巽");
    expect(chart.fixedPlan).toMatchObject({ count: 17, generalPalace: 7, deputyPalace: 1 });
    expect(serializeTaiyiToStructuredText(chart)).toContain("与《太乙秘书》部分书例不同");
    expect(serializeTaiyiToStructuredText(chart)).toContain("万历戊子阴遁例列25");
    expect(chart.fixedPlanSourceComparison).toEqual({ source: "《太乙秘书》万历戊子阴遁例", count: 25, generalPalace: 5, deputyPalace: 5 });
    expect(JSON.parse(serializeTaiyiToCompactJson(chart)).fixedPlan.count).toBe(17);
    expect(JSON.parse(serializeTaiyiToCompactJson(chart)).fixedPlanSourceComparison.count).toBe(25);
    expect(buildTaiyiChart({ year: 1588, cycle: 360, dun: "阴遁", ruJu: 48 }).fixedPlanSourceComparison).toBeNull();
    expect(buildTaiyiChart({ year: 1588, cycle: 360, dun: "阳遁", ruJu: 49 }).fixedPlanSourceComparison).toBeNull();
    let samePalace = 0;
    let centre = 0;
    for (let year = 2020; year < 2032; year++) for (const dun of ["阳遁", "阴遁"] as const) for (let ruJu = 1; ruJu <= 72; ruJu++) {
      const example = buildTaiyiChart({ year, cycle: 360, dun, ruJu });
      expect(example.fixedPlanSamePalaceCandidate === null).toBe(example.fixedPlanEye.position !== example.taiyi.position);
      if (example.fixedPlanEye.position === example.taiyi.position) {
        expect(example.fixedPlan).toBeNull();
        expect(example.fixedPlanSamePalaceCandidate).toMatchObject({ count: example.taiyi.palace, generalPalace: example.taiyi.palace, deputyPalace: generalSuPalace(example.taiyi.palace) });
        expect(example.fixedPlanSamePalaceCandidate?.method).toContain("跨书推导");
        expect(serializeTaiyiToStructuredText(example)).toContain("定算同宫候选（跨书推导，非古书实例）");
        expect(JSON.parse(serializeTaiyiToCompactJson(example)).fixedPlanSamePalaceCandidate.count).toBe(example.taiyi.palace);
        samePalace++;
      }
      else if (example.fixedPlan?.generalPalace === 5) { expect(example.fixedPlan.gatePalaces).toBeNull(); centre++; }
    }
    expect(samePalace).toBeGreaterThan(0);
    expect(centre).toBeGreaterThan(0);
  });
  it("keeps two derived-year same-palace estimates separate from confirmed fixed calculations", () => {
    for (const [year, dun, ju, palace, deputy] of [[1907, "阳遁", 8, 3, 9], [1914, "阴遁", 15, 4, 2]] as const) {
      const chart = buildTaiyiChart({ year, cycle: 360, dun, ruJu: null });
      expect(chart.input).toMatchObject({ ruJu: ju, derived: true });
      expect(chart.fixedPlanEye.position).toBe(chart.taiyi.position);
      expect(chart.fixedPlan).toBeNull();
      expect(chart.fixedPlanSamePalaceCandidate).toMatchObject({ count: palace, generalPalace: palace, deputyPalace: deputy });
    }
  });
  it("reproduces annual duty gate examples and every thirty-year boundary", () => {
    expect(annualDutyGate(accumulatedYears(724))).toEqual({ name: "开门", yearInGate: 1, yearInCycle: 1 });
    expect(annualDutyGate(accumulatedYears(753)).name).toBe("开门");
    expect(annualDutyGate(accumulatedYears(754))).toEqual({ name: "休门", yearInGate: 1, yearInCycle: 31 });
    // 《景祐太乙福应经》乾德二年甲子、淳化五年甲午；《统宗宝鉴》端平元年甲午。
    expect(annualDutyGate(accumulatedYears(964)).name).toBe("开门");
    expect(annualDutyGate(accumulatedYears(994)).name).toBe("休门");
    expect(annualDutyGate(accumulatedYears(1234)).name).toBe("休门");
    const gates = ["开门", "休门", "生门", "伤门", "杜门", "景门", "死门", "惊门"];
    for (let i = 0; i < 8; i++) {
      expect(annualDutyGate(1 + 30 * i)).toEqual({ name: gates[i], yearInGate: 1, yearInCycle: 1 + 30 * i });
      expect(annualDutyGate(30 + 30 * i).name).toBe(gates[i]);
    }
    expect(annualDutyGate(0)).toEqual({ name: "惊门", yearInGate: 30, yearInCycle: 240 });
    expect(annualDutyGate(-1)).toEqual(annualDutyGate(239));
    expect(() => annualDutyGate(Number.NaN)).toThrow(RangeError);
    const base = buildTaiyiChart({ year: 754, cycle: 360, dun: "阳遁", ruJu: null });
    const override = buildTaiyiChart({ year: 754, cycle: 365, dun: "阴遁", ruJu: 10 });
    expect(override.annualGate).toEqual(base.annualGate);
    expect(serializeTaiyiToStructuredText(base)).toContain("岁计直门（《金镜》卷一新术）：休门");
    expect(JSON.parse(serializeTaiyiToCompactJson(base)).annualGate.name).toBe("休门");
  });

  it("compares duty gate and opposite gate using the 912 提格 example", () => {
    // 《统宗宝鉴》乾化二年：死门直事加太乙坎八，对生门，是提格。
    const chart = buildTaiyiChart({ year: 912, cycle: 360, dun: "阳遁", ruJu: null });
    expect(chart.input.ruJu).toBe(21);
    expect(chart.dutyGateRelation).toEqual({ result: "提格", palace: 8, gate: "死门", oppositePalace: 2, oppositeGate: "生门" });
    expect(serializeTaiyiToStructuredText(chart)).toContain("太乙8宫死门，对宫2宫生门");
    expect(JSON.parse(serializeTaiyiToCompactJson(chart)).dutyGateRelation.result).toBe("提格");
    const results = ["执提", "未命中", "执提", "未命中", "提格", "未命中", "提格", "未命中"];
    for (let i = 0; i < 8; i++) for (const dun of ["阳遁", "阴遁"] as const) {
      const candidate = buildTaiyiChart({ year: 724 + i * 30, cycle: 360, dun, ruJu: null });
      expect(candidate.dutyGateRelation.result).toBe(results[i]);
      expect(candidate.annualGatePalaces.find(p => p.palace === candidate.dutyGateRelation.oppositePalace)?.gate).toBe(candidate.dutyGateRelation.oppositeGate);
    }
    expect(buildTaiyiChart({ year: 840, cycle: 360, dun: "阳遁", ruJu: null }).dutyGateRelation.result).toBe("未命中");
  });

  it("preserves the 开成五年 执提 evidence without inferring an unsupported rule", () => {
    // 《统宗宝鉴》卷十六记开成五年二十一局有执提；其余排法并非原文明确列出。
    const chart = buildTaiyiChart({ year: 840, cycle: 360, dun: "阳遁", ruJu: null });
    expect(chart.input.ruJu).toBe(21);
    expect(chart.annualGate).toEqual({ name: "伤门", yearInGate: 27, yearInCycle: 117 });
    expect(chart.taiyi.palace).toBe(8);
    expect(chart.annualGatePalaces.find((entry) => entry.palace === 8)?.gate).toBe("伤门");
    expect(chart.fixedOpenGatePalaces.find((entry) => entry.palace === 8)?.gate).toBe("开门");
    // 伤门直事但书称执提，因此不能简单以直门是否为开/生二门作为执提判据。
    expect(["开门", "生门"]).not.toContain(chart.annualGate.name);
  });

  it("places annual and fixed-open gate systems separately around all eight palaces", () => {
    // 《图书集成》太乙在乾一宫以开起，依次坎休、艮生、震伤、巽杜、离景、坤死、兑惊。
    const palaces = [1, 8, 3, 4, 9, 2, 7, 6];
    const gates = ["开门", "休门", "生门", "伤门", "杜门", "景门", "死门", "惊门"];
    expect(taiyiEightGatePalaces(1, "开门")).toEqual(palaces.map((palace, i) => ({ palace, gate: gates[i] })));
    for (const startPalace of palaces) for (const startGate of gates) {
      const result = taiyiEightGatePalaces(startPalace, startGate);
      expect(result[0]).toEqual({ palace: startPalace, gate: startGate });
      expect(new Set(result.map((entry) => entry.palace)).size).toBe(8);
      expect(new Set(result.map((entry) => entry.gate)).size).toBe(8);
      for (let i = 1; i < 8; i++) {
        expect(result[i].palace).toBe(palaces[(palaces.indexOf(startPalace) + i) % 8]);
        expect(result[i].gate).toBe(gates[(gates.indexOf(startGate) + i) % 8]);
      }
    }
    expect(() => taiyiEightGatePalaces(5, "开门")).toThrow(RangeError);
    expect(() => taiyiEightGatePalaces(1, "天门")).toThrow(RangeError);
    const chart = buildTaiyiChart({ year: 754, cycle: 360, dun: "阳遁", ruJu: null });
    expect(chart.annualGatePalaces[0]).toEqual({ palace: chart.taiyi.palace, gate: "休门" });
    expect(chart.fixedOpenGatePalaces[0]).toEqual({ palace: chart.taiyi.palace, gate: "开门" });
    expect(serializeTaiyiToStructuredText(chart)).toContain("开门加太乙（李淳风法）");
    expect(JSON.parse(serializeTaiyiToCompactJson(chart)).annualGatePalaces).toEqual(chart.annualGatePalaces);
  });

  it("places the host and guest general gates without assigning the centre to a palace", () => {
    // 《太乙秘书》阳四局主将、阳七局客将不出中宫；书注八门杜。
    expect(buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu: 4 }).generalGatePalaces.host).toBeNull();
    expect(buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu: 7 }).generalGatePalaces.guest).toBeNull();
    let centreHost = 0;
    let centreGuest = 0;
    let outsideHost = 0;
    let outsideGuest = 0;
    for (const dun of ["阳遁", "阴遁"] as const) for (let ruJu = 1; ruJu <= 72; ruJu++) {
      const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun, ruJu });
      for (const [side, palace] of [["host", chart.counts.hostGeneralPalace], ["guest", chart.counts.guestGeneralPalace]] as const) {
        const gates = chart.generalGatePalaces[side];
        if (palace === 5) {
          expect(gates).toBeNull();
          if (side === "host") centreHost++; else centreGuest++;
        } else {
          expect(gates).toEqual(taiyiEightGatePalaces(palace, "开门"));
          if (side === "host") outsideHost++; else outsideGuest++;
        }
      }
      const text = serializeTaiyiToStructuredText(chart);
      const json = JSON.parse(serializeTaiyiToCompactJson(chart));
      expect(json.generalGatePalaces).toEqual(chart.generalGatePalaces);
      if (chart.counts.hostGeneralPalace === 5) expect(text).toContain("主大将落中宫，八门杜，未排布");
      if (chart.counts.guestGeneralPalace === 5) expect(text).toContain("客大将落中宫，八门杜，未排布");
    }
    expect([centreHost, centreGuest, outsideHost, outsideGuest].every((count) => count > 0)).toBe(true);
  });
  it("preserves the cycle remainder for large safe integers and negative years", () => {
    const cycle = Number.MAX_SAFE_INTEGER;
    for (const year of [2026, -Number.MAX_SAFE_INTEGER]) {
      const expectedYears = BigInt(year) + BigInt(1937281) - BigInt(724);
      const expectedRemainder = (expectedYears % BigInt(cycle) + BigInt(cycle)) % BigInt(cycle);
      const expectedJu = ((expectedRemainder - BigInt(1)) % BigInt(72) + BigInt(72)) % BigInt(72) + BigInt(1);
      const chart = buildTaiyiChart({ year, cycle, dun: "阳遁", ruJu: null });
      expect(chart.accumulation.jiyear).toBe(Number(expectedYears));
      expect(chart.accumulation.eraRemainder).toBe(Number(expectedRemainder));
      expect(chart.input.ruJu).toBe(Number(expectedJu));
    }
  });

  it("matches the eleven explicit annual Taiyi palaces in 南齐书卷一", () => {
    // Astronomical year -201 represents 202 BCE (汉高帝五年).
    const annualPalaces = [
      [-201, 4], [403, 7], [404, 7], [424, 6], [430, 8], [441, 2],
      [465, 2], [466, 3], [474, 6], [476, 7], [477, 7],
    ];
    for (const [year, palace] of annualPalaces) {
      const chart = buildTaiyiChart({ year, cycle: 360, dun: "阳遁", ruJu: null });
      expect(chart.taiyi.palace, String(year)).toBe(palace);
    }
  });

  it("anchors the 金镜 epoch: 724 CE = 1937281 accumulated years", () => {
    expect(accumulatedYears(724)).toBe(1937281);
    expect(accumulatedYears(2024)).toBe(1938581);
    expect([1937281, 1561, 30001].map((count) => ruJuNumber(count, 360))).toEqual([49, 49, 49]);
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
    // 阴遁逆行：局 1 起九宫，逆行至一宫（《太乙秘書》阴局第一局「太乙在九宫」）
    expect(taiyiPalace(1, "阴遁").palace).toBe(9);
    expect(taiyiPalace(4, "阴遁").palace).toBe(8);
    expect(taiyiPalace(24, "阴遁").palace).toBe(1);
    for (const palace of PALACE_SEQUENCE) expect(palace).not.toBe(5);
  });

  it("does not derive 遁 from the 局数 (古籍阳局/阴局七十二局并列)", () => {
    // 同一入局数，两遁并存、结果不同——故遁必须显式指定
    expect(taiyiPalace(1, "阳遁").palace).toBe(1);
    expect(taiyiPalace(1, "阴遁").palace).toBe(9);
    expect(tianMuPosition(1, "阳遁")).toBe("申");
    expect(tianMuPosition(1, "阴遁")).toBe("寅");
  });
});

describe("tian mu (文昌·下目·主)", () => {
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

  it("grades counts by 卷二 的和数表，并另存秘書一系异文", () => {
    // 《太乙金镜式经》卷二〈推阴阳和不和〉主表
    expect(harmonyLevel(14)).toBe("上和");
    expect(harmonyLevel(18)).toBe("上和");
    expect(harmonyLevel(33)).toBe("上和");
    expect(harmonyLevel(23)).toBe("次和");
    expect(harmonyLevel(29)).toBe("次和");
    expect(harmonyLevel(32)).toBe("次和");
    expect(harmonyLevel(12)).toBe("下和");
    expect(harmonyLevel(16)).toBe("下和");
    expect(harmonyLevel(27)).toBe("下和");
    expect(harmonyLevel(34)).toBe("下和");
    expect(harmonyLevel(38)).toBe("下和");
    expect(harmonyLevel(36)).toBe("未列"); // 卷二不作次和
    expect(harmonyLevel(7)).toBe("未列");
    // 《太乙秘書》〈主客算〉电子转录，影印尚待核对
    expect(harmonyLevelVariant(36)).toBe("次和");
    expect(harmonyLevelVariant(21)).toBe("下和");
    expect(harmonyLevelVariant(33)).toBe("未列");
  });

  it("reports only the parity of a count as fact (不下和/不和与长/短判词)", () => {
    expect(parityLabel(13)).toBe("奇数");
    expect(parityLabel(16)).toBe("偶数");
  });
});

describe("taiyi chart", () => {
  it("keeps 武经总要's non-gate readiness independent of the gate chart", () => {
    expect(wujingReadiness(1, "乾", "艮", "巽", 4)).toEqual({ status: "符合", blockers: [] });
    expect(wujingReadiness(1, "乾", "亥", "乾", 1)).toEqual({ status: "不符合", blockers: ["文昌四迫", "始击掩太乙", "始击掩主大将"] });
    expect(wujingReadiness(1, "乾", "艮", "子", 3)).toEqual({ status: "不符合", blockers: ["始击击太乙"] });
    expect(wujingReadiness(1, "乾", "艮", "巽", 9)).toEqual({ status: "不符合", blockers: ["始击掩主大将"] });
    for (const [ruJu, eyeGate] of [[13, "休门"], [20, "生门"]] as const) {
      const chart = buildTaiyiChart({ year: 1571, cycle: 360, dun: "阳遁", ruJu });
      expect(chart.annualThreeGates).toMatchObject({ status: "不具", eyeGate });
      expect(chart.wujingReadiness).toEqual({ status: "符合", blockers: [] });
      expect(serializeTaiyiToStructuredText(chart)).toContain("门具将发（《武经总要》不依八门说）：符合");
      expect(JSON.parse(serializeTaiyiToCompactJson(chart)).wujingReadiness.status).toBe("符合");
    }
  });
  it("distinguishes 三门具 from unknown 間神 and from 五将发", () => {
    const gates = taiyiEightGatePalaces(3, "杜门");
    expect(annualThreeGateStatus(gates, 3, "酉")).toMatchObject({ status: "不具", taiyiGate: "杜门", eyeGate: "休门" });
    expect(annualThreeGateStatus(gates, 3, "卯")).toMatchObject({ status: "具", taiyiGate: "杜门", eyeGate: "景门" });
    expect(annualThreeGateStatus(gates, 3, "巳")).toMatchObject({ status: "未定", eyeGate: null });
    expect(annualThreeGateStatus(taiyiEightGatePalaces(3, "开门"), 3, "巳").status).toBe("不具");
    // 《武备志》辛未例明确天目巳临死门；本实现不将单例外推成所有间神规则。
    const chart = buildTaiyiChart({ year: 1571, cycle: 360, dun: "阳遁", ruJu: 32 });
    expect(chart.annualGate.name).toBe("杜门");
    expect(chart.taiyi.palace).toBe(3);
    expect(chart.tianMu.position).toBe("巳");
    expect(chart.annualThreeGates).toMatchObject({ status: "未定", taiyiGate: "杜门", eyeGate: null });
    expect(serializeTaiyiToStructuredText(chart)).toContain("门位待核");
    expect(JSON.parse(serializeTaiyiToCompactJson(chart)).annualThreeGates.status).toBe("未定");
  });
  it("reports fixed-plan-eye pressure with the 秘書 source in all four neighboring positions", () => {
    const base = { taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "寅", shiJiPosition: "巳", hostGeneralPalace: 3, hostSuPalace: 4, guestGeneralPalace: 5, guestSuPalace: 7 };
    for (const [position, kind, detail] of [["亥", "外迫", "前一辰"], ["戌", "内迫", "后一辰"], ["子", "外迫", "前一宫"], ["酉", "内迫", "后一宫"]] as const) {
      const lines = detectPatterns({ ...base, fixedPlanEyePosition: position });
      expect(lines.find(line => line.startsWith(`迫（${kind}）`))).toContain(`定计目（《太乙秘书》）在太乙${detail}`);
    }
    expect(detectPatterns({ ...base, fixedPlanEyePosition: "乾" }).some(line => line.includes("定计目（《太乙秘书》）"))).toBe(false);
    for (const [ruJu, palace, eye] of [[3, 1, "酉"], [8, 3, "子"]] as const) {
      const chart = buildTaiyiChart({ year: 1588, cycle: 360, dun: "阳遁", ruJu });
      expect(chart.taiyi.palace).toBe(palace);
      expect(chart.fixedPlanEye.position).toBe(eye);
      const witness = "定计目（《太乙秘书》）在太乙后一宫";
      expect(chart.patterns.some(line => line.startsWith("迫（内迫）") && line.includes(witness))).toBe(true);
      expect(serializeTaiyiToStructuredText(chart)).toContain(witness);
      expect(JSON.parse(serializeTaiyiToCompactJson(chart)).patterns.join("\n")).toContain(witness);
    }
  });
  it("checks 对 actors by source", () => {
    const base = { taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "子", shiJiPosition: "亥", hostGeneralPalace: 9, hostSuPalace: 9, guestGeneralPalace: 3, guestSuPalace: 4 };
    expect(detectPatterns(base)).toContain("对：主大将、主参将与太乙对冲（《太白》口径）");
    expect(detectPatterns({ ...base, tianMuPosition: "巽" })).toContain("对：文昌与太乙对冲（《金镜》口径）；主大将、主参将与太乙对冲（《太白》口径）");
    expect(detectPatterns({ ...base, hostGeneralPalace: 5, hostSuPalace: 3 }).some(item => item.startsWith("对："))).toBe(false);
    for (const [ruJu, taiyi, hostSu] of [[13, 6, 4], [16, 7, 3]] as const) {
      const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu });
      expect(chart.taiyi.palace).toBe(taiyi);
      expect(chart.counts.hostSuPalace).toBe(hostSu);
      const expected = "对：主参将与太乙对冲（《太白》口径）";
      expect(chart.patterns).toContain(expected);
      expect(serializeTaiyiToStructuredText(chart)).toContain(expected);
      expect(JSON.parse(serializeTaiyiToCompactJson(chart)).patterns).toContain(expected);
    }
  });
  it("reproduces the 太乙秘書 worked examples (入局 1 阳遁, 万历戊子 阴遁)", () => {
    const yang = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 1 });
    expect(yang.taiyi.palace).toBe(1); // 太乙乾一宫
    expect(yang.tianMu.position).toBe("申");
    expect(yang.counts.host).toBe(7);
    expect(yang.counts.guest).toBe(13);
    expect(yang.counts.hostSuPalace).toBe(1); // 主参 1
    expect(yang.counts.guestSuPalace).toBe(9); // 客参 9

    // 万历戊子（1588）：积年 1938145 → 入局 49；遁须显式指定为阴遁
    const yin = buildTaiyiChart({ year: 1588, cycle: 360, dun: "阴遁", ruJu: null });
    expect(yin.accumulation.ruJu).toBe(49);
    expect(yin.input.dun).toBe("阴遁");
    expect(yin.input.dunDefaulted).toBe(false);
    expect(yin.taiyi.palace).toBe(9);
    expect(yin.counts.host).toBe(16);
    expect(yin.counts.guest).toBe(1);
    expect(yin.counts.hostSuPalace).toBe(8);
    expect(yin.counts.guestSuPalace).toBe(3);
    // 《太乙金镜式经》阴局立成于局 49 注「太阳〈撃〉」：始击（太阳＝辰）在太乙（巽九宫）后一辰。
    expect(yin.tianMu.position).toBe("乾"); // 天目阴徳＝乾
    expect(yin.shiJi.position).toBe("辰"); // 始击太阳
    expect(yin.patterns.some((entry) => entry.startsWith("击（内辰击）"))).toBe(true);
    expect(yin.counts.hostHarmonyLevel).toBe("下和"); // 十六为卷二下和之算
  });

  it("detects the newly sourced patterns (迫内外、提挟/挟闭、四郭固、四郭杜)", () => {
    // 太乙乾一宫：前一辰亥、后一辰戌；前一宫子（坎八）、后一宫酉（兑六）
    const po = detectPatterns({ taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "亥", shiJiPosition: "丑", hostGeneralPalace: 8, guestGeneralPalace: 6, hostSuPalace: 2, guestSuPalace: 4 });
    expect(po.some((entry) => entry.startsWith("迫（外迫）") && entry.includes("天目（文昌）在太乙前一辰") && entry.includes("主大将在太乙前一宫"))).toBe(true);
    expect(po.some((entry) => entry.startsWith("迫（内迫）") && entry.includes("客大将在太乙后一宫"))).toBe(true);
    // 太乙乾一宫与主大将坎八宫共挟天目于亥（间神）→ 挟闭
    expect(po.some((entry) => entry.startsWith("提挟") && entry.includes("共挟天目（文昌）于间神"))).toBe(true);

    // 掩：始击临主大将宫（《推掩法》「掩主大将」）
    const yan = detectPatterns({ taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "亥", shiJiPosition: "坤", hostGeneralPalace: 7, guestGeneralPalace: 6, hostSuPalace: 2, guestSuPalace: 4 });
    expect(yan.some((entry) => entry.startsWith("掩：始击掩主大将"))).toBe(true);

    // 四郭固：天目囚太乙宫，又值四将相关
    const guo = detectPatterns({ taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "乾", shiJiPosition: "丑", hostGeneralPalace: 3, guestGeneralPalace: 6, hostSuPalace: 3, guestSuPalace: 9 });
    expect(guo.some((entry) => entry.startsWith("四郭固"))).toBe(true);
    expect(guo.some((entry) => entry.startsWith("囚"))).toBe(true);
    expect(guo.some((entry) => entry.startsWith("关"))).toBe(true);

    // 四郭杜：客参将同文昌（天目）宫、主大将同客大将
    const du = detectPatterns({ taiyiPalace: 9, taiyiPosition: "巽", tianMuPosition: "艮", shiJiPosition: "申", hostGeneralPalace: 6, guestGeneralPalace: 6, hostSuPalace: 8, guestSuPalace: 3 });
    expect(du.some((entry) => entry.startsWith("四郭杜"))).toBe(true);
  });

  it("names all actual actors behind imprisonment, blockage and opposition", () => {
    const patterns = detectPatterns({ taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "乾", shiJiPosition: "巽", hostGeneralPalace: 1, hostSuPalace: 3, guestGeneralPalace: 9, guestSuPalace: 9 });
    expect(patterns).toContain("囚：天目（文昌）、主大将与太乙同在1宫");
    const guan = patterns.find(entry => entry.startsWith("关："))!;
    expect(guan).toContain("主大将、天目（文昌）同在1宫");
    expect(guan).toContain("客大将、客参将、始击（客目）同在9宫");
    expect(patterns).toContain("格：始击（客目）、客大将、客参将与太乙对宫");
    const noHit = detectPatterns({ taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "亥", shiJiPosition: "丑", hostGeneralPalace: 2, hostSuPalace: 3, guestGeneralPalace: 4, guestSuPalace: 6 });
    expect(noHit.some(entry => /^(囚|关|格)：/.test(entry))).toBe(false);
  });

  it("identifies which eye and which generals satisfy the selected 四郭固 conjunction", () => {
    const base = { taiyiPalace: 1, taiyiPosition: "乾", hostGeneralPalace: 3, hostSuPalace: 3, guestGeneralPalace: 6, guestSuPalace: 9 };
    const check = (tianMuPosition: string, shiJiPosition: string) => detectPatterns({ ...base, tianMuPosition, shiJiPosition }).find(item => item.startsWith("四郭固："));
    expect(check("乾", "丑")).toBe("四郭固：天目（文昌）与太乙同在1宫；主大将、主参将同在3宫");
    expect(check("丑", "乾")).toBe("四郭固：始击（客目）与太乙同在1宫；主大将、主参将同在3宫");
    expect(check("乾", "乾")).toBe("四郭固：天目（文昌）、始击（客目）与太乙同在1宫；主大将、主参将同在3宫");
    expect(check("丑", "寅")).toBeUndefined();
  });

  it("retains simultaneous concealment and identifies which side is blocked in the centre", () => {
    const all = detectPatterns({ taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "亥", shiJiPosition: "乾", hostGeneralPalace: 1, hostSuPalace: 5, guestGeneralPalace: 5, guestSuPalace: 3 });
    expect(all).toContain("掩：始击将临太乙宫、始击掩主大将");
    expect(all).toContain("杜塞：主参将、客大将落入中宫");
    for (const [ruJu, expected] of [[4, "杜塞：主大将、主参将落入中宫"], [7, "杜塞：客大将、客参将落入中宫"]] as const) {
      const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu });
      expect(chart.patterns).toContain(expected);
    }
    const noCentre = detectPatterns({ taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "亥", shiJiPosition: "乾", hostGeneralPalace: 3, hostSuPalace: 4, guestGeneralPalace: 6, guestSuPalace: 7 });
    expect(noCentre).toContain("掩：始击将临太乙宫");
    expect(noCentre.some(p => p.startsWith("杜塞："))).toBe(false);
  });

  it("states when 四郭杜's general conjunction itself supplies 关", () => {
    const patterns = detectPatterns({ taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "艮", shiJiPosition: "寅", hostGeneralPalace: 4, hostSuPalace: 5, guestGeneralPalace: 4, guestSuPalace: 3 });
    expect(patterns).toContain("关：主大将、客大将同在4宫；客参将、天目（文昌）同在3宫");
    expect(patterns).toContain("四郭杜：客参将同文昌、主大将同客大将（该将并本身亦为关）");
    expect(patterns.some((item) => /^(掩|击|迫|格|提挟)/.test(item))).toBe(false);
  });

  it("retains every simultaneous Taiyi and general flank witness", () => {
    const patterns = detectPatterns({ taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "亥", shiJiPosition: "亥", hostGeneralPalace: 8, guestGeneralPalace: 8, hostSuPalace: 5, guestSuPalace: 5 });
    const flank = patterns.find(entry => entry.startsWith("提挟："))!;
    for (const general of ["主大将", "客大将"]) for (const target of ["天目（文昌）", "始击（客目）"]) {
      expect(flank).toContain(`太乙与${general}共挟${target}于间神`);
    }
    expect(flank.match(/共挟/g)).toHaveLength(4);
    const withoutFlanks = detectPatterns({ taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "亥", shiJiPosition: "亥", hostGeneralPalace: 3, guestGeneralPalace: 3, hostSuPalace: 5, guestSuPalace: 5 });
    expect(withoutFlanks.some(entry => entry.startsWith("提挟："))).toBe(false);
  });

  it("includes the 太白 eye-and-Taiyi flank in both directions without treating a 間神 as a flanker", () => {
    const base = { taiyiPalace: 1, taiyiPosition: "乾", hostGeneralPalace: 3, hostSuPalace: 4, guestGeneralPalace: 6, guestSuPalace: 7 };
    const host = detectPatterns({ ...base, tianMuPosition: "子", shiJiPosition: "亥" });
    expect(host.find((item) => item.startsWith("提挟："))).toContain("太乙与天目（文昌）共挟始击（客目）于间神（《太白》口径）");
    const guest = detectPatterns({ ...base, tianMuPosition: "亥", shiJiPosition: "子" });
    expect(guest.find((item) => item.startsWith("提挟："))).toContain("太乙与始击（客目）共挟天目（文昌）于间神（《太白》口径）");
    const unsupported = detectPatterns({ ...base, tianMuPosition: "亥", shiJiPosition: "戌" });
    expect(unsupported.some((item) => item.includes("《太白》口径"))).toBe(false);
    for (const [ruJu, target] of [[15, "于正宫"], [25, "于间神"]] as const) {
      const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu });
      const expected = `太乙与天目（文昌）共挟始击（客目）${target}（《太白》口径）`;
      expect(chart.patterns.join("\n")).toContain(expected);
      expect(serializeTaiyiToStructuredText(chart)).toContain(expected);
      expect(JSON.parse(serializeTaiyiToCompactJson(chart)).patterns.join("\n")).toContain(expected);
    }
  });

  it("retains simultaneous flank witnesses in actual Yang 28, 44 and 70 charts", () => {
    const cases = [
      [28, "太乙与主大将共挟始击（客目）于正宫", "太乙与主大将共挟客大将于正宫"],
      [44, "太乙与主大将共挟天目（文昌）于间神", "太乙与客大将共挟主大将于正宫"],
      [70, "太乙与主大将共挟始击（客目）于正宫", "太乙与主大将共挟客大将于正宫"],
    ] as const;
    for (const [ruJu, first, second] of cases) {
      const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu });
      const flank = chart.patterns.find(entry => entry.startsWith("提挟："))!;
      expect(flank, `阳遁${ruJu}局`).toContain(first);
      expect(flank, `阳遁${ruJu}局`).toContain(second);
    }
  });

  it("defaults 遁 to 阳遁 and flags it when 遁 is not chosen", () => {
    // auto 只表示「未选定」，不再由局数推遁
    const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "auto", ruJu: null });
    expect(chart.accumulation).toEqual({ jiyear: 1938581, eraRemainder: 341, ruJu: 53 });
    expect(chart.input.dun).toBe("阳遁");
    expect(chart.input.dunDefaulted).toBe(true);
    expect(chart.input.derived).toBe(true);
    expect(chart.taiyi.palace).toBe(2); // 阳遁顺行：18 段 → 离二宫
    expect(chart.tianMu.position).toBe(tianMuPosition(53, "阳遁"));
    expect(chart.shiJi.position).toBe(shiJiPosition(chart.tianMu.position, chart.jiShen.position));
    expect(chart.patterns.every((entry) => PATTERNS.some((pattern) => entry.startsWith(pattern.name)))).toBe(true);
  });

  it("honours an explicit 遁 (局 53 阴遁 → 坎八宫) and the 365 cycle", () => {
    const yin = buildTaiyiChart({ year: 2024, cycle: 360, dun: "阴遁", ruJu: null });
    expect(yin.taiyi.palace).toBe(8); // 阴遁逆行：18 段 → 坎八宫
    expect(yin.taiyi.trigram).toBe("坎");
    expect(yin.input.dunDefaulted).toBe(false);

    const chart = buildTaiyiChart({ year: 2024, cycle: 365, dun: "阴遁", ruJu: null });
    expect(chart.accumulation.ruJu).toBe(66);
    expect(chart.taiyi.palace).toBe(3); // 局 66 阴遁逆行得艮三宫
  });

  it("honours explicit 入局数 and 遁", () => {
    const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu: 71 });
    expect(chart.input.derived).toBe(false);
    expect(chart.input.dun).toBe("阳遁");
    expect(chart.tianMu.position).toBe("坤");
    expect(chart.accumulation.ruJu).toBe(71);
  });

  it("serializes both forms", () => {
    const chart = buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu: null });
    expect(chart.format).toBe("qmdj-taiyi-v1");
    const text = serializeTaiyiToStructuredText(chart);
    expect(text).toContain("十六神");
    expect(text).toContain("主算");
    expect(text).toContain("《太乙秘書》电子本清单，影印待核");
    expect(text).not.toContain("出处待考");
    const payload = JSON.parse(serializeTaiyiToCompactJson(chart)) as { format: string; deities: unknown[]; palaces: unknown[]; generals: unknown[] };
    expect(payload.format).toBe("qmdj-taiyi-v1");
    expect(payload.deities).toHaveLength(16);
    expect(payload.palaces).toHaveLength(9);
    expect(payload.generals).toHaveLength(8);
  });
});

/** 本仓 detectPatterns 输出 → 秘書局注用语（掩/击辰/击宫/迫外/迫内/囚/关/格/对/杜塞/挟）。 */
const tokensOf = (patterns: string[]) => patterns.map((entry) => {
  if (entry.startsWith("击（") && entry.includes("辰击")) return "击辰";
  if (entry.startsWith("击（")) return "击宫";
  if (entry.startsWith("迫（外迫）")) return "迫外";
  if (entry.startsWith("迫（内迫）")) return "迫内";
  if (entry.startsWith("提挟")) return "挟";
  if (entry.startsWith("大小将挟")) return "挟";
  return entry.split("：")[0];
});

describe("《太乙秘書》阳局 1–24 · 阴局 1–12 逐局回归（36 局）", () => {
  it("separately reports 秘書 host and guest generals flanking cases", () => {
    const second = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 2 });
    expect(second.patterns.some((item) => item.startsWith("大小将挟：") && item.includes("主大小将挟客大将于正宫"))).toBe(true);
    const eighteenth = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 18 });
    expect(eighteenth.patterns.some((item) => item.startsWith("大小将挟：") && item.includes("主大小将挟客大将于正宫"))).toBe(true);
    // 原书说挟客大小将，但八宫邻位只包夹客大将六宫，客参将八宫不在二者之间。
    expect(eighteenth.patterns.some((item) => item.startsWith("大小将挟：") && item.includes("主大小将挟客参将于正宫"))).toBe(false);
    const twentyFourth = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 24 });
    expect(twentyFourth.patterns.some((item) => item.startsWith("大小将挟：") && item.includes("客大小将挟主大将于正宫"))).toBe(true);
    // 先验证古书局表四将，再比较夹持对象，避免以程序结果自证程序。
    const examples = [
      { ju: 20, generals: [7, 1, 6, 8], expected: ["主大小将挟客大将"] },
      { ju: 21, generals: [2, 6, 7, 1], expected: ["主大小将挟客大将"] },
      { ju: 27, generals: [1, 3, 8, 4], expected: ["主大小将挟客大将", "客大小将挟主参将"] },
      { ju: 42, generals: [7, 1, 2, 6], expected: ["客大小将挟主大将", "客大小将挟太乙"] },
      { ju: 44, generals: [3, 9, 4, 2], expected: ["主大小将挟客大将", "客大小将挟主参将"] },
    ];
    for (const example of examples) {
      const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: example.ju });
      expect([chart.counts.hostGeneralPalace, chart.counts.hostSuPalace, chart.counts.guestGeneralPalace, chart.counts.guestSuPalace], `阳${example.ju}局四将`).toEqual(example.generals);
      for (const target of example.expected) expect(chart.patterns.some((item) => item.startsWith("大小将挟：") && item.includes(target)), `阳${example.ju}局 ${target}`).toBe(true);
    }
    // 十九局秘書称客大小将挟文昌；客二、六宫与文昌申之间按本站环位不成立。
    const nineteenth = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 19 });
    expect(nineteenth.tianMu.position).toBe("申");
    expect(nineteenth.patterns.some((item) => item.startsWith("大小将挟：") && item.includes("客大小将挟天目"))).toBe(false);
    const middle = detectPatterns({ taiyiPalace: 1, taiyiPosition: "乾", tianMuPosition: "子", shiJiPosition: "酉", hostGeneralPalace: 5, hostSuPalace: 5, guestGeneralPalace: 5, guestSuPalace: 5 });
    expect(middle.some((item) => item.startsWith("大小将挟："))).toBe(false);
  });
  it("covers 36 局 and every asserted field matches 秘書", () => {
    expect(MISHU_CORPUS).toHaveLength(36);
    expect(MISHU_CORPUS.filter((entry) => entry.dun === "阳遁")).toHaveLength(24);
    expect(MISHU_CORPUS.filter((entry) => entry.dun === "阴遁")).toHaveLength(12);

    const mismatches: string[] = [];
    let asserted = 0;
    let skipped = 0;
    for (const entry of MISHU_CORPUS) {
      const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: entry.dun, ruJu: entry.ju });
      const skip = new Set<MishuField>(entry.skip ?? []);
      const check = (field: MishuField, expected: unknown, actual: unknown) => {
        if (skip.has(field)) {
          skipped += 1;
          return;
        }
        asserted += 1;
        if (expected !== actual) mismatches.push(`${entry.dun}第${entry.ju}局 ${field}：秘書 ${String(expected)} vs 本仓 ${String(actual)}`);
      };
      check("tianMu", entry.tianMu ? DEITY_POSITION[entry.tianMu] : undefined, chart.tianMu.position);
      check("host", entry.host, chart.counts.host);
      check("hostGeneral", entry.hostGeneral, chart.counts.hostGeneralPalace);
      check("hostSu", entry.hostSu, chart.counts.hostSuPalace);
      check("guestName", entry.guestName ? DEITY_POSITION[entry.guestName] : undefined, chart.shiJi.position);
      check("guest", entry.guest, chart.counts.guest);
      check("guestGeneral", entry.guestGeneral, chart.counts.guestGeneralPalace);
      check("guestSu", entry.guestSu, chart.counts.guestSuPalace);
      check("jiShen", entry.jiShen, chart.jiShen.position);
      if (chart.taiyi.palace !== entry.taiyi) mismatches.push(`${entry.dun}第${entry.ju}局 taiyi：秘書 ${entry.taiyi} vs 本仓 ${chart.taiyi.palace}`);
    }
    expect(mismatches).toEqual([]);
    // 9 字段 × 36 局 = 324：其中 300 条按秘書原文断言通过，24 条为秘書缺漏或已具名核实的讹字（见各局 notes）
    expect(asserted).toBe(300);
    expect(skipped).toBe(24);
  });

  it("matches the 秘書 格局注记 (掩/击/迫/囚/关/格/杜塞)，除具名例外者", () => {
    const diffs: string[] = [];
    for (const entry of MISHU_CORPUS) {
      const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: entry.dun, ruJu: entry.ju });
      const ours = new Set(tokensOf(chart.patterns));
      const exceptions = new Set(entry.patternExceptions ?? []);
      for (const token of entry.mishuPatterns ?? []) {
        if (exceptions.has(token)) continue;
        if (!ours.has(token)) diffs.push(`${entry.dun}第${entry.ju}局：秘書注「${token}」，本仓未命中（本仓：${[...ours].join("/") || "无"}）`);
      }
    }
    expect(diffs).toEqual([]);
  });

  it("keeps the documented 秘書/卷三 异文 on record", () => {
    const withNotes = MISHU_CORPUS.filter((entry) => entry.notes);
    expect(withNotes.length).toBeGreaterThanOrEqual(18);
    expect(MISHU_CORPUS.every((entry) => (entry.skip ?? []).length === 0 || entry.notes)).toBe(true);
  });
});

it("matches the annual generals in the Ji Cheng charts for 430 and 441", () => {
  // 《古今图书集成》艺术典695卷，阳遁43局与54局。
  const cases = [
    { year: 430, ju: 43, host: 8, guest: 17, generals: [8, 4, 7, 1] },
    { year: 441, ju: 54, host: 38, guest: 24, generals: [8, 4, 4, 2] },
  ];
  for (const entry of cases) {
    const chart = buildTaiyiChart({ year: entry.year, cycle: 360, dun: "阳遁", ruJu: null });
    expect(chart.input.ruJu).toBe(entry.ju);
    expect(chart.patterns.some(pattern => pattern.startsWith("关："))).toBe(true);
    expect(chart.counts.host).toBe(entry.host);
    expect(chart.counts.guest).toBe(entry.guest);
    expect([
      chart.counts.hostGeneralPalace, chart.counts.hostSuPalace,
      chart.counts.guestGeneralPalace, chart.counts.guestSuPalace,
    ]).toEqual(entry.generals);
  }
});

it("reconstructs four dated annual examples in 太乙统宗宝鉴卷四", () => {
  // Independently transcribed from the dated examples, not the product's ju table.
  const cases = [
    { year: 5, ju: 50, taiyi: 1, tian: "巳", host: 16, hostGeneral: 6, hostSu: 8, shi: "午", guest: 15 },
    { year: 214, ju: 43, taiyi: 8, tian: "子", host: 8, hostGeneral: 8 },
    { year: 324, ju: 9, taiyi: 3, tian: "艮", host: 3, hostGeneral: 3 },
    { year: 830, ju: 11, taiyi: 4, tian: "卯", host: 4, hostGeneral: 4, hostSu: 2, shi: "丑", guest: 4, guestGeneral: 4, guestSu: 2 },
  ];
  for (const entry of cases) {
    const c = buildTaiyiChart({ year: entry.year, cycle: 360, dun: "阳遁", ruJu: null });
    expect(c.input.ruJu, `${entry.year}局`).toBe(entry.ju);
    expect(c.taiyi.palace, `${entry.year}太乙`).toBe(entry.taiyi);
    expect(c.tianMu.position, `${entry.year}文昌`).toBe(entry.tian);
    expect(c.counts.host, `${entry.year}主算`).toBe(entry.host);
    expect(c.counts.hostGeneralPalace, `${entry.year}主大将`).toBe(entry.hostGeneral);
    if (entry.hostSu !== undefined) expect(c.counts.hostSuPalace).toBe(entry.hostSu);
    if (entry.shi !== undefined) expect(c.shiJi.position).toBe(entry.shi);
    if (entry.guest !== undefined) expect(c.counts.guest).toBe(entry.guest);
    if (entry.guestGeneral !== undefined) expect(c.counts.guestGeneralPalace).toBe(entry.guestGeneral);
    if (entry.guestSu !== undefined) expect(c.counts.guestSuPalace).toBe(entry.guestSu);
  }
});

it("preserves the 442 historical discrepancy without silently substituting the previous year", () => {
  // 南齐书「大小将皆见关」不能靠把442年改排为441年来制造吻合。
  const chart = buildTaiyiChart({ year: 442, cycle: 360, dun: "阳遁", ruJu: null });
  expect(chart.input.ruJu).toBe(55);
  expect([
    chart.counts.hostGeneralPalace, chart.counts.hostSuPalace,
    chart.counts.guestGeneralPalace, chart.counts.guestSuPalace,
  ]).toEqual([6, 8, 3, 9]);
  // 当前「关」兼收目与将同宫，不能用一个布尔标签证明四将皆关。
  expect(new Set([
    chart.counts.hostGeneralPalace, chart.counts.hostSuPalace,
    chart.counts.guestGeneralPalace, chart.counts.guestSuPalace,
  ]).size).toBe(4);
  expect(chart.patterns.some(pattern => pattern.startsWith("关："))).toBe(true);
  expect(chart.patterns).toContain("关：客大将、始击（客目）同在3宫");
  const previous = buildTaiyiChart({ year: 441, cycle: 360, dun: "阳遁", ruJu: null });
  expect(previous.input.ruJu).toBe(54);
  expect(previous.patterns.some(pattern => pattern.startsWith("关："))).toBe(true);
  expect(previous.patterns).toContain("关：主大将、始击（客目）同在8宫；主参将、客大将同在4宫");
});

it("compares 秘書 Yang charts 25–40 with the computed positions and counts", () => {
  // 太乙、天目、主算、主大、主参、始击、客算、客大、客参、计神。
  // 第28局两次写主参将，无法确定两项各对应哪一将，不改写成主大将。
  const cases: Array<[number, Array<string | number | null>]> = [
    [25, [1, "子", 39, 9, 7, "亥", 40, 4, 3, "寅"]],
    [26, [1, "丑", 32, 1, 6, "艮", 31, 6, 3, "丑"]],
    [27, [1, "艮", 31, 1, 3, "卯", 28, 8, 4, "子"]],
    [28, [2, "寅", 14, null, null, "巽", 9, 9, 7, "亥"]],
    [29, [2, "卯", 13, 3, 9, "未", 39, 9, 7, "戌"]],
    [30, [2, "辰", 10, 1, 3, "申", 32, 2, 6, "酉"]],
    [31, [3, "巽", 33, 3, 9, "戌", 10, 1, 3, "申"]],
    [32, [3, "巳", 25, 5, 5, "子", 8, 8, 4, "未"]],
    [33, [3, "午", 24, 4, 2, "艮", 3, 3, 9, "午"]],
    [34, [4, "未", 26, 6, 8, "卯", 4, 4, 2, "巳"]],
    [35, [4, "坤", 25, 5, 5, "巳", 28, 8, 4, "辰"]],
    [36, [4, "坤", 25, 5, 5, "午", 27, 7, 1, "卯"]],
    [37, [6, "申", 1, 1, 3, "坤", 7, 7, 1, "寅"]],
    [38, [6, "酉", 6, 6, 8, "戌", 25, 5, 5, "丑"]],
    [39, [6, "戌", 35, 5, 5, "亥", 34, 4, 2, "子"]],
    [40, [7, "乾", 27, 7, 1, "乾", 19, 9, 7, "亥"]],
  ];
  const names = ["太乙", "天目", "主算", "主大将", "主参将", "始击", "客算", "客大将", "客参将", "计神"];
  const differences: string[] = [];
  for (const [ruJu, expected] of cases) {
    const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu });
    const actual = [chart.taiyi.palace, chart.tianMu.position, chart.counts.host, chart.counts.hostGeneralPalace, chart.counts.hostSuPalace, chart.shiJi.position, chart.counts.guest, chart.counts.guestGeneralPalace, chart.counts.guestSuPalace, chart.jiShen.position];
    expected.forEach((value, index) => {
      if (value !== null && value !== actual[index]) differences.push(`阳${ruJu}局${names[index]}：秘書${value}／产品${actual[index]}`);
    });
  }
  expect(differences).toEqual([
    "阳25局客参将：秘書3／产品2",
    "阳26局主大将：秘書1／产品2",
    "阳26局客大将：秘書6／产品1",
    "阳38局客算：秘書25／产品35",
    "阳40局始击：秘書乾／产品丑",
  ]);
});

it("compares the missing 秘書 Yang 60 and variant Yang 58 against 圖書集成", () => {
  // 藝術典696卷作阳60局文昌亥、主算12、主将2/6、始击戌、客算13、客将3/9。
  const sixty = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 60 });
  expect([sixty.taiyi.palace, sixty.tianMu.position, sixty.counts.host,
    sixty.counts.hostGeneralPalace, sixty.counts.hostSuPalace, sixty.shiJi.position,
    sixty.counts.guest, sixty.counts.guestGeneralPalace, sixty.counts.guestSuPalace])
    .toEqual([4, "亥", 12, 2, 6, "戌", 13, 3, 9]);
  // 陽58局同卷主算12，秘書电子本作13；两书大将均二宫。
  const fiftyEight = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 58 });
  expect([fiftyEight.counts.host, fiftyEight.counts.hostGeneralPalace, fiftyEight.counts.hostSuPalace]).toEqual([12, 2, 6]);
});

it("compares the missing 秘書 Yin 60 with the separate 圖書集成 example", () => {
  // 藝術典692卷阴60：太乙六、文昌巳、主算十、主大一、主参二、始击戌、客算35。
  // 影印477册第116页：局图标主参三宫，正文标二宫；分别保存，不能当作秘书原文。
  const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu: 60 });
  expect([chart.taiyi.palace, chart.tianMu.position, chart.counts.host, chart.counts.hostGeneralPalace,
    chart.shiJi.position, chart.counts.guest]).toEqual([6, "巳", 10, 1, "戌", 35]);
  const sourceDiagram = 3;
  const sourceProse = 2;
  expect(chart.counts.hostSuPalace).toBe(sourceDiagram);
  expect(chart.counts.hostSuPalace).not.toBe(sourceProse);
  expect(generalSuPalace(1)).toBe(3);
  expect(chart.hostDeputySourceComparison).toMatchObject({ diagramPalace: 3, prosePalace: 2 });
  expect(serializeTaiyiToStructuredText(chart)).toContain("图列3宫，正文列2宫");
  expect(JSON.parse(serializeTaiyiToCompactJson(chart)).hostDeputySourceComparison.prosePalace).toBe(2);
  expect(buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 60 }).hostDeputySourceComparison).toBeNull();
  expect(buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu: 59 }).hostDeputySourceComparison).toBeNull();
  // 同一图中客大、客参均标五宫；正文仅说二将不出。
  expect([chart.counts.guestGeneralPalace, chart.counts.guestSuPalace]).toEqual([5, 5]);
});

it("compares readable 秘書 Yang charts 41–72 without repairing the text", () => {
  // 该电子本缺阳60局；41局六宫所属不明、49局写计辰而非计神，均不作确定字段。
  const cases: Array<[number, Array<string | number | null>]> = [
    [41, [7, "乾", 27, 7, 1, "寅", 16, null, 8, "戌"]],
    [42, [7, "亥", 27, 7, 1, "辰", 12, 2, 6, "酉"]],
    [43, [8, "子", 8, 8, 4, "巳", 17, 7, 1, "申"]],
    [44, [8, "丑", 33, 3, 9, "坤", 14, 4, 2, "未"]],
    [45, [8, "艮", 32, 1, 6, "酉", 7, 7, 1, "午"]],
    [46, [9, "寅", 5, 5, 5, "乾", 16, 6, 8, "巳"]],
    [47, [9, "卯", 4, 4, 2, "丑", 8, 8, 4, "辰"]],
    [48, [9, "辰", 1, 1, 3, "寅", 5, 5, 5, "卯"]],
    [49, [1, "巽", 24, 4, 2, "辰", 15, 5, 5, null]],
    [50, [1, "巳", 36, 6, 8, "午", 15, 5, 5, "丑"]],
    [51, [1, "午", 15, 5, 5, "坤", 16, 3, 9, "子"]],
    [52, [2, "未", 39, 9, 7, "酉", 31, 1, 3, "亥"]],
    [53, [2, "坤", 38, 8, 4, "亥", 25, 5, 5, "戌"]],
    [54, [2, "坤", 38, 8, 4, "子", 24, 4, 2, "酉"]],
    [55, [3, "申", 16, 6, 8, "艮", 3, 3, 9, "申"]],
    [56, [3, "酉", 15, 5, 5, "辰", 34, 4, 2, "未"]],
    [57, [3, "戌", 10, 1, 3, "巳", 25, 5, 5, "午"]],
    [58, [4, "乾", 13, 2, 6, "未", 26, 6, 8, "巳"]],
    [59, [4, "乾", 12, 2, 6, "申", 19, 9, 7, "辰"]],
    [61, [6, "子", 33, 3, 9, "亥", 34, 4, 2, "寅"]],
    [62, [6, "丑", 26, 6, 8, "艮", 25, 5, 5, "丑"]],
    [63, [6, "艮", 25, 5, 5, "卯", 22, 2, 6, "子"]],
    [64, [7, "寅", 16, 6, 8, "巽", 11, 1, 3, "亥"]],
    [65, [7, "卯", 15, 5, 5, "未", 1, 1, 3, "戌"]],
    [66, [7, "辰", 12, 2, 6, "申", 34, 4, 2, "酉"]],
    [67, [8, "巽", 25, 5, 5, "戌", 2, 2, 6, "申"]],
    [68, [8, "巳", 17, 7, 1, "子", 8, 8, 4, "未"]],
    [69, [8, "午", 16, 6, 8, "艮", 32, 2, 6, "午"]],
    [70, [9, "未", 30, 3, 9, "卯", 4, 4, 2, "巳"]],
    [71, [9, "坤", 29, 9, 7, "巳", 32, 2, 6, "辰"]],
    [72, [9, "坤", 29, 9, 7, "午", 22, 1, 3, "卯"]],
  ];
  const names = ["太乙", "天目", "主算", "主大将", "主参将", "始击", "客算", "客大将", "客参将", "计神"];
  const differences: string[] = [];
  let compared = 0;
  for (const [ruJu, expected] of cases) {
    const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu });
    const actual = [chart.taiyi.palace, chart.tianMu.position, chart.counts.host, chart.counts.hostGeneralPalace, chart.counts.hostSuPalace, chart.shiJi.position, chart.counts.guest, chart.counts.guestGeneralPalace, chart.counts.guestSuPalace, chart.jiShen.position];
    expected.forEach((value, index) => {
      if (value === null) return;
      compared++;
      if (value !== actual[index]) differences.push(`阳${ruJu}局${names[index]}：秘書${value}／产品${actual[index]}`);
    });
  }
  expect(compared).toBe(308);
  expect(differences).toEqual([
    "阳45局主大将：秘書1／产品2",
    "阳49局客算：秘書15／产品25",
    "阳50局主算：秘書36／产品16",
    "阳51局客算：秘書16／产品13",
    "阳58局主算：秘書13／产品12",
    "阳72局客算：秘書22／产品31",
  ]);
});

it("compares readable Yin charts 13–72 with 秘書 without silently correcting its text", () => {
  // 依维基文库《太乙秘書》阴局13–72逐条转录；缺第60局，未明示或未能直接映射的字段记 null。
  // 顺序：太乙、天目、主算、主大、主参、始击、客算、客大、客参、计神。
  const cases: Array<[number, Array<string | number | null>]> = [
    [13, [4, "乾", 12, 6, 6, "辰", 37, 7, 1, "申"]],
    [14, [4, "亥", 12, 2, 6, null, 27, 7, 1, "未"]],
    [15, [4, "子", 11, 1, 3, "坤", 25, 5, 5, "午"]],
    [16, [3, "丑", 1, 1, 3, "酉", 15, 5, 5, "巳"]],
    [17, [3, "艮", 3, 3, 9, "亥", 9, 9, 7, "辰"]],
    [18, [3, "艮", 3, 3, 9, "子", 8, 8, 4, "卯"]],
    [19, [2, "寅", 14, 4, 2, "艮", 16, 6, 8, "寅"]],
    [20, [2, "卯", 13, 3, 9, "辰", 10, 1, 3, "丑"]],
    [21, [2, "辰", 10, 1, 3, "巳", 1, 1, null, "子"]],
    [22, [1, "巽", 24, 4, 2, "未", 14, 4, 2, "亥"]],
    [23, [1, "巽", 20, 4, 2, "申", 7, 7, 1, "戌"]],
    [24, [1, "巳", 16, 6, 3, null, null, null, null, "酉"]],
    [25, [9, "午", 31, 1, 3, "亥", 16, 6, 8, "申"]],
    [26, [9, "未", 30, 3, 9, "艮", 7, 7, 1, "未"]],
    [27, [9, "坤", 29, 9, 7, "卯", 4, 4, 2, "午"]],
    [28, [8, "申", 8, 8, 4, "巽", 25, 5, 5, "巳"]],
    [29, [8, "酉", 7, 7, 1, "未", 15, 5, 5, "辰"]],
    [30, [8, "戌", 2, 2, 6, "申", 8, 8, 4, "卯"]],
    [31, [7, "乾", 27, 7, 1, null, 28, 8, 4, "寅"]],
    [32, [7, "亥", 27, 7, 1, "子", 26, 6, 8, "丑"]],
    [33, [7, "子", 26, 6, 8, "艮", 38, 8, 4, "子"]],
    [34, [6, "丑", 26, 6, 8, "卯", 22, 2, 6, "亥"]],
    [35, [6, "艮", 25, 5, 5, "巳", 10, 1, 3, "戌"]],
    [36, [6, "艮", 25, 5, 5, "午", 9, 9, 7, "酉"]],
    [37, [4, "寅", 1, 1, 3, "坤", 35, 5, 5, "申"]],
    [38, [4, "卯", 4, 4, 2, "戌", 13, 3, 9, "未"]],
    [39, [4, "辰", 37, 7, 1, null, 12, 1, 6, "午"]],
    [40, [3, "巽", 23, 3, 9, "丑", 1, 1, 3, "巳"]],
    [41, [3, "巽", 33, 3, 9, "寅", 38, 8, 4, "辰"]],
    [42, [3, "巳", 25, 5, 5, "辰", 34, 4, 2, "卯"]],
    [43, [2, "午", 2, 2, 6, "巳", 1, 1, 3, "寅"]],
    [44, [2, "未", 39, 9, 7, "坤", 38, 8, 4, "丑"]],
    [45, [2, "坤", 38, 8, 4, "酉", 31, 1, 3, "子"]],
    [46, [1, "申", 7, 7, 1, "乾", 1, 1, 3, "亥"]],
    [47, [1, "酉", 6, 6, 8, "丑", 32, 2, 6, "戌"]],
    [48, [1, "戌", 1, 1, 3, "寅", 19, 9, 7, "酉"]],
    [49, [9, "乾", 16, 6, 8, "辰", 1, 1, 3, "申"]],
    [50, [9, "亥", 16, 6, 8, "午", 31, 1, 3, "未"]],
    [51, [9, "子", 25, 5, 5, "坤", 29, 9, 7, "午"]],
    [52, [8, "丑", 33, 3, 9, "酉", 9, 9, 7, "巳"]],
    [53, [8, "艮", 32, 2, 6, "亥", 1, 1, 3, "辰"]],
    [54, [8, "艮", 32, 2, 6, "子", 8, 8, 4, "卯"]],
    [55, [7, "寅", 16, 6, 8, "艮", 18, 8, 4, "寅"]],
    [56, [7, "卯", 15, 5, 5, "辰", 12, 2, 6, "丑"]],
    [57, [7, "辰", 12, 2, 6, "巳", 3, 3, 9, "子"]],
    [58, [6, "巽", 18, 8, 4, "未", 8, 8, 4, "亥"]],
    [59, [6, "巽", 18, 8, 4, "申", 1, 1, 3, "戌"]],
    [61, [4, "午", 27, 7, 1, "亥", 12, 2, 6, "申"]],
    [62, [4, "未", 26, 6, 8, "艮", 30, 3, 9, "未"]],
    [63, [4, "坤", 25, 5, 5, "卯", 4, 4, 2, "午"]],
    [64, [3, "申", 16, 6, 8, "巽", 3, 3, 9, "巳"]],
    [65, [3, null, 15, 5, 5, "未", 23, 3, 9, "辰"]],
    [66, [3, "戌", 10, 1, 3, "申", 16, 6, 8, "卯"]],
    [67, [2, "乾", 25, 5, 5, "戌", 26, 6, 8, "寅"]],
    [68, [2, "亥", 25, 5, 5, "子", 24, 4, 2, "丑"]],
    [69, [2, "子", 24, 4, 2, "艮", 16, 6, 8, "子"]],
    [70, [1, "丑", 10, 2, 6, "卯", 28, 8, 4, "亥"]],
    [71, [1, "艮", 31, 1, 3, "巳", 16, 6, 8, "戌"]],
    [72, [1, "艮", 31, 1, 3, "亥", 25, 5, 5, "酉"]],
  ];
  const names = ["太乙", "天目", "主算", "主大将", "主参将", "始击", "客算", "客大将", "客参将", "计神"];
  const differences: string[] = [];
  let compared = 0;
  for (const [ruJu, expected] of cases) {
    const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu });
    const actual = [chart.taiyi.palace, chart.tianMu.position, chart.counts.host, chart.counts.hostGeneralPalace, chart.counts.hostSuPalace, chart.shiJi.position, chart.counts.guest, chart.counts.guestGeneralPalace, chart.counts.guestSuPalace, chart.jiShen.position];
    expected.forEach((value, index) => {
      if (value === null) return;
      compared++;
      if (value !== actual[index]) differences.push(`阴${ruJu}局${names[index]}：秘書${value}／产品${actual[index]}`);
    });
  }
  expect(compared).toBe(581);
  expect(differences).toEqual(["阴13局主大将：秘書6／产品2", "阴23局主算：秘書20／产品24", "阴24局主参将：秘書3／产品8", "阴33局客算：秘書38／产品18", "阴37局客算：秘書35／产品25", "阴39局客大将：秘書1／产品2", "阴40局主算：秘書23／产品33", "阴48局客算：秘書19／产品29", "阴51局主算：秘書25／产品15", "阴52局客算：秘書9／产品7", "阴52局客大将：秘書9／产品7", "阴52局客参将：秘書7／产品1", "阴62局客算：秘書30／产品3", "阴64局客算：秘書3／产品33", "阴70局主算：秘書10／产品32", "阴72局始击：秘書亥／产品午", "阴72局客算：秘書25／产品15"]);
  // 金镜式经卷三阴局立成：十三局主算12；十四局客目大威；十五局客算29。
  // 秘書十五局作25，不能把两部表的差异隐去。
  const fourteen = buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu: 14 });
  expect(fourteen.shiJi.position).toBe("午"); // 大威；秘書原文作未直接映射的「大感」
  const fifteen = buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu: 15 });
  expect(fifteen.counts.guest).toBe(25); // 金镜表另作29
  const twentyThree = buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu: 23 });
  expect(twentyThree.counts.host).toBe(24); // 金镜表亦作24，秘書作20
  for (const [ruJu, mishu, jinJing] of [[25, 31, 21], [26, 30, 31], [27, 29, 39]] as const) {
    const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu });
    expect(chart.counts.host).toBe(mishu);
    expect(chart.counts.host).not.toBe(jinJing); // 两书数字均明确，保留分歧
  }
  const thirtyThree = buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu: 33 });
  expect([thirtyThree.counts.guest, thirtyThree.counts.guestGeneralPalace, thirtyThree.counts.guestSuPalace]).toEqual([18, 8, 4]); // 金镜18；秘書38，大小将同为8、4
  const fiftyTwo = buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu: 52 });
  expect([fiftyTwo.counts.hostSuPalace, fiftyTwo.counts.guestGeneralPalace]).toEqual([9, 7]);
  expect(fiftyTwo.patterns.some(p => p.startsWith("关："))).toBe(false); // 秘書主参9、客大9，则有将间关
  const fiftyNine = buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu: 59 });
  expect([fiftyNine.counts.hostGeneralPalace, fiftyNine.counts.hostSuPalace, fiftyNine.counts.guestGeneralPalace, fiftyNine.counts.guestSuPalace]).toEqual([8, 4, 1, 3]);
  expect(fiftyNine.patterns.some(p => p.startsWith("关："))).toBe(false); // 秘書该条另称主客大小将相关
  // 秘書电子本缺阴60，独立比较金镜立成可明确读取的六字段，不把它们作为秘書数据。
  const sixty = buildTaiyiChart({ year: 724, cycle: 360, dun: "阴遁", ruJu: 60 });
  expect([sixty.taiyi.palace, sixty.tianMu.position, sixty.counts.host, sixty.shiJi.position, sixty.counts.guest, sixty.jiShen.position]).toEqual([6, "巳", 10, "戌", 35, "酉"]);
  // 《古今图书集成》艺术典692阴60：主大1、主参2；产品按三因取主参3。
  expect([sixty.counts.hostGeneralPalace, sixty.counts.hostSuPalace]).toEqual([1, 3]);
  expect(sixty.counts.hostSuPalace).not.toBe(2);
  expect([sixty.counts.guestGeneralPalace, sixty.counts.guestSuPalace]).toEqual([5, 5]);
});
