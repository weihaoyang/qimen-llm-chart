/**
 * 「拆补 / 茅山」用局法定级回归（2026-10 审计，结论：B — 从可选方法与界面入口撤下）。
 *
 * 一、上游证据（`taobi@0.4.5`，MPL-2.0，源码 `node_modules/taobi/lib/pojo/taobi/TheArtOfBecomingInvisible.js`）
 * - `:69`  `#generateCalendar` — `@check FALSE`：四柱来自 `tao_calendar`，
 *       其日/时柱口径由宿主进程时区决定（`tao_calendar/lib/algorithm/SolarCalendar.js:84`
 *       用 `date.getHours()`；`.../reduceTimeOffset.js:10` 用 `getTimezoneOffset()`）。
 * - `:154` `#generateElement` — `@check FALSE`：三元定法。
 *       `:171 SPLIT = ~~(this.date.index / 5) % 3`（拆补/符头）本身正确，且与 3meta 默认口径同规则；
 *       但 `:177 MAO = ~~((time - during[solarTerms]) / 86400000 / 5)` 未做下界保护
 *       （`:178` 只 `> 2` 截顶），当 `during[solarTerms]` 落在未来时返回大负数，
 *       经 `:184 ELEMENTS[use % 4]` 变成负元素 → 局数变负（阴遁与节气矛盾）。
 * - `:202` `#midPlace` — `@check FALSE`：中宫寄法，`case 0` 恒寄坤二宫（`:210`），
 *       与 3meta 默认的「阳遁寄艮八 / 阴遁寄坤二」不是同一口径；case 2/3 仍是 TODO。
 * - `:325` `#overDivinity` — `@check FALSE`：八神，内部还留 `TODO DIVINITY.SYMBOL` / `TODO index`。
 * 影响面：局数（`round`）、值符值使（`symbol`/`mandate`）、八神顺序都可能偏；
 * 而四柱（`:69`）一旦随宿主时区偏，值符/值使/门/星/神会整盘偏。
 *
 * 二、实测（同一 profile，Asia/Shanghai，`buildChart` 三条路径）
 * | 时刻 | 默认(3meta) | 拆补(taobi) | 茅山(taobi) |
 * |---|---|---|---|
 * | 2026-01-05T00:30 冬至 | 阳遁1局 天蓬@1 休门@1 | 局/门/星/神全同 | 抛错（taobi round=-5，阴遁5局@冬至） |
 * | 2026-01-20T23:30 大寒 | 阳遁3局 天辅@1 杜门@6 | 阳遁3局 但 天冲@3 伤门@3（taobi 内部按「甲午日甲子时」出盘，展示却是「乙未日丙子时」） | 同拆补 |
 * | 2026-02-10T12:30 立春 | 阳遁5局 天心@9 开门@8 | 阳5局、值符/星/神同，值使宫 2≠8（寄宫口径差） | 同拆补 |
 * | 2026-06-25T12:30 夏至 | 阴遁3局 天芮@8 死门@3 | 全同 | 阴遁9局 天任@2 生门@9 |
 * | 2026-08-07T18:30 大暑 | 阴遁7局 天芮@4 死门@4 | 全同 | 阴遁4局 天任@1 生门@1 |
 * | 2026-08-23T00:30 立秋(阴5局) | 阴遁5局 天禽@2 死门@2 | 抛错（旬首隐旗落中宫，`symbol=4` 无对应环宫） | 阴遁8局 天任@8 生门@8 |
 * | 2026-10-08T23:30 寒露 | 阴遁9局 天柱@9 惊门@3 | 阴9局 但 天任@2 生门@6（同上 23:00 换日差） | 抛错 |
 * | 2026-12-25T00:30 冬至 | 阳遁7局 天芮@2 死门@1 | 全同 | 抛错 |
 * | 2025-08-01T12:30（农历闰六月）大暑 | 阴遁1局 天心@3 开门@4 | 全同 | 全同 |
 * 结论：拆补与默认的**局数**在所有采样点上相同（同一符头定元规则），差异只出现在
 * 23:00–24:00（宿主机换日/时柱口径）与中宫寄宫；茅山则经常换局、并会抛错。
 *
 * 三、致命项：同一输入在 TZ=Asia/Shanghai 与 TZ=UTC 主机上，14 个采样点的
 * 拆补/茅山输出**全部不同**（默认口径的 14 个点完全一致），UTC 上还有 6 点直接抛错。
 * 因此该适配器不可作为盘面口径，也不可在测试里钉死其输出值。
 *
 * 保留下方上游 canary：它们只断言与宿主时区无关的事实。若上游修复，canary 失败即是
 * 「可以重新评估」的信号，不要直接删除。
 */
import { describe, expect, it } from "vitest";
import taobiModule from "taobi";
import { buildChart } from "./chart";
import {
  SUPPORTED_QIMEN_JU_METHODS,
  UNSUPPORTED_QIMEN_METHODS,
  type QimenSettings,
} from "./settings";
import { toZonedDate } from "./timezone";

const settingsFor = (method: QimenSettings["method"]): QimenSettings => ({
  method,
  solarTerm: "auto",
  dunType: "auto",
  juNumber: "auto",
  yearDivide: "exact",
});

type TaobiProbe = {
  round: number;
  symbol: number;
  mandate: number;
  ELEMENTS: number[];
  calendar: {
    date: { cstb: (labels: boolean) => string; index: number };
    hour: { tb: (label: boolean) => string };
  };
  getSolarTerms: (label: boolean) => string;
};

const TheArtOfBecomingInvisible = (taobiModule as unknown as {
  TheArtOfBecomingInvisible: new (
    questionTime: Date,
    round?: number | null,
    arranged?: number | null,
    follow?: number,
    options?: { elements?: number },
  ) => TaobiProbe;
}).TheArtOfBecomingInvisible;

const probe = (datetime: string, elements: number): TaobiProbe =>
  new TheArtOfBecomingInvisible(
    toZonedDate(datetime, "Asia/Shanghai"),
    null,
    null,
    0,
    { elements },
  );

const BRANCH_LABELS = [
  "子", "丑", "寅", "卯", "辰", "巳",
  "午", "未", "申", "酉", "戌", "亥",
] as const;

/** 采样时刻覆盖：冬至后、夏至后、23:00–24:00 子时、非子时、农历闰六月。 */
const SAMPLES = [
  { datetime: "2026-01-05T00:30", term: "冬至", dayGanZhi: "己卯", hourGanZhi: "甲子", yuan: "上元", ju: "阳遁1", zhiFu: "天蓬@1", zhiShi: "休门@1" },
  { datetime: "2026-01-20T23:30", term: "大寒", dayGanZhi: "乙未", hourGanZhi: "丙子", yuan: "上元", ju: "阳遁3", zhiFu: "天辅@1", zhiShi: "杜门@6" },
  { datetime: "2026-02-10T12:30", term: "立春", dayGanZhi: "乙卯", hourGanZhi: "壬午", yuan: "中元", ju: "阳遁5", zhiFu: "天心@9", zhiShi: "开门@8" },
  { datetime: "2026-03-25T09:30", term: "春分", dayGanZhi: "戊戌", hourGanZhi: "丁巳", yuan: "上元", ju: "阳遁3", zhiFu: "天任@9", zhiShi: "生门@2" },
  { datetime: "2026-06-25T12:30", term: "夏至", dayGanZhi: "庚午", hourGanZhi: "壬午", yuan: "中元", ju: "阴遁3", zhiFu: "天芮@8", zhiShi: "死门@3" },
  { datetime: "2026-07-06T23:30", term: "夏至", dayGanZhi: "壬午", hourGanZhi: "庚子", yuan: "上元", ju: "阴遁9", zhiFu: "天心@7", zhiShi: "开门@9" },
  { datetime: "2026-07-20T05:30", term: "小暑", dayGanZhi: "乙未", hourGanZhi: "己卯", yuan: "上元", ju: "阴遁8", zhiFu: "天柱@7", zhiShi: "惊门@2" },
  { datetime: "2026-08-07T18:30", term: "大暑", dayGanZhi: "癸丑", hourGanZhi: "辛酉", yuan: "上元", ju: "阴遁7", zhiFu: "天芮@4", zhiShi: "死门@4" },
  { datetime: "2026-08-23T00:30", term: "立秋", dayGanZhi: "己巳", hourGanZhi: "甲子", yuan: "中元", ju: "阴遁5", zhiFu: "天禽@2", zhiShi: "死门@2" },
  { datetime: "2026-09-23T12:30", term: "秋分", dayGanZhi: "庚子", hourGanZhi: "壬午", yuan: "中元", ju: "阴遁1", zhiFu: "天英@6", zhiShi: "景门@1" },
  { datetime: "2026-10-08T23:30", term: "寒露", dayGanZhi: "丙辰", hourGanZhi: "戊子", yuan: "中元", ju: "阴遁9", zhiFu: "天柱@9", zhiShi: "惊门@3" },
  { datetime: "2026-11-25T15:30", term: "小雪", dayGanZhi: "癸卯", hourGanZhi: "庚申", yuan: "中元", ju: "阴遁8", zhiFu: "天冲@6", zhiShi: "伤门@6" },
  { datetime: "2026-12-25T00:30", term: "冬至", dayGanZhi: "癸酉", hourGanZhi: "壬子", yuan: "中元", ju: "阳遁7", zhiFu: "天芮@2", zhiShi: "死门@1" },
  { datetime: "2025-08-01T12:30", term: "大暑", dayGanZhi: "壬寅", hourGanZhi: "丙午", yuan: "中元", ju: "阴遁1", zhiFu: "天心@3", zhiShi: "开门@4" },
] as const;

describe("qimen ju methods", () => {
  it("keeps the default method as the only selectable 用局法", () => {
    expect(SUPPORTED_QIMEN_JU_METHODS).toEqual(["默认"]);
    expect(UNSUPPORTED_QIMEN_METHODS).toEqual(["拆补", "茅山", "置闰", "飞盘"]);
  });

  it("pins the default chart: 符头定元 (拆补) plus 节气局表", () => {
    for (const sample of SAMPLES) {
      const chart = buildChart({
        datetime: sample.datetime,
        timeZone: "Asia/Shanghai",
        qimenSettings: settingsFor("default"),
      });

      expect(chart.engine, sample.datetime).toBe("3meta");
      expect(chart.raw.timeInfo.solarTerm, sample.datetime).toBe(sample.term);
      expect(
        `${chart.raw.fourPillars.day.stem}${chart.raw.fourPillars.day.branch}`,
        sample.datetime,
      ).toBe(sample.dayGanZhi);
      expect(
        `${chart.raw.fourPillars.hour.stem}${chart.raw.fourPillars.hour.branch}`,
        sample.datetime,
      ).toBe(sample.hourGanZhi);
      // 默认口径就是拆补（符头）定元：上面这些「元」与日干支一一对应，
      // 与 taobi 的 SPLIT 公式同规则（见文件头证据）。
      expect(String(chart.raw.yuan), sample.datetime).toBe(sample.yuan);
      expect(
        `${chart.raw.ju.type}${chart.raw.ju.number}`,
        sample.datetime,
      ).toBe(sample.ju);
      expect(
        `${chart.raw.zhiFu.star}@${chart.raw.zhiFu.position}`,
        sample.datetime,
      ).toBe(sample.zhiFu);
      expect(
        `${chart.raw.zhiShi.gate}@${chart.raw.zhiShi.position}`,
        sample.datetime,
      ).toBe(sample.zhiShi);
      // 撤下跨引擎盘后，默认盘必须始终带暗干与格局登记。
      expect(Object.keys(chart.hiddenStemsByPalace).length, sample.datetime).toBeGreaterThan(0);
      expect(
        chart.raw.specialPatterns.auspiciousPatterns?.length ?? 0,
        sample.datetime,
      ).toBeGreaterThan(0);
    }
  });

  it("canary: upstream 茅山 branch returns a negative 元 and a 阴遁 round inside 冬至", () => {
    // 2026-01-05T00:30 仍是冬至（小寒未到），`during[23]` 却是 2026-12-22，
    // 差值为负 → ELEMENTS[2] = -70 → ELEMENTS[-70 % 4] = -70 → round = -5（阴遁5局）。
    // 该结论与宿主时区无关：两个时区下都实测到 ELEMENTS=[2,0,-70,0]、round=-5。
    const maoshan = probe("2026-01-05T00:30", 2);

    expect(maoshan.getSolarTerms(true)).toBe("冬至");
    expect(maoshan.ELEMENTS[2]).toBeLessThan(0);
    expect(maoshan.round).toBe(-5);

    const defaultValue = buildChart({
      datetime: "2026-01-05T00:30",
      timeZone: "Asia/Shanghai",
      qimenSettings: settingsFor("default"),
    });
    expect(`${defaultValue.raw.ju.type}${defaultValue.raw.ju.number}`).toBe("阳遁1");
  });

  it("canary: upstream 四柱 follows the host process clock, not the requested time zone", () => {
    // 同一 instant：taobi 的时支 = ~~((Date#getHours() + 1) / 2) % 12，
    // 即宿主机本地钟点（SolarCalendar.js:84 用 getHours，reduceTimeOffset.js:10 用
    // getTimezoneOffset）。+08 主机得「甲子时」，UTC 主机得「甲申时」，
    // 而产品展示的时柱来自 3meta，恒为「丙子时」。
    const datetime = "2026-01-20T23:30";
    const instant = toZonedDate(datetime, "Asia/Shanghai");
    const expectedBranch = BRANCH_LABELS[Math.floor((instant.getHours() + 1) / 2) % 12];

    expect(probe(datetime, 1).calendar.hour.tb(true)).toBe(expectedBranch);
    expect(probe(datetime, 1).calendar.date.cstb(true)).toBeDefined();

    const chart = buildChart({
      datetime,
      timeZone: "Asia/Shanghai",
      qimenSettings: settingsFor("default"),
    });
    expect(chart.raw.fourPillars.hour.stem + chart.raw.fourPillars.hour.branch).toBe("丙子");
  });
});
