/**
 * 「八字 + 中医运气」的对照视图：把**当事人八字**（四柱、日主、五行分布、大运）
 * 与**所选流年的五运六气**并置，供人自行对照阅读。
 *
 * 边界（本文件与面板、Agent 提示词三处一致）：
 * - 只呈现可核验的古籍条款与推演结果，**不做体质判断、不做诊断、不给方药、不预测疾病**；
 * - 五行对照只做"并置"（当年的运／气属何五行 × 本人八字五行的权重分布），不产出吉凶或健康结论；
 * - 运气异说（交气日大寒／立春、同天符同岁会定义、君相同气判据）在面板与资料库标注。
 */

import type { NormalizedBaziChart } from "@/lib/bazi/types";
import { analyzeYunQi, ganzhiOfYear, QI_WU_XING, type WuXing, type YunQiAnalysis } from "./yunqi";
import { ELEMENT_ATTRIBUTES, JI_WEI_BY_GAN, MERIDIAN_BY_ZHI, ZANG_FU_BY_GAN, ZANG_SEASON_BY_ELEMENT } from "./zangfu";

export const TIAN_GAN_WU_XING: Record<string, WuXing> = {
  甲: "木", 乙: "木",
  丙: "火", 丁: "火",
  戊: "土", 己: "土",
  庚: "金", 辛: "金",
  壬: "水", 癸: "水",
};

export const DI_ZHI_WU_XING: Record<string, WuXing> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

/** 八字引擎的五行权重键 → 中文五行（唯一来源，避免两处映射）。 */
const WEIGHT_KEY_BY_ELEMENT: Record<WuXing, "wood" | "fire" | "earth" | "metal" | "water"> = {
  木: "wood",
  火: "fire",
  土: "earth",
  金: "metal",
  水: "water",
};

const ELEMENT_ORDER: readonly WuXing[] = ["木", "火", "土", "金", "水"];

const PILLAR_LABEL: Record<string, string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  time: "时柱",
};

export type TcmPillar = {
  key: string;
  label: string;
  pillar: string;
  gan: string;
  zhi: string;
  ganElement: WuXing | null;
  zhiElement: WuXing | null;
  ganShiShen: string;
  /** 十干配脏腑（《针灸聚英·十二经纳天干歌》）。 */
  ganOrgan: string | null;
  /** 三焦／心包寄位（同歌末句）；无寄位为 null。 */
  ganJiWei: string | null;
  /** 十二时辰配十二经（《针灸大全·十二经纳地支歌》）。 */
  zhiMeridian: string | null;
};

export type TcmContrastRow = {
  element: WuXing;
  /** 该五行在流年运气中的角色（中运／司天／在泉／六气某步）。 */
  yunRoles: string[];
  /** 该五行在本命八字中的权重占比（0–1）。 */
  selfShare: number;
  selfWeight: number;
};

export type TcmYunqiView = {
  year: number;
  yearGanzhi: string;
  yunqi: YunQiAnalysis;
  dayMaster: { gan: string; element: WuXing | null; organ: string | null; season: string | null; meridian: string | null };
  pillars: TcmPillar[];
  elementShares: Array<{ element: WuXing; weight: number; share: number }>;
  /** 五行配属表（《阴阳应象大论》《金匮真言论》），五行齐全，供逐条查阅。 */
  elementAttributes: typeof ELEMENT_ATTRIBUTES;
  daYun: {
    ganZhi: string;
    startYear: number;
    endYear: number;
    startAge: number;
    endAge: number;
    coversSelectedYear: boolean;
  } | null;
  contrast: TcmContrastRow[];
  boundaries: string[];
};

const round = (value: number, digits = 3) => Number(value.toFixed(digits));

/** 六气 → 五行：唯一来源是运气内核的 QI_WU_XING。 */
export const elementOfQi = (qi: string): WuXing => QI_WU_XING[qi as keyof typeof QI_WU_XING] ?? "土";

/** 流年的运气五行角色（中运／司天／在泉／六气六步），用于与本人五行分布并置。 */
const yunRolesByElement = (yunqi: YunQiAnalysis): Map<WuXing, string[]> => {
  const roles = new Map<WuXing, string[]>();
  const add = (element: WuXing, role: string) => {
    const list = roles.get(element) ?? [];
    if (!list.includes(role)) list.push(role);
    roles.set(element, list);
  };
  add(yunqi.yun.element, `中运（${yunqi.yun.strength}·${yunqi.yun.jiName}之纪）`);
  add(elementOfQi(yunqi.siTian), `司天（${yunqi.siTian}）`);
  add(elementOfQi(yunqi.zaiQuan), `在泉（${yunqi.zaiQuan}）`);
  yunqi.steps.forEach((step) => add(elementOfQi(step.keQi), `${step.name}客气（${step.keQi}）`));
  return roles;
};

export const buildTcmYunqiView = (chart: NormalizedBaziChart, year: number): TcmYunqiView => {
  const yunqi = analyzeYunQi(year);
  const liuNianGanzhi = ganzhiOfYear(year);
  const dayMasterGan = chart.raw.dayMaster;

  const pillars: TcmPillar[] = chart.raw.pillars.map((pillar) => ({
    key: pillar.key,
    label: PILLAR_LABEL[pillar.key] ?? pillar.key,
    pillar: pillar.pillar,
    gan: pillar.heavenlyStem,
    zhi: pillar.earthlyBranch,
    ganElement: TIAN_GAN_WU_XING[pillar.heavenlyStem] ?? null,
    zhiElement: DI_ZHI_WU_XING[pillar.earthlyBranch] ?? null,
    ganShiShen: pillar.shiShenGan,
    ganOrgan: ZANG_FU_BY_GAN[pillar.heavenlyStem] ?? null,
    ganJiWei: JI_WEI_BY_GAN[pillar.heavenlyStem] ?? null,
    zhiMeridian: MERIDIAN_BY_ZHI[pillar.earthlyBranch] ?? null,
  }));

  const weights = chart.raw.structureAudit.elementWeights;
  const total = ELEMENT_ORDER.reduce((sum, element) => sum + (weights[WEIGHT_KEY_BY_ELEMENT[element]] ?? 0), 0);

  const elementShares = ELEMENT_ORDER.map((element) => {
    const weight = weights[WEIGHT_KEY_BY_ELEMENT[element]] ?? 0;
    return { element, weight: round(weight), share: total > 0 ? round(weight / total) : 0 };
  });

  const roles = yunRolesByElement(yunqi);
  const contrast: TcmContrastRow[] = ELEMENT_ORDER.map((element) => {
    const share = elementShares.find((item) => item.element === element);
    return {
      element,
      yunRoles: roles.get(element) ?? [],
      selfShare: share?.share ?? 0,
      selfWeight: share?.weight ?? 0,
    };
  });

  const daYunEntry = chart.raw.yun.daYun.find((item) => year >= item.startYear && year <= item.endYear) ?? null;
  const daYun = daYunEntry
    ? {
        ganZhi: daYunEntry.ganZhi,
        startYear: daYunEntry.startYear,
        endYear: daYunEntry.endYear,
        startAge: daYunEntry.startAge,
        endAge: daYunEntry.endAge,
        coversSelectedYear: true,
      }
    : null;

  const boundaries = [
    "本页只把可核验的古籍条款与推演结果摆在一起，供自行对照阅读；不做体质判断、不做诊断、不给方药、不预测疾病。",
    "五行对照只做并置（当年运／气属何五行 × 本人八字五行权重），不产出吉凶、健康或宜忌结论。",
    "运气交年有三派：「大寒交初气」（宋·刘温舒《素问入式运气论奥》明文）、「皆归始春」（《素问·六节藏象论》）、「正月朔日」（《素问·六元正纪大论》）；本页按干支纪年取年，不落节令步序。",
    "客主加临的「相得／不相得」按《素问·五运行大论》《至真要大论》的主胜逆、客胜从口径；君火与相火是否同气各家不一，已标注异说。",
    "「阳干太过、阴干不及」与「主气六步的六气专名」在《素问》正文中无直接表述，明文见宋·刘温舒《素问入式运气论奥》与清《医宗金鉴·运气要诀》，本页按此并标注。",
    "运气同化按《素问·六微旨大论》原文（岁会／岁位、天符、太一天符）；同天符、同岁会定义分歧较大，本页不输出。",
  ];

  return {
    year,
    yearGanzhi: liuNianGanzhi.ganzhi,
    yunqi,
    dayMaster: {
      gan: dayMasterGan,
      element: TIAN_GAN_WU_XING[dayMasterGan] ?? null,
      organ: ZANG_FU_BY_GAN[dayMasterGan] ?? null,
      season: TIAN_GAN_WU_XING[dayMasterGan] ? ZANG_SEASON_BY_ELEMENT[TIAN_GAN_WU_XING[dayMasterGan]].season : null,
      meridian: TIAN_GAN_WU_XING[dayMasterGan] ? ZANG_SEASON_BY_ELEMENT[TIAN_GAN_WU_XING[dayMasterGan]].meridian : null,
    },
    pillars,
    elementShares,
    elementAttributes: ELEMENT_ATTRIBUTES,
    daYun,
    contrast,
    boundaries,
  };
};
