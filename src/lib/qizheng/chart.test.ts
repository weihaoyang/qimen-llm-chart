import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { ayanamsa } from "@/lib/vedic/ayanamsa";
import { buildQizhengChart, niuMansionComparison, hourToBranchIndex, longitudeToMansion, longitudeToPalace, mingPalaceIndex, qizhengPalaces, SEVEN_LUMINARIES, TWELVE_PALACES } from "./chart";
import { serializeQizhengToCompactJson, serializeQizhengToStructuredText } from "./serializer";

const profile = () => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return normalizeProfileInput(input);
};

// 历元：康熙二十三年甲子（1684-01-01.0 UT），与 chart.ts 的 MANSION_EPOCH_JD 一致。
const EPOCH_UT = Date.UTC(1684, 0, 1);
const JD_EPOCH = EPOCH_UT / 86_400_000 + 2_440_587.5;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

// 岁差自 1684 历元起的东行量（度），即「回归黄经 − 恒星黄经」。
const drift = (millis: number) => ayanamsa(millis / 86_400_000 + 2_440_587.5) - ayanamsa(JD_EPOCH);

describe("qizheng siyu chart", () => {
  it("uses fixed 卯 for 命宫 while disclosing the conflicting seasonal sunrise method", () => {
    // 太阳辰、生时午：从午顺数到卯，太阳宫顺进九位，命在丑。
    expect(mingPalaceIndex(4, 6)).toBe(1);
    // 《春树斋丛说》引通艺录：太阳未宫、子时，遇卯法立命戌。
    expect(mingPalaceIndex(7, 0)).toBe(10);
    const chart = buildQizhengChart(profile());
    const text = serializeQizhengToStructuredText(chart);
    const json = JSON.parse(serializeQizhengToCompactJson(chart));
    expect(text).toContain("依季节日出时辰起算");
    expect(json.disclaimer).toContain("本站未实现其完整方法");
  });
  it("places the twelve houses backwards from 命 as in 张果星宗 and keeps stars consistent", () => {
    expect(qizhengPalaces(2).map((palace) => palace.branch)).toEqual([..."寅丑子亥戌酉申未午巳辰卯"]);
    expect(qizhengPalaces(0).map((palace) => palace.branch)).toEqual([..."子亥戌酉申未午巳辰卯寅丑"]);
    // 《完孝录》卷四〈图解〉：命在子时各宫的宫主，按十二宫逆布顺序。
    expect(qizhengPalaces(0).map((palace) => palace.ruler)).toEqual([
      "土星", "木星", "火星", "金星", "水星", "太阴",
      "太阳", "水星", "金星", "火星", "木星", "土星",
    ]);
    for (let ming = 0; ming < 12; ming++) {
      const palaces = qizhengPalaces(ming);
      expect(new Set(palaces.map((palace) => palace.index)).size).toBe(12);
      expect(palaces.map((palace) => palace.name)).toEqual([...TWELVE_PALACES]);
      expect(palaces[1].index).toBe((ming + 11) % 12);
    }
    const chart = buildQizhengChart(profile());
    for (const star of chart.stars) {
      expect(star.palaceName).toBe(chart.palaces.find((palace) => palace.index === star.palace)?.name);
    }
    const text = serializeQizhengToStructuredText(chart);
    const json = JSON.parse(serializeQizhengToCompactJson(chart));
    for (const palace of chart.palaces) expect(text).toContain(`${palace.name}(${palace.branch}) · 宫主${palace.ruler}`);
    expect(json.palaces).toEqual(chart.palaces);
    expect(json.stars.map((star: { palaceName: string }) => star.palaceName)).toEqual(chart.stars.map((star) => star.palaceName));
  });
  it("derives stellar degree rulers from the mansion independently of the palace ruler", () => {
    const chart = buildQizhengChart(profile());
    const rouhu = chart.stars.find((star) => star.name === "罗睺");
    const jidu = chart.stars.find((star) => star.name === "计都");
    expect(rouhu).toMatchObject({ branch: "午", mansion: "柳", mansionRuler: "土星" });
    expect(jidu).toMatchObject({ branch: "子", mansion: "牛", mansionRuler: "金星" });
    expect(chart.palaces.find((palace) => palace.branch === rouhu?.branch)?.ruler).toBe("太阳");
    expect(chart.palaces.find((palace) => palace.branch === jidu?.branch)?.ruler).toBe("土星");
    const text = serializeQizhengToStructuredText(chart);
    expect(text).toContain("宿柳 · 度主土星");
    expect(text).toContain("宿牛 · 度主金星");
    const json = JSON.parse(serializeQizhengToCompactJson(chart));
    expect(json.stars).toContainEqual(expect.objectContaining({ name: "计都", mansionRuler: "金星" }));
  });

  it("maps longitudes into palaces with the classical 十二次 (Aries = 戌)", () => {
    expect(longitudeToPalace(0)).toBe(10); // 0° 白羊 → 戌宫
    expect(longitudeToPalace(30)).toBe(9); // 30° 金牛 → 酉宫
    expect(longitudeToPalace(180)).toBe(4); // 180° 天秤 → 辰宫
    expect(longitudeToPalace(300)).toBe(0); // 300° 水瓶 → 子宫
    expect(longitudeToPalace(330)).toBe(11); // 330° 双鱼 → 亥宫
    expect(TWELVE_PALACES[0]).toBe("命宫");
  });

  it("uses the Qing ecliptic mansion degrees (《二十八宿黄道经纬度钤》) instead of equal 360/28 divisions", () => {
    // 宿界即距星。原表历元 1684、初宫（星纪初）起冬至＝回归黄经 270°。
    // 原文「斗初宫五度五十分」→ 270° + 5°50′ = 275.8333°；「觜五宫十九度二十二分」→ 79.3667°。
    expect(longitudeToMansion(275.8334, EPOCH_UT)).toBe("斗"); // 距星本身即在宿初
    expect(longitudeToMansion(275.8, EPOCH_UT)).toBe("箕"); // 差一点即退入前一宿
    expect(longitudeToMansion(79.3667, EPOCH_UT)).toBe("觜");
    expect(longitudeToMansion(90.9167, EPOCH_UT)).toBe("井"); // 原文「井六宫初度五十五分」

    // 古典宿度不等分，且与等分 360/28 明显不同：
    // 井三十度二十五分最阔，房四度五十分、参一度二十一分最狭。
    expect(longitudeToMansion(105, EPOCH_UT)).toBe("井"); // 井横跨约 90.9°–121.3°
    expect(longitudeToMansion(120, EPOCH_UT)).toBe("井");
    expect(longitudeToMansion(121.4, EPOCH_UT)).toBe("鬼");
    expect(longitudeToMansion(239.9, EPOCH_UT)).toBe("房"); // 房仅约 4.8° 宽
    expect(longitudeToMansion(243.4, EPOCH_UT)).toBe("心");
    expect(longitudeToMansion(250.9, EPOCH_UT)).toBe("尾");
  });

  it("keeps the 牛 boundary from 推步法解 at 29°37′ in the first palace", () => {
    // 五礼通考 CADAL06066771 原扫描第126页（卷195版心十三）刻29°27′；
    // 这是已目验的传本异文，29°32′区分两种宿界，不是转录错误的假设。
    expect(longitudeToMansion(299 + 32 / 60, EPOCH_UT)).toBe("斗");
    expect(longitudeToMansion(299 + 36.99 / 60, EPOCH_UT)).toBe("斗");
    expect(longitudeToMansion(299 + 37.01 / 60, EPOCH_UT)).toBe("牛");
  });

  it("exposes only the 牛 boundary discrepancy and keeps its historical scope explicit", () => {
    const below = 299 + 26.99 / 60, start = 299 + 27 / 60, middle = 299 + 32 / 60, end = 299 + 37 / 60;
    expect(niuMansionComparison(below, EPOCH_UT)).toBeUndefined();
    expect(niuMansionComparison(start, EPOCH_UT)?.mansion).toBe("牛");
    expect(longitudeToMansion(middle, EPOCH_UT)).toBe("斗");
    expect(niuMansionComparison(middle, EPOCH_UT)).toMatchObject({ mansion: "牛", method: expect.stringContaining("其他宿界和岁差仍用本站口径") });
    expect(niuMansionComparison(end, EPOCH_UT)).toBeUndefined();
    const instant = utc("2026-01-01");
    expect(niuMansionComparison(middle + drift(instant), instant)?.mansion).toBe("牛");
    expect(niuMansionComparison(end + drift(instant) + 0.0001, instant)).toBeUndefined();
  });

  it("shows the 牛 boundary variant for an actual solar position and carries it through exports", () => {
    const input = getDefaultProfileInput(new Date("2026-01-24T14:00:00+08:00"), "Asia/Shanghai");
    const chart = buildQizhengChart(normalizeProfileInput(input));
    const sun = chart.stars.find(item => item.name === "太阳")!;
    expect(sun.longitude).toBeCloseTo(304.2518778, 5);
    expect(sun.mansion).toBe("斗");
    expect(sun.mansionComparison?.mansion).toBe("牛");
    expect(serializeQizhengToStructuredText(chart)).toContain("宿斗（牛宿界对照：牛");
    expect(JSON.parse(serializeQizhengToCompactJson(chart)).stars.find((item: { name: string }) => item.name === "太阳").mansionComparison.mansion).toBe("牛");
    const next = getDefaultProfileInput(new Date("2026-01-25T14:00:00+08:00"), "Asia/Shanghai");
    expect(buildQizhengChart(normalizeProfileInput(next)).stars.find(item => item.name === "太阳")?.mansionComparison).toBeUndefined();
  });

  it("uses the 柳 boundary corroborated by the 五礼通考 and the mansion width table", () => {
    expect(longitudeToMansion(125 + 51.99 / 60, EPOCH_UT)).toBe("鬼");
    expect(longitudeToMansion(125 + 54 / 60, EPOCH_UT)).toBe("柳");
  });

  it("distinguishes modern precession from the historical 51 arcseconds per year", () => {
    const longitude = 130.68;
    const historicalDrift = (2026 - 1684) * 51 / 3600;
    expect(longitudeToMansion(longitude - historicalDrift, EPOCH_UT)).toBe("鬼");
    expect(longitudeToMansion(longitude, utc("2026-01-01"))).toBe("柳");
  });

  it("keeps the twenty-eight 宿度 summing to 360° and follows the 1684 参前觜后 order", () => {
    // 原表自洽性：28 宿距度（相邻距星之差）合计应恰为 360°。
    // 由本函数在历元下逐宿取样统计：把 0°–360° 以极细步长分给 28 宿并按宿名归并宽度。
    const widths = new Map<string, number>();
    const step = 0.001;
    for (let lng = 0; lng < 360; lng += step) {
      const name = longitudeToMansion(lng + step / 2, EPOCH_UT);
      widths.set(name, (widths.get(name) ?? 0) + step);
    }
    expect(widths.size).toBe(28);
    const total = [...widths.values()].reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(360, 1);
    // 《中西算学丛书初编》整度表，单位为角分。
    const sourceWidths = {
      斗: 1427, 牛: 466, 女: 698, 虚: 599, 危: 1207, 室: 941, 壁: 786,
      奎: 699, 娄: 780, 胃: 735, 昴: 555, 毕: 838, 参: 81, 觜: 693,
      井: 1825, 鬼: 272, 柳: 1024, 星: 503, 张: 1084, 翼: 1020, 轸: 783,
      角: 637, 亢: 638, 氐: 1070, 房: 290, 心: 453, 尾: 956, 箕: 540,
    };
    for (const [name, arcminutes] of Object.entries(sourceWidths)) {
      expect(Math.round((widths.get(name) ?? 0) * 60), name).toBe(arcminutes);
    }

    // 觜／参次序：本表为康熙二十三年「参前觜后」（参 [78.0167,79.3667)，觜 [79.3667,90.9167)），
    // 与《清史稿》康熙甲子「鹑首＝觜觿一十度三十八分」一致（90° 应落于觜宿）。
    expect(longitudeToMansion(79.0, EPOCH_UT)).toBe("参");
    expect(longitudeToMansion(79.4, EPOCH_UT)).toBe("觜");
    expect(longitudeToMansion(90.0, EPOCH_UT)).toBe("觜");
  });

  it("anchors the mansion frame to real determinative stars (Spica as the start of 角宿)", () => {
    // 角宿距星 ＝ 角宿一（Spica, α Vir；J2000.0 赤经 201.29825°、赤纬 −11.16132°）。
    // 换算得 J2000.0 回归黄经 203.8414°，由本仓岁差折回 1684 历元得 199.4304°，
    // 与原表「角九宫十九度二十六分」＝199.4333° 相差 0.003°（＝原表度分取整量级）。
    const spica2000 = 203.8414;
    const spica1684 = spica2000 - drift(utc("2000-01-01"));
    expect(spica1684).toBeCloseTo(199.4333, 1);
    // 因宿界即 Spica 本身，恰在界上不判；改取其两侧 0.5°：
    expect(longitudeToMansion(spica2000 + 0.5, utc("2000-01-01"))).toBe("角");
    expect(longitudeToMansion(spica2000 - 0.5, utc("2000-01-01"))).toBe("轸");
  });

  it("reproduces all twelve Kangxi ecliptic sector starts recorded in the Qing history", () => {
    // 《清史稿》卷二十八：康熙甲子年黄道十二次初度值宿。
    // 星纪初为冬至，顺行每三十度一宫。
    const expected = ["箕", "牛", "危", "室", "娄", "昴", "觜", "井", "星", "翼", "角", "房"];
    expect(expected.map((_, index) => longitudeToMansion(270 + index * 30, EPOCH_UT))).toEqual(expected);
  });

  it("moves mansion boundaries with precession (same tropical longitude belongs to an earlier mansion at a later epoch)", () => {
    // 恒星沿黄道东行，故固定的回归黄经在愈晚的历元愈靠近「其东侧」宿界之前，落宿遂西移一宿。
    // 199.4333° 是角宿距星在 1684 的回归黄经：该年属角，到 2100 年角宿界已东行约 5.8°，
    // 同一黄经便落入轸宿。这一方向性正是《钤》「经度每岁东行五十一秒」所指。
    expect(longitudeToMansion(199.5, EPOCH_UT)).toBe("角");
    expect(longitudeToMansion(199.4, EPOCH_UT)).toBe("轸");
    expect(longitudeToMansion(199.5, utc("2100-01-01"))).toBe("轸");
    // 岁差东行量：2100 年约 5.8°，J2000 恰 4.411°（与 Spica 一节的换算自洽）。
    expect(drift(utc("2100-01-01"))).toBeGreaterThan(5);
    expect(drift(utc("2100-01-01"))).toBeLessThan(6);
    expect(drift(utc("2000-01-01"))).toBeCloseTo(4.411, 2);
  });

  it("derives 命宫 with the Guolao rule (sun palace + birth hour, counted to 卯)", () => {
    expect(hourToBranchIndex(0)).toBe(0); // 子时
    expect(hourToBranchIndex(8)).toBe(4); // 辰时
    expect(hourToBranchIndex(22)).toBe(11); // 亥时
    // 生时即卯 → 命宫 = 太阳宫
    expect(mingPalaceIndex(10, 3)).toBe(10);
    // 太阳在戌、午时：午→戌 顺数至卯落未
    expect(mingPalaceIndex(10, 6)).toBe(7);
    // 太阳在戌、子时：命宫 = 太阳宫 + 3
    expect(mingPalaceIndex(10, 0)).toBe(1);
  });

  it("maps the imported table using the selected twelve-palace mapping", () => {
    const input: ProfileInput = getDefaultProfileInput(new Date("1990-03-21T12:00:00+08:00"), "Asia/Shanghai");
    input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
    const chart = buildQizhengChart(normalizeProfileInput(input));
    const sun = chart.stars.find((star) => star.name === "太阳");
    expect(sun?.branch).toBe("戌"); // 太阳位于白羊
    expect(sun?.dignity).toBe("庙"); // 太阳庙于戌宫
  });

  it("keeps the imported lunar dignity table distinct from Xingxue Dacheng volume 19", () => {
    // 卷十九太阴论：庙戌、旺酉；同卷又把巨蟹（未）称为本宫。
    const cases = [
      ["2026-01-24T12:00:00+08:00", "戌", "未列", "庙"],
      ["2026-01-26T12:00:00+08:00", "酉", "陷", "旺"],
      ["2026-01-03T12:00:00+08:00", "未", "庙", "本宫"],
    ] as const;
    for (const [date, branch, imported, classical] of cases) {
      const input = getDefaultProfileInput(new Date(date), "Asia/Shanghai");
      const moon = buildQizhengChart(normalizeProfileInput(input)).stars.find((star) => star.name === "太阴");
      expect(moon?.branch).toBe(branch);
      expect(moon?.dignity).toBe(imported);
      expect(moon?.dignity).not.toBe(classical);
      if (branch === "未") expect(moon?.classicalDignity).toEqual({ label: "本宫", volume: 19, passage: "太阴行度" });
      else expect(moon?.classicalDignity).toEqual({ label: classical, volume: 19 });
    }
  });

  it("transcribes the selected solar and lunar palace passages without filling unlisted positions", () => {
    // 卷十八太陽論、卷十九太隂論；逐日覆盖十二宫，同时检查未列的宫不被补值。
    const expected: Record<string, Record<string, string>> = {
      太阳: { 戌: "庙", 巳: "乐", 辰: "好", 寅: "喜", 午: "旺", 酉: "怒" },
      太阴: { 戌: "庙", 酉: "旺", 巳: "喜", 申: "乐", 亥: "顺", 丑: "顺", 寅: "怒", 未: "本宫" },
    };
    const seen: Record<string, Set<string>> = { 太阳: new Set(), 太阴: new Set() };
    for (let day = 0; day < 366; day++) {
      const date = new Date(Date.UTC(2026, 0, 1 + day, 4));
      const chart = buildQizhengChart(normalizeProfileInput(getDefaultProfileInput(date, "Asia/Shanghai")));
      for (const name of ["太阳", "太阴"]) {
        const star = chart.stars.find((item) => item.name === name)!;
        seen[name].add(star.branch);
        const label = expected[name][star.branch];
        expect(star.classicalDignity, `${name} ${star.branch}`).toEqual(
          label ? { label, volume: name === "太阳" ? 18 : 19,
            ...(name === "太阳" && ["戌", "午"].includes(star.branch) ? { passage: "太阳论", alternatives: [{ label: "本殿", passage: "太阳殿局朝元" }] } : {}),
            ...(name === "太阴" && star.branch === "未" ? { passage: "太阴行度" } : {}),
          } : undefined,
        );
      }
    }
    expect(seen.太阳.size).toBe(12);
    expect(seen.太阴.size).toBe(12);
  });

  it("exposes solar 本殿 and lunar 本宫 as sourced terms across structured exports", () => {
    const cases = [
      ["2026-03-25T12:00:00+08:00", "太阳", "戌", "庙", "太阳论", "太阳殿局朝元"],
      ["2026-07-25T12:00:00+08:00", "太阳", "午", "旺", "太阳论", "太阳殿局朝元"],
      ["2026-01-03T12:00:00+08:00", "太阴", "未", "本宫", "太阴行度", ""],
    ] as const;
    for (const [date, name, branch, label, passage, second] of cases) {
      const chart = buildQizhengChart(normalizeProfileInput(getDefaultProfileInput(new Date(date), "Asia/Shanghai")));
      const star = chart.stars.find(s => s.name === name)!;
      expect(star.branch).toBe(branch);
      expect(star.classicalDignity).toMatchObject({ label, passage });
      const text = serializeQizhengToStructuredText(chart);
      expect(text).toContain(`〈${passage}〉：${label}`);
      if (second) expect(text).toContain(`〈${second}〉：本殿`);
      const jsonStar = JSON.parse(serializeQizhengToCompactJson(chart)).stars.find((s: { name: string }) => s.name === name);
      expect(jsonStar.classicalDignity).toEqual(star.classicalDignity);
    }
  });
  it("retains the 2026 remnant examples in both exports", () => {
    const chart = buildQizhengChart(normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-03T12:00:00+08:00"), "Asia/Shanghai")));
    expect(chart.stars.find(s => s.name === "计都")).toMatchObject({ branch: "亥", classicalDignity: { label: "庙", volume: 22, passage: "计都论" } });
    expect(chart.stars.find(s => s.name === "月孛")).toMatchObject({ branch: "寅", classicalDignity: { label: "旺", volume: 20, passage: "月孛论" } });
    expect(chart.stars.find(s => s.name === "罗睺")?.classicalDignity).toBeUndefined();
    const text = serializeQizhengToStructuredText(chart);
    expect(text).toContain("星学大成卷22〈计都论〉：庙");
    expect(text).toContain("星学大成卷20〈月孛论〉：旺");
    const exported = JSON.parse(serializeQizhengToCompactJson(chart)).stars.find((s: { name: string }) => s.name === "计都");
    expect(exported.classicalDignity.label).toBe("庙");
  });
  it("transcribes all four remnant palace labels without inventing unlisted ones", () => {
    const entries: Record<string, { volume: number; positions: Record<string, string> }> = {
      紫气: { volume: 19, positions: { 丑: "庙", 亥: "旺", 寅: "好", 申: "乐", 午: "喜", 戌: "喜", 未: "怒" } },
      月孛: { volume: 20, positions: { 未: "庙", 寅: "旺", 巳: "好", 酉: "乐", 申: "喜", 子: "顺", 戌: "怒" } },
      罗睺: { volume: 21, positions: { 午: "庙", 卯: "乐", 辰: "旺", 酉: "好", 戌: "喜", 申: "怒" } },
      计都: { volume: 22, positions: { 亥: "庙", 戌: "旺", 寅: "乐", 未: "好", 卯: "喜", 巳: "喜", 辰: "怒" } },
    };
    const seen = Object.fromEntries(Object.keys(entries).map(name => [name, new Set<string>()]));
    for (let month = 0; month < 36 * 12; month++) {
      const date = new Date(Date.UTC(1990, month, 15, 4));
      const chart = buildQizhengChart(normalizeProfileInput(getDefaultProfileInput(date, "Asia/Shanghai")));
      for (const [name, reference] of Object.entries(entries)) {
        const star = chart.stars.find(item => item.name === name)!;
        seen[name].add(star.branch);
        const label = reference.positions[star.branch];
        expect(star.classicalDignity, `${name} ${star.branch} ${date.toISOString()}`).toEqual(label ? { label, volume: reference.volume, passage: `${name}论` } : undefined);
        expect(star.dignity).toBe("—");
      }
    }
    for (const name of Object.keys(entries)) expect(seen[name].size, name).toBe(12);
  });
  it("compares Jupiter and Mars palace labels with the Xingxue Dacheng passages", () => {
    // 卷十四：木庙亥、旺未；卷十五：火乐戌、旺丑。现用表另行保存。
    const cases = [
      ["1990-07-15T12:00:00+08:00", "木星", "未", "庙", "旺"],
      ["1998-07-15T12:00:00+08:00", "木星", "亥", "旺", "庙"],
      ["1990-06-15T12:00:00+08:00", "火星", "戌", "旺", "乐"],
      ["1990-02-15T12:00:00+08:00", "火星", "丑", "未列", "旺"],
    ] as const;
    for (const [date, name, branch, imported, classical] of cases) {
      const input = getDefaultProfileInput(new Date(date), "Asia/Shanghai");
      const star = buildQizhengChart(normalizeProfileInput(input)).stars.find((item) => item.name === name);
      expect(star?.branch, date).toBe(branch);
      expect(star?.dignity, date).toBe(imported);
      expect(star?.dignity, date).not.toBe(classical);
      expect(star?.classicalDignity?.label, date).toBe(classical);
    }
  });

  it("preserves both conflicting Mars passages in the same volume in exports", () => {
    const input = getDefaultProfileInput(new Date("1990-06-15T12:00:00+08:00"), "Asia/Shanghai");
    const chart = buildQizhengChart(normalizeProfileInput(input));
    const mars = chart.stars.find((star) => star.name === "火星")!;
    expect(mars.branch).toBe("戌");
    expect(mars.classicalDignity).toEqual({
      label: "乐", volume: 15, passage: "火星庙旺乐顺留伏逆",
      alternatives: [{ label: "好", passage: "火星论" }],
    });
    const text = serializeQizhengToStructuredText(chart);
    expect(text).toContain("〈火星庙旺乐顺留伏逆〉：乐；〈火星论〉：好");
    expect(JSON.parse(serializeQizhengToCompactJson(chart)).stars.find((s: { name: string }) => s.name === "火星").classicalDignity).toEqual(mars.classicalDignity);
  });

  it("compares Venus, Saturn and Mercury palace labels with selected classical passages", () => {
    // 《星学大成》卷16、17；"本宫"、"庙旺"按原文保留，不推断一一等义。
    const cases = [
      ["1990-10-15T12:00:00+08:00", "金星", "辰", "未列", "庙旺"],
      ["1990-01-15T12:00:00+08:00", "土星", "丑", "未列", "庙"],
      ["2009-11-15T12:00:00+08:00", "土星", "辰", "未列", "旺"],
      ["1990-08-15T12:00:00+08:00", "水星", "巳", "庙", "旺"],
      ["1990-06-15T12:00:00+08:00", "水星", "申", "旺", "本宫"],
    ] as const;
    for (const [date, name, branch, imported, classical] of cases) {
      const input = getDefaultProfileInput(new Date(date), "Asia/Shanghai");
      const star = buildQizhengChart(normalizeProfileInput(input)).stars.find((item) => item.name === name);
      expect(star?.branch, date).toBe(branch);
      expect(star?.dignity, date).toBe(imported);
      expect(star?.dignity, date).not.toBe(classical);
      expect(star?.classicalDignity?.label, date).toBe(classical);
    }
  });

  it("covers additional classical planet palace positions and preserves same-volume alternatives", () => {
    // 星学大成卷十四木星论、卷十六土星论与金星论、卷十七水星论。
    const expected: Record<string, Record<string, string>> = {
      木星: { 寅: "乐", 申: "好", 子: "怒", 丑: "怒", 未: "旺" },
      土星: { 子: "乐", 戌: "好", 午: "喜" },
      火星: { 未: "乐", 申: "喜", 寅: "好", 酉: "怒", 辰: "怒" },
      金星: { 亥: "旺", 巳: "好", 午: "喜", 寅: "怒", 辰: "庙旺" },
      水星: { 午: "庙", 辰: "喜", 亥: "好", 子: "好", 戌: "怒" },
    };
    const seen = new Set<string>();
    for (let month = 0; month < 31 * 12; month++) {
      const date = new Date(Date.UTC(1990, month, 15, 4));
      const chart = buildQizhengChart(normalizeProfileInput(getDefaultProfileInput(date, "Asia/Shanghai")));
      for (const star of chart.stars) {
        const label = expected[star.name]?.[star.branch];
        if (!label) continue;
        expect(star.classicalDignity?.label, `${star.name}${star.branch}`).toBe(label);
        if (star.name === "火星") expect(star.classicalDignity?.passage).toBe("火星论");
        if (star.name === "木星" && star.branch === "未") {
          expect(star.classicalDignity?.alternatives).toEqual([{ label: "喜", passage: "木星论" }]);
          expect(serializeQizhengToStructuredText(chart)).toContain("〈木星庙乐旺顺留伏逆〉：旺；〈木星论〉：喜");
        }
        if (star.name === "金星" && star.branch === "辰") {
          expect(star.classicalDignity?.alternatives).toEqual([{ label: "庙", passage: "金星论" }]);
          expect(serializeQizhengToStructuredText(chart)).toContain("〈金星庙旺乐顺伏留逆〉：庙旺；〈金星论〉：庙");
        }
        seen.add(star.name + star.branch);
      }
    }
    expect(seen.size).toBe(Object.values(expected).reduce((count, branches) => count + Object.keys(branches).length, 0));
  });

  it("keeps exported longitude consistent with palace and mansion near boundaries", () => {
    let oldRoundedMismatch = false;
    for (let minute = 0; minute < 24 * 60; minute++) {
      const date = new Date(Date.UTC(2026, 2, 20, 0, minute));
      const chart = buildQizhengChart(normalizeProfileInput(getDefaultProfileInput(date, "UTC")));
      for (const star of chart.stars) {
        expect(longitudeToPalace(star.longitude), `${date.toISOString()} ${star.name}`).toBe(star.palace);
        expect(longitudeToMansion(star.longitude, date.getTime()), `${date.toISOString()} ${star.name}`).toBe(star.mansion);
        if (longitudeToPalace(Number(star.longitude.toFixed(2))) !== star.palace) oldRoundedMismatch = true;
      }
    }
    expect(oldRoundedMismatch).toBe(true);
  });

  it("places seven luminaries and four remainders", () => {
    const chart = buildQizhengChart(profile());
    expect(chart.format).toBe("qmdj-qizheng-chart-v1");
    expect(chart.complete).toBe(true);
    const luminaries = chart.stars.filter((star) => star.kind === "七政");
    const remainders = chart.stars.filter((star) => star.kind === "四余");
    expect(luminaries).toHaveLength(SEVEN_LUMINARIES.length);
    expect(remainders.map((star) => star.name)).toEqual(["罗睺", "计都", "月孛", "紫气"]);
    expect(chart.palaces).toHaveLength(12);
    expect(chart.palaces[0]?.name).toBe("命宫");
    for (const star of chart.stars) {
      expect(star.longitude).toBeGreaterThanOrEqual(0);
      expect(star.longitude).toBeLessThan(360);
      expect(star.mansion.length).toBeGreaterThan(0);
      expect(star.palaceName.length).toBeGreaterThan(0);
    }
  });

  it("distinguishes four remainder classifications from the seven luminaries", () => {
    const chart = buildQizhengChart(profile());
    for (const [name, element] of [["罗睺", "火余"], ["计都", "土余"], ["月孛", "水余"], ["紫气", "木余"]] as const) {
      const star = chart.stars.find(item => item.name === name)!;
      expect(star.element).toBe(element);
      expect(star.note).toMatch(/《图书编》|《星学正传》/);
      expect(serializeQizhengToStructuredText(chart)).toContain(` · ${element} · `);
      expect(JSON.parse(serializeQizhengToCompactJson(chart)).stars.find((item: { name: string }) => item.name === name).element).toBe(element);
    }
    expect(chart.stars.find(item => item.name === "火星")?.element).toBe("火");
    expect(chart.stars.find(item => item.name === "土星")?.element).toBe("土");
    expect(chart.stars.find(item => item.name === "水星")?.element).toBe("水");
  });

  it("keeps 罗睺 and 计都 opposite and is deterministic", () => {
    const chart = buildQizhengChart(profile());
    const luo = chart.stars.find((star) => star.name === "罗睺");
    const ji = chart.stars.find((star) => star.name === "计都");
    expect(luo && ji).toBeTruthy();
    const delta = Math.abs((luo?.longitude ?? 0) - (ji?.longitude ?? 0));
    expect(Math.min(delta, 360 - delta)).toBeCloseTo(180, 1);
    expect(buildQizhengChart(profile())).toEqual(chart);
  });

  it("compares the opposed node names without claiming to recompute the historical ephemeris", () => {
    for (const p of [profile(), normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-03T12:00:00+08:00"), "Asia/Shanghai"))]) {
      const chart = buildQizhengChart(p);
      const luo = chart.stars.find(star => star.name === "罗睺")!;
      const ji = chart.stars.find(star => star.name === "计都")!;
      for (const [current, opposite] of [[luo, ji], [ji, luo]]) {
        expect(current.nodeConventionComparison).toMatchObject({ longitude: opposite.longitude, branch: opposite.branch, palaceName: opposite.palaceName, mansion: opposite.mansion, method: expect.stringContaining("并非重算古历") });
        expect(current.branch).not.toBe(opposite.branch);
      }
      if (chart.input.civilDateTime.startsWith("1990")) {
        expect(luo).toMatchObject({ branch: "午", mansion: "柳", nodeConventionComparison: { branch: "子", mansion: "牛" } });
      } else {
        expect(luo).toMatchObject({ branch: "巳", mansion: "张", nodeConventionComparison: { branch: "亥", mansion: "危" } });
      }
      expect(chart.stars.find(star => star.name === "月孛")?.nodeConventionComparison).toBeUndefined();
      const text = serializeQizhengToStructuredText(chart);
      expect(text).toContain(`新法命名对照：${ji.longitude}°`);
      const json = JSON.parse(serializeQizhengToCompactJson(chart));
      expect(json.stars.find((star: { name: string }) => star.name === "罗睺").nodeConventionComparison).toEqual(luo.nodeConventionComparison);
    }
  });

  it("keeps 月孛 as the lunar mean apogee (classical 六十二日行七度 / 六十二年而七周天)", () => {
    const chart = buildQizhengChart(profile());
    const yuebei = chart.stars.find((star) => star.name === "月孛");
    const jidu = chart.stars.find((star) => star.name === "计都");
    expect(yuebei && jidu).toBeTruthy();
    // 月孛为月远地点（果老「月行最迟之处」；《清史稿·时宪志一》「月孛乃月行极高之点」），
    // 与黄白交点（计都）无关：不应互为 180°，即必须独立于节点。
    const delta = Math.abs((yuebei?.longitude ?? 0) - (jidu?.longitude ?? 0));
    expect(Math.min(delta, 360 - delta)).not.toBeCloseTo(0, 0);
    expect(Math.min(delta, 360 - delta)).not.toBeCloseTo(180, 0);

    // 年均行度：4069.0137°／世纪 ÷ 100 = 40.69°／年。
    // 古籍《图书编》卷二十一：「六十二日行七度，六十二年而七周天」→ 7/62 度／日 ≈ 41.2°／年
    // （7 周天 / 62 年 ≈ 8.857 年一周，与 Meeus 平近地点周期 3232.6 日 ≈ 8.85 年相符）。误差须 < 3%。
    const classicalPerYear = (360 * 7) / 62;
    expect(40.69).toBeGreaterThan(classicalPerYear * 0.97);
    expect(40.69).toBeLessThan(classicalPerYear * 1.03);
  });

  it("computes Qing Zi Qi and identifies its approximation", () => {
    const chart = buildQizhengChart(profile());
    const ziQi = chart.stars.find((star) => star.name === "紫气");
    expect(ziQi?.note).toContain("其他年代为外推");
    expect(ziQi?.element).toBe("木余");
    expect(ziQi?.fortune).toBe("吉");
    expect(ziQi?.note).toContain("《星学正传》");
    expect(ziQi?.note).toContain("并非位置模型的验证");
    expect(serializeQizhengToStructuredText(chart)).toContain("木余 · 吉");
    const exported = JSON.parse(serializeQizhengToCompactJson(chart));
    expect(exported.stars.find((star: { name: string }) => star.name === "紫气")).toMatchObject({ element: "木余", fortune: "吉", note: expect.stringContaining("《星学正传》") });
    expect(chart.disclaimer).toContain("紫气使用清代平行研究模型");
    const input = getDefaultProfileInput(new Date("1911-04-18T16:00:00Z"), "Asia/Shanghai");
    const historical = buildQizhengChart(normalizeProfileInput(input));
    expect(historical.stars.find((star) => star.name === "紫气")?.longitude).toBeCloseTo(128.99, 2);
  });

  it("compares the product output with nine 1911 calendar entries across the 鬼柳 boundary", () => {
    // Declared independently from the facsimile degrees plus Qianlong mansion starts,
    // advanced by 51 arcseconds/year; expected values retain minute-level uncertainty.
    const cases: Array<[string, number]> = [
      ["1911-03-30", 128.281451], ["1911-04-09", 128.631838], ["1911-04-19", 128.982226],
      ["1911-04-29", 129.337892], ["1911-05-09", 129.688280], ["1911-05-19", 130.038668],
      ["1911-10-22", 135.528052], ["1911-11-01", 135.878440], ["1911-11-11", 136.245494],
    ];
    for (const [day, expected] of cases) {
      const input = getDefaultProfileInput(new Date(`${day}T00:00:00+08:00`), "Asia/Shanghai");
      const star = buildQizhengChart(normalizeProfileInput(input)).stars.find((item) => item.name === "紫气");
      expect(star, day).toBeDefined();
      expect(Math.abs((star?.longitude ?? 0) - expected), day).toBeLessThan(0.025);
    }
  });

  it("follows 推步捷例 daily, common-year and leap-year mean motions", () => {
    const ziqi = (iso: string) => {
      const input = getDefaultProfileInput(new Date(iso), "UTC");
      return buildQizhengChart(normalizeProfileInput(input)).stars.find((item) => item.name === "紫气")?.longitude;
    };
    const advance = (start: number, end: number) => (end - start + 360) % 360;
    const epoch = ziqi("1743-12-22T16:00:00Z");
    const nextDay = ziqi("1743-12-23T16:00:00Z");
    const leapYear = ziqi("1744-12-22T16:00:00Z");
    const commonYear = ziqi("1745-12-22T16:00:00Z");
    expect(epoch).toBeDefined();
    expect(nextDay).toBeDefined();
    expect(leapYear).toBeDefined();
    expect(commonYear).toBeDefined();
    // The displayed longitude is rounded to 0.01°, so two rounded values can differ by almost 0.01°.
    expect(Math.abs(advance(epoch!, nextDay!) - 126.720777 / 3600)).toBeLessThan(0.011);
    expect(Math.abs(advance(epoch!, leapYear!) - (12 + 52 / 60 + 59.804382 / 3600))).toBeLessThan(0.011);
    expect(Math.abs(advance(leapYear!, commonYear!) - (12 + 50 / 60 + 53.083605 / 3600))).toBeLessThan(0.011);
  });

  it("reproduces the 《清史稿》 康熙甲子年黄道十二次初度值宿 (epoch 1684, 初宫起冬至)", () => {
    // 《清史稿·卷二十八·天文三》「康熙甲子年黄道十二次初度值宿」逐条给出十二次初度落在何宿何度；
    // 十二次初度应落在回归黄经 270° + 30k（初宫=星纪初=冬至=270°）。以下为该表原值。
    const Ci: Array<[string, number, string, number]> = [
      ["星纪", 270, "箕", 3 + 10 / 60],
      ["元枵", 300, "牛", 23 / 60],
      ["娵訾", 330, "危", 1],
      ["降娄", 0, "室", 10 + 57 / 60],
      ["大梁", 30, "娄", 27 / 60],
      ["实沈", 60, "昴", 5 + 12 / 60],
      ["鹑首", 90, "觜", 10 + 38 / 60],
      ["鹑火", 120, "井", 29 + 5 / 60],
      ["鹑尾", 150, "星", 7 + 4 / 60],
      ["寿星", 180, "翼", 10 + 37 / 60],
      ["大火", 210, "角", 10 + 34 / 60],
      ["析木", 240, "房", 1 + 39 / 60],
    ];
    // 各宿距星在 1684 历元的回归黄经（同 chart.ts 的 MANSION_TABLE_QING 换算值）。
    const starts: Record<string, number> = { 箕: 266.8333, 牛: 299.6167, 危: 329, 室: 349.1167, 娄: 29.55, 昴: 54.8, 觜: 79.3667, 井: 90.9167, 星: 142.9333, 翼: 169.3833, 角: 199.4333, 房: 238.5167 };
    const separation = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
    for (const [name, expected, mansion, degree] of Ci) {
      // (1) 该次初度所在的宿，应正好是该条所记之宿。
      expect(longitudeToMansion(expected, EPOCH_UT), `${name} 次初度所在宿`).toBe(mansion);
      // (2) 由「宿起点 + 该条度数」反推的次初度，应落在 270° + 30k 的 0.2° 内。
      expect(separation(starts[mansion] + degree, expected), `${name} 次初度 ${(starts[mansion] + degree).toFixed(3)}° vs ${expected}°`).toBeLessThan(0.2);
    }
  });

  it("serializes the scheme and its conventions", () => {
    const text = serializeQizhengToStructuredText(buildQizhengChart(profile()));
    expect(text).toContain("七政四余");
    expect(text).toContain("命宫：");
    expect(text).toContain("七政·太阳");
    expect(text).toContain("四余·罗睺");
    expect(text).toContain("果老旧法");
    expect(text).toContain("二十八宿黄道经纬度钤");
    expect(text).toContain("完整性：完整");
    expect(text).toContain("未列出的宫位不推定为平");
    expect(text).toContain("星学大成卷");
    expect(text).toContain("紫气使用清代平行研究模型");
    expect(text).toContain("四余·紫气：");
    expect(JSON.parse(serializeQizhengToCompactJson(buildQizhengChart(profile()))).complete).toBe(true);
  });
});

it("separates the instant used by the ephemeris from the clock used for 命宫", () => {
  const input = getDefaultProfileInput(new Date("2026-03-03T06:30:00Z"), "UTC");
  input.location = { city: "Audit fixture", timeZone: "UTC", longitude: 15, latitude: 0 };
  const civil = buildQizhengChart(normalizeProfileInput(input));
  const apparent = buildQizhengChart(normalizeProfileInput({ ...input, timeBasis: "true-solar" }));
  expect(apparent.input.civilDateTime).toBe(civil.input.datetime);
  expect(apparent.input.datetime).toMatch(/T07:/);
  expect(apparent.mingPalace.index).toBe((civil.mingPalace.index + 11) % 12);
  expect(apparent.stars.map((star) => star.longitude)).toEqual(civil.stars.map((star) => star.longitude));
  expect(serializeQizhengToStructuredText(apparent)).toContain("命宫取时：2026-03-03T07:");
});
