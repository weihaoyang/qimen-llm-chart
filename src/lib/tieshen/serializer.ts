import type { TieshenChart } from "./chart";
import { KE_NAMES, SIX_QIN_PILLARS, TIESHEN_UNIMPLEMENTED } from "./rules";

const resolveLabel: Record<TieshenChart["liunian"][number]["textSource"], string> = {
  corrected: "校正后条文",
  original: "原条文",
  formula: "铁板公式条文",
  none: "—",
};

export const serializeTieshenToStructuredText = (chart: TieshenChart) => [
  "铁板神数（条文索引盘）· 邵子神数条文源未接入",
  `输入：${chart.input.datetime}（${chart.input.timeZone}）· ${chart.input.genderLabel}命 · 求测 ${chart.input.queryDatetime}${chart.input.queryDerived ? "（缺省＝盘面时间）" : ""}`,
  `农历：${chart.lunar.year} 年 ${chart.lunar.isLeap ? "闰" : ""}${chart.lunar.month} 月 ${chart.lunar.day} 日（${chart.lunar.dayInChinese}）`,
  `出生四柱：${chart.pillars.birth.year} ${chart.pillars.birth.month} ${chart.pillars.birth.day} ${chart.pillars.birth.time}｜求测四柱：${chart.pillars.query.year} ${chart.pillars.query.month} ${chart.pillars.query.day} ${chart.pillars.query.time}`,
  "",
  "索引链（生辰 → 条文编号）：",
  `- 先天命数 ${chart.keys.congNumber}（月份表 + 3 − 时辰表）；年干干组 ${chart.keys.ganGroup}`,
  `- 五音命数：${chart.keys.tone} → ${chart.keys.toneNumber}`,
  `- 日命数 ${chart.keys.dayLife}（出生日柱纳音，列取求测时干）；时运数 ${chart.keys.timeLuck}（求测时柱纳音）；和值 ${chart.keys.sum}`,
  `- 分刻：${chart.keys.keName}（刻干数 ${chart.keys.keGanNumber}）· 组别 ${chart.keys.group} · 考刻 ${chart.keys.moment}${chart.keys.momentMatched ? "" : "（14-7 未命中，回退 Main）"}`,
  `- 本命数 ${chart.keys.mainNumber}（基数 ${chart.keys.base}，因子 ${chart.keys.factor}，农历日 ${chart.lunar.day}）→ 终局条文数 ${chart.keys.finalFortuneNumber} = ${chart.keys.mainNumber} + ${chart.keys.keGanNumber}×48`,
  `- 卦名 ${chart.keys.hexagram || "未匹配"}（${chart.keys.hexagramSource === "detail" ? "14-9 详表" : chart.keys.hexagramSource === "simple" ? "14-8 简表" : "未匹配"}）`,
  `- 后天命数 ${chart.keys.houTianNumberBeforeJiGong}（(先天 + 本命) mod 8）${chart.keys.wuShuJiGong ? ` → 五数寄宫 ${chart.keys.wuShuJiGong.hexagram}（${chart.keys.wuShuJiGong.number}，${chart.keys.wuShuJiGong.basis}）` : ""}；三元 ${chart.keys.sanYuan}`,
  `- 八卦加则：起 ${chart.keys.jiaze.start} → ${chart.keys.jiaze.result ?? "—"}（${chart.keys.jiaze.steps} 步，${chart.keys.jiaze.stopped ? "六八即止" : "未止" }）`,
  "",
  `终局条文（${chart.native?.fortune ?? chart.keys.finalFortuneNumber}）：${chart.native ? `${chart.native.volume}｜${chart.native.text}${chart.native.age ? `（对应年龄 ${chart.native.age}）` : ""}` : "条文库中无此编号断词（终局条文数常小于条文库起始 1001，属正常）"}`,
  `本命条文（14-10，基数 ${chart.benming.table?.base ?? "—"} / 序数 ${chart.benming.table?.seq ?? "—"}）：`,
  ...(chart.benming.hits.length
    ? chart.benming.hits.map((hit) => `- ${hit.category} ${hit.fortune}（${hit.volume}）：${hit.text || "条文库中无此编号断词"}${hit.age ? `（对应年龄 ${hit.age}）` : ""}`)
    : ["- 14-10 未命中该（卦名 / 考刻 / 先天命数）组合，本命条文为空"]),
  "",
  `流年条文（1–108 岁，共命中 ${chart.coverage.liunian.resolved} 岁）：`,
  ...chart.liunian
    .filter((row) => row.textSource !== "none")
    .map((row) => `- ${row.age} 岁 ${row.ganZhi}｜五音 ${row.sound} · 标记 ${row.marker} · 字母 ${row.letter}｜原 ${row.originalFortune ?? "—"} / 校正 ${row.correctedFortune ?? "—"} / 铁板 ${row.tiebanFortune ?? "—"}｜${resolveLabel[row.textSource]}：${row.correctedText || row.originalText || row.tiebanText}`),
  "",
  `八刻名：${KE_NAMES.join(" / ")}`,
  `六亲宫位（上游命名，条文未接入）：${Object.entries(SIX_QIN_PILLARS).map(([pillar, palace]) => `${pillar}=${palace}`).join(" · ")}`,
  "",
  "未实现（本仓不生成对应条文）：",
  ...TIESHEN_UNIMPLEMENTED.map((item) => `- ${item}`),
  "",
  `条文库：${chart.library.name}（${chart.library.license} · ${chart.library.repository}@${chart.library.commit.slice(0, 12)}）共 ${chart.library.size} 条`,
  `边界：${chart.disclaimer}`,
].join("\n");

export const serializeTieshenToCompactJson = (chart: TieshenChart) =>
  JSON.stringify({
    format: "qmdj-tieshen-v1",
    input: chart.input,
    lunar: chart.lunar,
    pillars: chart.pillars,
    keys: chart.keys,
    native: chart.native ? [chart.native.fortune, chart.native.volume, chart.native.age, chart.native.text] : null,
    benming: {
      table: chart.benming.table ? [chart.benming.table.base, chart.benming.table.seq] : null,
      hits: chart.benming.hits.map((hit) => [hit.category, hit.fortune, hit.volume, hit.age, hit.text]),
    },
    liunianTotal: chart.liunian.length,
    liunianResolved: chart.coverage.liunian.resolved,
    liunian: chart.liunian
      .filter((row) => row.textSource !== "none")
      .map((row) => [
        row.age,
        row.ganZhi,
        row.sound,
        row.marker,
        row.letter,
        row.originalFortune,
        row.correctedFortune,
        row.tiebanFortune,
        row.textSource,
        row.correctedText || row.originalText || row.tiebanText,
      ]),
    library: [chart.library.id, chart.library.license, chart.library.size, chart.library.commit.slice(0, 12)],
    coverage: chart.coverage,
    todo: chart.todo,
    boundary:
      "铁板索引链取 Apache-2.0 开源实现 ForceMind/Tieban-Shenshu 的方法口径；条文断词一律取自条文库原文，未接邵子神数条文源、未实现六亲条文字号与太玄数换算；不作吉凶断语。",
  });
