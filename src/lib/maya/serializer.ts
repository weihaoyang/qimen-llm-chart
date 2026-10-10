import type { MayaChart } from "./chart";

export const serializeMayaToStructuredText = (chart: MayaChart) => {
  const { traditional: t, dreamspell: d } = chart;
  return [
    "玛雅历法与卓尔金（Tzolkin）· 13:20 频率系统",
    `日期：${chart.date} · GMT 相关系数 ${chart.correlation} · 儒略日 ${t.julianDay}`,
    "",
    "【传统玛雅历】",
    `长纪年：${t.longCount.label}（第 ${t.longCount.baktun} 伯克盾）`,
    `卓尔金：${t.tzolkin.number} ${t.tzolkin.yucatec}（基切语 ${t.tzolkin.kiche}；意涵 ${t.tzolkin.gloss}）`,
    `哈布：${t.haab.label}${t.haab.wayeb ? "（Wayebʼ 无名日）" : ""}`,
    `夜之主：G${t.nightLord}`,
    `历法轮：第 ${t.calendarRoundRound} 轮第 ${t.calendarRoundDay} / 18980 天`,
    `自 0.0.0.0.0 起：${t.daysSinceEpoch} 天`,
    "",
    "【13:20 频率系统（Dreamspell）】",
    `Kin ${d.kin}：${d.tone}${d.sealName}（${d.color}）— ${d.toneNameEn} ${d.sealNameEn}`,
    `印章（太阳印记）：${d.seal} ${d.sealName} · ${d.sealKeywords}`,
    `调性（银河音调）：${d.tone} ${d.toneName} · ${d.toneKeywords}`,
    `颜色族群：${d.color}`,
    `波符：第 ${d.wavespell} 条（起于 Kin ${d.wavespellStartKin} ${d.wavespellSealName}），本日在波符第 ${d.wavespellPosition} 位`,
    `城堡：第 ${d.castle} 城堡（每 52 kin 一堡）`,
    `Zolkin 网格：第 ${d.portals.row} 行第 ${d.portals.column} 列 · ${d.portals.isGalacticPortal ? "银河门户（Galactic Portal）" : d.portals.isMysticColumn ? "神秘柱（Mystic Column）" : "普通日（非门户 / 非神秘柱）"}`,
    `神谕五方：${d.oracle.map((o) => `${o.role} ${o.toneName}${o.sealName}`).join("；")}`,
    `十三月历：第 ${d.moon.moon} 月第 ${d.moon.day} 天（第 ${d.moon.week} 周 · 等离子 ${d.moon.plasma}）${d.moon.outOfTime ? " · 无时间日（Day Out of Time）" : ""}；年度起于 ${d.moon.yearStart}`,
    "",
    `边界：${chart.disclaimer}`,
  ].join("\n");
};

export const serializeMayaToCompactJson = (chart: MayaChart) => {
  const { traditional: t, dreamspell: d } = chart;
  return JSON.stringify({
    format: "qmdj-maya-v1",
    date: chart.date,
    correlation: chart.correlation,
    traditional: {
      julianDay: t.julianDay,
      daysSinceEpoch: t.daysSinceEpoch,
      longCount: t.longCount.label,
      tzolkin: [t.tzolkin.number, t.tzolkin.yucatec, t.tzolkin.kiche],
      haab: t.haab.label,
      nightLord: `G${t.nightLord}`,
      calendarRound: [t.calendarRoundRound, t.calendarRoundDay],
    },
    dreamspell: {
      kin: d.kin,
      seal: [d.seal, d.sealName, d.sealKeywords, d.color],
      tone: [d.tone, d.toneName, d.toneKeywords],
      wavespell: [d.wavespell, d.wavespellStartKin, d.wavespellSealName, d.wavespellPosition],
      castle: d.castle,
      portals: [d.portals.row, d.portals.column, d.portals.isGalacticPortal ? 1 : 0, d.portals.isMysticColumn ? 1 : 0],
      oracle: d.oracle.map((o) => [o.role, o.tone, o.seal, `${o.toneName}${o.sealName}`]),
      moon: [d.moon.moon, d.moon.day, d.moon.week, d.moon.plasma, d.moon.outOfTime],
    },
    boundary: "传统部分为 GMT 584283 换算；13:20 部分为 Dreamspell 通行算法（含 Zolkin 银河门户 / 神秘柱矩阵）；均为研究性换算，不作预测。",
  });
};
