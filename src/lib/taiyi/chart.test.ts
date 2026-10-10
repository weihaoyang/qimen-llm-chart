import { describe, expect, it } from "vitest";
import { accumulatedYears, buildTaiyiChart, countSum, detectPatterns, generalPalace, generalSuPalace, harmonyLevel, harmonyLevelVariant, jiShenPosition, parityLabel, ruJuNumber, shiJiPosition, taiyiPalace, tianMuPosition } from "./chart";
import { DEITIES, GENERALS, PALACES, PALACE_SEQUENCE, PATTERNS } from "./data";
import { DEITY_POSITION, MISHU_CORPUS, type MishuField } from "./mishu-corpus";
import { serializeTaiyiToCompactJson, serializeTaiyiToStructuredText } from "./serializer";

describe("taiyi tables", () => {
  it("ships the sixteen deities, nine palaces, eight generals and the sourced patterns", () => {
    expect(DEITIES).toHaveLength(16);
    expect(PALACES).toHaveLength(9);
    expect(GENERALS).toHaveLength(8);
    expect(PATTERNS.map((pattern) => pattern.name)).toEqual(["掩", "击", "迫", "囚", "关", "格", "对", "四郭固", "四郭杜", "提挟", "杜塞"]);
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
    // 另一系和数清单（出处待考，本仓不归属书名）
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
  return entry.split("：")[0];
});

describe("《太乙秘書》阳局 1–24 · 阴局 1–12 逐局回归（36 局）", () => {
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
