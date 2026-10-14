/**
 * 「中医运气」的 Agent 载荷序列化：结构化文本（给人/模型读）与紧凑 JSON（给模型读）。
 *
 * 与其它体系一致：文本先把可核验的条款与推演摆出来，再列四柱对照与五行并置，
 * 最后**逐条**附上边界声明；JSON 只做字段压缩，不新增任何判断。
 */

import type { TcmYunqiView } from "./chart";

const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

/** 运气同化（《素问·六微旨大论》）：只列经文实际给出的三种会合。 */
const yunTongHua = (view: TcmYunqiView) => {
  const flags: string[] = [];
  if (view.yunqi.yun.tianFu) flags.push("天符（中运与司天同气）");
  if (view.yunqi.yun.suiHui) flags.push("岁会（中运临岁支正位）");
  if (view.yunqi.yun.taiYiTianFu) flags.push("太一天符（天符兼岁会）");
  return flags.length ? flags.join("、") : "未见所载会合";
};

export const serializeTcmToStructuredText = (view: TcmYunqiView) => [
  "中医运气（八字结合 · 五运六气）",
  `流年：${view.year} ${view.yearGanzhi}（干支纪年，按立春交年）`,
  `中运：${view.yunqi.yun.element}运 · ${view.yunqi.yun.strength} · ${view.yunqi.yun.jiName}之纪（平气名 ${view.yunqi.yun.pingQiName}）`,
  `运气同化：${yunTongHua(view)}`,
  `司天：${view.yunqi.siTian}（三之气）`,
  `在泉：${view.yunqi.zaiQuan}（终之气，与司天相对）`,
  "",
  "六步客主加临（《六微旨大论》主气之位 × 《六元正纪大论》客气六步）：",
  ...view.yunqi.steps.map((step) => `- ${step.name}：主气 ${step.zhuQi} × 客气 ${step.keQi} → ${step.verdict}`),
  "",
  "四柱 → 十干配脏腑（《针灸聚英·十二经纳天干歌》）/ 十二时辰配经络（《针灸大全·十二经纳地支歌》）：",
  ...view.pillars.map(
    (pillar) =>
      `- ${pillar.label} ${pillar.pillar}（十神 ${pillar.ganShiShen}）：${pillar.gan}→${pillar.ganOrgan ?? "—"}${pillar.ganJiWei ? `（${pillar.ganJiWei}）` : ""} ｜ ${pillar.zhi}→${pillar.zhiMeridian ?? "—"}`,
  ),
  `日主：${view.dayMaster.gan}（${view.dayMaster.element ?? "—"}）· 主${view.dayMaster.season ?? "—"} · 脏 ${view.dayMaster.organ ?? "—"} · 经 ${view.dayMaster.meridian ?? "—"}`,
  "",
  "五行并置（当年运气角色 × 本命五行权重占比，只并置不判吉凶）：",
  ...view.contrast.map(
    (row) => `- ${row.element}：${row.yunRoles.length ? row.yunRoles.join("、") : "当年运气未及"} ｜ 本命 ${percent(row.selfShare)}（权重 ${row.selfWeight}）`,
  ),
  "",
  `大运：${
    view.daYun
      ? `${view.daYun.ganZhi}（${view.daYun.startYear}–${view.daYun.endYear}，${view.daYun.startAge}–${view.daYun.endAge} 岁，覆盖所选流年）`
      : "所选流年不在载荷给出的大运区间内"
  }`,
  "",
  "边界声明：",
  ...view.boundaries.map((line) => `- ${line}`),
].join("\n");

export const serializeTcmToCompactJson = (view: TcmYunqiView) =>
  JSON.stringify({
    format: "qmdj-tcm-v1",
    year: view.year,
    ganzhi: view.yearGanzhi,
    yun: [
      view.yunqi.yun.element,
      view.yunqi.yun.strength,
      view.yunqi.yun.jiName,
      view.yunqi.yun.pingQiName,
      view.yunqi.yun.tianFu,
      view.yunqi.yun.suiHui,
      view.yunqi.yun.taiYiTianFu,
    ],
    siTian: view.yunqi.siTian,
    zaiQuan: view.yunqi.zaiQuan,
    steps: view.yunqi.steps.map((step) => [step.name, step.zhuQi, step.keQi, step.verdict]),
    pillars: view.pillars.map((pillar) => [pillar.label, pillar.pillar, pillar.ganShiShen, pillar.ganOrgan, pillar.ganJiWei, pillar.zhiMeridian]),
    dayMaster: [view.dayMaster.gan, view.dayMaster.element, view.dayMaster.season, view.dayMaster.organ, view.dayMaster.meridian],
    elementShares: view.elementShares.map((item) => [item.element, item.weight, item.share]),
    contrast: view.contrast.map((row) => [row.element, row.yunRoles, row.selfShare, row.selfWeight]),
    daYun: view.daYun ? [view.daYun.ganZhi, view.daYun.startYear, view.daYun.endYear, view.daYun.startAge, view.daYun.endAge] : null,
    boundaries: view.boundaries,
  });
