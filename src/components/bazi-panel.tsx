"use client";

import { useState, type CSSProperties } from "react";
import { LunarUtil, Solar } from "lunar-typescript";
import { HYDRATION_SAFE_DATE } from "@/lib/hydration-clock";
import type { NormalizedBaziChart } from "@/lib/bazi/types";
import type { FiveElement, TenGodGroup } from "@/lib/bazi/relations";
import {
  formatTraitLabel,
  getBranchTrait,
  getElementRelation,
  getStemTrait,
  getTenGod,
  getTenGodGroup,
} from "@/lib/bazi/relations";
import { analyzeBaziRelations, formatDayMasterStrength, groupBaziRelations } from "@/lib/bazi/relations-analysis";
import {
  DEFAULT_STRENGTH_FACTORS,
  STRENGTH_FACTORS,
  buildTiaohouAssessment,
  computeStrengthBreakdown,
  formatElementLabel,
  formatFollowStructure,
  type StrengthFactorState,
} from "@/lib/bazi/structure-audit";
import { getLuShenBranch, getTianYiBranches, getWenChangBranch, getYangRenBranch } from "@/lib/bazi/shen-sha";

type BaziPanelProps = {
  chart: NormalizedBaziChart | null;
  /**
   * The resolved clock, supplied by the parent so the whole page shares one
   * answer to "which day is it". Defaults to the hydration-safe instant: reading
   * `new Date()` here would emit one year/month during the server render and
   * another in the browser, which React reports as a hydration mismatch.
   */
  now?: Date;
};

type CorePillar = {
  id: string;
  label: string;
  ganZhi: string;
  heavenlyStem: string;
  earthlyBranch: string;
  stemTenGod: string;
  branchTenGods: string[];
  hiddenStems: string[];
  timing: string;
  naYin: string;
  shenSha: string[];
  isDayMaster?: boolean;
  isTiming?: boolean;
};

const PILLAR_LABELS: Record<
  NormalizedBaziChart["raw"]["pillars"][number]["key"],
  string
> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  time: "时柱",
};

const HIDDEN_STEM_QI_LABELS = ["主气", "中气", "余气"] as const;
const FIVE_ELEMENTS: FiveElement[] = ["木", "火", "土", "金", "水"];
const TEN_GOD_GROUPS: TenGodGroup[] = ["比劫", "食伤", "财星", "官杀", "印星"];

const renderTenGodBadge = (tenGod: string, key?: string) => (
  <span
    className="bazi-ten-god-badge"
    data-ten-god-group={getTenGodGroup(tenGod) ?? "未知"}
    key={key}
  >
    {tenGod}
  </span>
);

const getHiddenStemPairs = (
  dayMaster: string,
  pillar: NormalizedBaziChart["raw"]["pillars"][number],
) =>
  pillar.hiddenStems.map((stem) => ({
    stem,
    shiShen: getTenGod(dayMaster, stem) ?? "无",
  }));

const splitGanZhi = (ganZhi: string) => ({
  stem: ganZhi.slice(0, 1),
  branch: ganZhi.slice(1, 2),
});

const hiddenStemsOf = (branch: string): string[] => LunarUtil.ZHI_HIDE_GAN[branch] ?? [];

const branchTenGodsOf = (dayMaster: string, branch: string): string[] =>
  hiddenStemsOf(branch)
    .map((stem) => getTenGod(dayMaster, stem))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

const getLiuNianGanZhi = (year: number) => {
  // Use a date well after 立春 so a selected civil year always maps to that
  // year's 干支, rather than inheriting today's position around the boundary.
  const solar = Solar.fromYmd(year, 7, 1);
  return solar.getLunar().getYearInGanZhiExact();
};

const getLiuYueGanZhi = (year: number, month: number) =>
  Solar.fromYmd(year, month, 15).getLunar().getMonthInGanZhiExact();

const MONTH_LABELS = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"] as const;

const formatStartOffset = (
  offset: NormalizedBaziChart["raw"]["yun"]["startOffset"],
) => {
  const parts = [
    offset.years > 0 ? `${offset.years}年` : null,
    offset.months > 0 ? `${offset.months}月` : null,
    offset.days > 0 ? `${offset.days}天` : null,
    offset.hours > 0 ? `${offset.hours}时` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("") : "当日交运";
};

const buildSupportPillars = (chart: NormalizedBaziChart) => [
  { label: "胎元", ...chart.raw.taiYuan },
  { label: "胎息", ...chart.raw.taiXi },
  { label: "命宫", ...chart.raw.mingGong },
  { label: "身宫", ...chart.raw.shenGong },
];

const buildTenGodGroupCounts = (chart: NormalizedBaziChart) => {
  const counts = new Map<TenGodGroup, number>(TEN_GOD_GROUPS.map((group) => [group, 0]));
  const add = (tenGod: string) => {
    const group = getTenGodGroup(tenGod);

    if (group) {
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
  };

  chart.raw.pillars.forEach((pillar) => {
    add(pillar.shiShenGan);
    pillar.shiShenZhi.forEach(add);
    getHiddenStemPairs(chart.raw.dayMaster, pillar).forEach(({ shiShen }) => add(shiShen));
  });

  return TEN_GOD_GROUPS.map((group) => ({ group, count: counts.get(group) ?? 0 }));
};

const buildElementCounts = (chart: NormalizedBaziChart) => {
  const counts = new Map<FiveElement, number>(FIVE_ELEMENTS.map((element) => [element, 0]));
  const add = (element: FiveElement | null | undefined) => {
    if (element) {
      counts.set(element, (counts.get(element) ?? 0) + 1);
    }
  };

  chart.raw.pillars.forEach((pillar) => {
    add(getStemTrait(pillar.heavenlyStem)?.element);
    add(getBranchTrait(pillar.earthlyBranch)?.element);
    pillar.hiddenStems.forEach((stem) => add(getStemTrait(stem)?.element));
  });

  return FIVE_ELEMENTS.map((element) => ({ element, count: counts.get(element) ?? 0 }));
};

export function BaziPanel({ chart, now = HYDRATION_SAFE_DATE }: BaziPanelProps) {
  const [selectedDaYunIndex, setSelectedDaYunIndex] = useState(0);
  const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number | null>(null);
  const [selectedLiuYueMonth, setSelectedLiuYueMonth] = useState<number | null>(null);
  const [relationFilter, setRelationFilter] = useState<"all" | "clash">("all");
  const [strengthFactors, setStrengthFactors] = useState<StrengthFactorState>(DEFAULT_STRENGTH_FACTORS);

  if (!chart) {
    return <div className="empty-panel">等待生成八字盘。</div>;
  }

  const yunDirection = chart.raw.yun.direction === "forward" ? "顺行" : "逆行";
  const dayMasterTrait = getStemTrait(chart.raw.dayMaster);
  const relationScale = FIVE_ELEMENTS.map((element) => ({
    element,
    relation: getElementRelation(chart.raw.dayMaster, element),
  }));
  const tenGodGroupCounts = buildTenGodGroupCounts(chart);
  const elementCounts = buildElementCounts(chart);
  const startOffsetText = formatStartOffset(chart.raw.yun.startOffset);
  const supportPillars = buildSupportPillars(chart);
  const relationAnalysis = analyzeBaziRelations(chart);
  const relationBuckets = groupBaziRelations(relationAnalysis.relations, { clashOnly: relationFilter === "clash" });
  const strengthLabel = formatDayMasterStrength(chart.raw.structureAudit.dayMasterStrength);
  const structureAudit = chart.raw.structureAudit;
  const elementWeightMax = Math.max(1, ...Object.values(structureAudit.elementWeights));
  const monthPillar = chart.raw.pillars.find((pillar) => pillar.key === "month");
  const branchPositions = (targets: Array<string | undefined>) => {
    const set = new Set(targets.filter((value): value is string => Boolean(value)));
    return chart.raw.pillars
      .filter((pillar) => set.has(pillar.earthlyBranch))
      .map((pillar) => PILLAR_LABELS[pillar.key]);
  };
  const lumingLookup = [
    { name: "禄神", targets: [getLuShenBranch(chart.raw.dayMaster)] },
    { name: "羊刃", targets: [getYangRenBranch(chart.raw.dayMaster)] },
    { name: "文昌贵人", targets: [getWenChangBranch(chart.raw.dayMaster)] },
    { name: "天乙贵人", targets: getTianYiBranches(chart.raw.dayMaster) },
  ]
    .map((item) => ({ ...item, hits: branchPositions(item.targets) }))
    .filter((item) => item.targets.filter(Boolean).length > 0);
  const strengthBreakdown = computeStrengthBreakdown(chart.raw.pillars, chart.raw.dayMaster, strengthFactors);
  const tiaohou = buildTiaohouAssessment(structureAudit.elementWeights, chart.raw.pillars);
  const timePillar = chart.raw.pillars.find((pillar) => pillar.key === "time");
  const mingGongStem = chart.raw.mingGong.pillar.slice(0, 1);
  const shenGongStem = chart.raw.shenGong.pillar.slice(0, 1);
  const sanming = {
    lu: { target: getLuShenBranch(chart.raw.dayMaster), hits: branchPositions([getLuShenBranch(chart.raw.dayMaster)]) },
    ming: {
      pillar: chart.raw.mingGong.pillar,
      naYin: chart.raw.mingGong.naYin,
      god: getTenGod(chart.raw.dayMaster, mingGongStem),
      shenGong: chart.raw.shenGong.pillar,
      shenGongGod: getTenGod(chart.raw.dayMaster, shenGongStem),
    },
    shou: {
      pillar: timePillar?.pillar ?? "—",
      naYin: timePillar?.naYin ?? "—",
      diShi: timePillar?.diShi ?? "—",
      relations: relationAnalysis.relations.filter((relation) => relation.pillars.includes("time") && relation.tone === "negative").map((relation) => relation.kind),
    },
  };
  const formatWeights = (weights: Record<string, number>) =>
    Object.entries(weights)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${formatElementLabel(key)} ${value.toFixed(2)}`)
      .join(" · ") || "无";
  const selectedDaYun = chart.raw.yun.daYun[Math.min(selectedDaYunIndex, chart.raw.yun.daYun.length - 1)] ?? null;
  const availableLiuNianYears = selectedDaYun
    ? Array.from(
        { length: selectedDaYun.endYear - selectedDaYun.startYear + 1 },
        (_, index) => selectedDaYun.startYear + index,
      )
    : [];
  // Read the clock once. Two separate `new Date()` calls could straddle a
  // month or year boundary and leave `currentYear` and `currentMonth`
  // describing different instants.
  const currentYear = now.getFullYear();
  const activeLiuNianYear = availableLiuNianYears.includes(selectedLiuNianYear ?? currentYear)
    ? (selectedLiuNianYear ?? currentYear)
    : (availableLiuNianYears[0] ?? currentYear);
  const activeLiuNian = getLiuNianGanZhi(activeLiuNianYear);
  const currentMonth = now.getMonth() + 1;
  const activeLiuYueMonth = selectedLiuYueMonth ?? (activeLiuNianYear === currentYear ? currentMonth : 1);
  const activeLiuYue = getLiuYueGanZhi(activeLiuNianYear, activeLiuYueMonth);
  const dayunPillar: CorePillar = selectedDaYun
    ? {
        id: "dayun",
        label: "大运",
        ganZhi: selectedDaYun.ganZhi,
        heavenlyStem: selectedDaYun.ganZhi.slice(0, 1),
        earthlyBranch: selectedDaYun.ganZhi.slice(1, 2),
      stemTenGod: getTenGod(chart.raw.dayMaster, selectedDaYun.ganZhi.slice(0, 1)) ?? "无",
      branchTenGods: branchTenGodsOf(chart.raw.dayMaster, selectedDaYun.ganZhi.slice(1, 2)),
      hiddenStems: hiddenStemsOf(selectedDaYun.ganZhi.slice(1, 2)),
      timing: `${selectedDaYun.startAge}-${selectedDaYun.endAge}岁`,
      naYin: "—",
      shenSha: [],
        isTiming: true,
      }
    : {
        id: "dayun",
        label: "大运",
        ganZhi: "—",
        heavenlyStem: "—",
        earthlyBranch: "—",
        stemTenGod: "无",
        branchTenGods: [],
        hiddenStems: [],
        timing: "暂无资料",
        naYin: "—",
        shenSha: [],
        isTiming: true,
      };
  const corePillars: CorePillar[] = [
    ...chart.raw.pillars.map((pillar) => ({
      id: pillar.key,
      label: PILLAR_LABELS[pillar.key],
      ganZhi: pillar.pillar,
      heavenlyStem: pillar.heavenlyStem,
      earthlyBranch: pillar.earthlyBranch,
      stemTenGod: pillar.shiShenGan,
      branchTenGods: pillar.shiShenZhi,
      hiddenStems: pillar.hiddenStems,
      timing: pillar.key === "day" ? "日主" : pillar.diShi,
      naYin: pillar.naYin,
      shenSha: pillar.shenSha,
      isDayMaster: pillar.key === "day",
    })),
    dayunPillar,
    {
      id: "liunian",
      label: "流年",
      ganZhi: activeLiuNian,
      heavenlyStem: activeLiuNian.slice(0, 1),
      earthlyBranch: activeLiuNian.slice(1, 2),
      stemTenGod: getTenGod(chart.raw.dayMaster, activeLiuNian.slice(0, 1)) ?? "无",
      branchTenGods: branchTenGodsOf(chart.raw.dayMaster, activeLiuNian.slice(1, 2)),
      hiddenStems: hiddenStemsOf(activeLiuNian.slice(1, 2)),
      timing: `${activeLiuNianYear}年 · ${MONTH_LABELS[activeLiuYueMonth - 1]}`,
      naYin: "—",
      shenSha: [],
      isTiming: true,
    },
  ];

  return (
    <div className="bazi-panel">
      <section className="bazi-panel__overview">
        <div className="panel-heading">
          <div>
            <h2>传统八字排盘</h2>
          </div>
        </div>

        <div className="bazi-headband">
          <div className="bazi-headband__block bazi-headband__block--hero">
            <div className="bazi-headband__hero-top">
              <div className="bazi-headband__hero-main">
                <span>日主</span>
                <strong>{chart.raw.dayMaster}</strong>
                <em>{formatTraitLabel(dayMasterTrait)}</em>
                {strengthLabel ? <em className="bazi-strength-badge" data-strength={chart.raw.structureAudit.dayMasterStrength}>旺衰 {strengthLabel}</em> : null}
              </div>
              <div className="bazi-headband__hero-calendar">
                <div className="bazi-headband__hero-calendar-row">
                  <small>公历</small>
                  <strong>{chart.raw.solar}</strong>
                </div>
                <div className="bazi-headband__hero-calendar-row">
                  <small>农历</small>
                  <strong>{chart.raw.lunar}</strong>
                </div>
              </div>
            </div>
          </div>
          <div className="bazi-headband__block bazi-headband__block--ledger">
            <span>起运</span>
            <strong>
              {yunDirection} · {chart.raw.yun.startSolar}
            </strong>
            <em>{startOffsetText}</em>
          </div>
          <div className="bazi-headband__block bazi-headband__block--ledger">
            <span>命身 / 胎元</span>
            <strong>
              {chart.raw.mingGong.pillar} / {chart.raw.shenGong.pillar}
            </strong>
            <em>
              胎元 {chart.raw.taiYuan.pillar} / 胎息 {chart.raw.taiXi.pillar}
            </em>
          </div>
        </div>

        <div className="bazi-relation-scale" aria-label="日主五行关系">
          {relationScale.map(({ element, relation }) => (
            <div className="bazi-relation-scale__item" data-element={element} key={element}>
              <strong>{element}</strong>
              <span className="bazi-relation-badge" data-relation={relation ?? "未知"}>
                {relation ?? "未知"}
              </span>
            </div>
          ))}
        </div>

        <div className="bazi-ten-god-meter" aria-label="十神分组统计">
          {tenGodGroupCounts.map(({ group, count }) => (
            <div className="bazi-ten-god-meter__item" data-ten-god-group={group} key={group}>
              <span>{group}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>

        <div className="bazi-element-meter" aria-label="五行分布统计">
          {elementCounts.map(({ element, count }) => (
            <div className="bazi-element-meter__item" data-element={element} key={element}>
              <span>{element}</span>
              <strong
                data-count={count}
                style={{ "--element-count": count } as CSSProperties}
              >
                {count}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <section className="bazi-strength-panel" aria-label="旺衰判断与规则依据">
        <div className="bazi-strength-panel__head">
          <div>
            <h2>旺衰判断 · 规则</h2>
            <small>{structureAudit.engineVersion} · 固定权重复算，不替代流派取格</small>
          </div>
          <strong data-strength={structureAudit.dayMasterStrength}>{strengthLabel ?? "存疑"}</strong>
        </div>

        <div className="bazi-strength-panel__facts">
          <span>日主<b>{chart.raw.dayMaster}</b>属{structureAudit.dayMasterElement}</span>
          <span>月令<b>{monthPillar?.earthlyBranch ?? "—"}</b>·{structureAudit.monthCommandElement}</span>
          <span>同我+生我<b>{structureAudit.supportWeight}</b></span>
          <span>泄耗克<b>{structureAudit.drainWeight}</b></span>
          <span>同五行根气<b>{structureAudit.rootCount}</b></span>
          <span>透干生扶<b>{structureAudit.visibleSupportCount}</b></span>
          <span>从格倾向<b>{formatFollowStructure(structureAudit.followStructure)}</b></span>
          <span>置信度<b>{structureAudit.confidence}</b></span>
        </div>

        <div className="bazi-element-weights" aria-label="五行力量权重">
          {Object.entries(structureAudit.elementWeights).map(([key, value]) => (
            <div className="bazi-element-weight" data-element={formatElementLabel(key)} key={key}>
              <span>{formatElementLabel(key)}</span>
              <i aria-hidden="true"><b style={{ width: `${Math.round((value / elementWeightMax) * 100)}%` }} /></i>
              <em>{value.toFixed(2)}</em>
            </div>
          ))}
        </div>

        <div className="bazi-strength-sandbox">
          <div className="bazi-strength-sandbox__head">
            <strong>沙盒 · 勾选参与计算</strong>
            <span data-strength={strengthBreakdown.dayMasterStrength}>{formatDayMasterStrength(strengthBreakdown.dayMasterStrength) ?? "存疑"} · 同我+生我 {strengthBreakdown.supportWeight} / 泄耗克 {strengthBreakdown.drainWeight}</span>
          </div>
          <div className="bazi-strength-sandbox__toggles" role="group" aria-label="旺衰计算因子">
            {STRENGTH_FACTORS.map((factor) => (
              <label key={factor.id} className={strengthFactors[factor.id] ? "is-on" : ""} title={factor.hint}>
                <input
                  type="checkbox"
                  checked={strengthFactors[factor.id]}
                  onChange={(event) => setStrengthFactors((current) => ({ ...current, [factor.id]: event.target.checked }))}
                />
                {factor.label}
              </label>
            ))}
          </div>
          <ul className="bazi-strength-sandbox__rows">
            {strengthBreakdown.contributions.map((contribution) => (
              <li key={contribution.factor} className={contribution.enabled ? "" : "is-off"}>
                <span>{contribution.label}</span>
                <b>{contribution.enabled ? formatWeights(contribution.elements) : "未计入"}</b>
                <small>{contribution.detail}</small>
              </li>
            ))}
          </ul>
        </div>

        <div className="bazi-strength-evidence">
          <ul className="is-support" aria-label="支持依据">
            {structureAudit.supportingEvidence.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <ul className="is-contra" aria-label="反证与边界">
            {structureAudit.contradictingEvidence.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>

      <section className="bazi-traditional-board">
        <div className="bazi-traditional-board__header">
          <div>
            <h2>六柱核心盘</h2>
          </div>
        </div>

        <div className="bazi-reading-workspace">
          <div className="bazi-six-pillars" aria-label="四柱、大运与流年六柱核心信息">
            <div className="bazi-six-pillars__row bazi-six-pillars__row--head">
              <span>柱位</span>
              {corePillars.map((pillar) => <strong className={pillar.isTiming ? "is-timing" : pillar.isDayMaster ? "is-day-master" : ""} key={`${pillar.id}-head`}><small>{pillar.label}</small>{pillar.ganZhi}</strong>)}
            </div>
            <div className="bazi-six-pillars__row bazi-six-pillars__row--god">
              <span>天干十神</span>
              {corePillars.map((pillar) => <div key={`${pillar.id}-stem-god`}>{renderTenGodBadge(pillar.stemTenGod)}</div>)}
            </div>
            <div className="bazi-six-pillars__row bazi-six-pillars__row--glyph">
              <span>天干</span>
              {corePillars.map((pillar) => {
                const trait = getStemTrait(pillar.heavenlyStem);
                return <strong data-element={trait?.element ?? "未知"} className={pillar.isDayMaster ? "is-day-master" : ""} key={`${pillar.id}-stem`}>{pillar.heavenlyStem}</strong>;
              })}
            </div>
            <div className="bazi-six-pillars__row bazi-six-pillars__row--god">
              <span>地支十神</span>
              {corePillars.map((pillar) => {
                const branchGod = pillar.hiddenStems[0] ? getTenGod(chart.raw.dayMaster, pillar.hiddenStems[0]) : null;
                return <div key={`${pillar.id}-branch-god`}>{branchGod ? renderTenGodBadge(branchGod) : <span className="bazi-stack-cell__empty">—</span>}</div>;
              })}
            </div>
            <div className="bazi-six-pillars__row bazi-six-pillars__row--glyph">
              <span>地支</span>
              {corePillars.map((pillar) => {
                const trait = getBranchTrait(pillar.earthlyBranch);
                return <strong data-element={trait?.element ?? "未知"} key={`${pillar.id}-branch`}>{pillar.earthlyBranch}</strong>;
              })}
            </div>
            <div className="bazi-six-pillars__row bazi-six-pillars__row--hidden">
              <span>藏干十神</span>
              {corePillars.map((pillar) => (
                <div className="bazi-hidden-gods" key={`${pillar.id}-hidden`}>
                  {pillar.hiddenStems.length
                    ? pillar.hiddenStems.map((stem, index) => {
                        const god = getTenGod(chart.raw.dayMaster, stem);
                        return <span className="bazi-hidden-god" key={`${pillar.id}-hidden-${index}`}><b>{stem}</b>{god ? renderTenGodBadge(god, `${pillar.id}-hidden-god-${index}`) : null}</span>;
                      })
                    : <em>—</em>}
                </div>
              ))}
            </div>
            <div className="bazi-six-pillars__row bazi-six-pillars__row--timing">
              <span>定位</span>
              {corePillars.map((pillar) => <small key={`${pillar.id}-timing`}>{pillar.timing}</small>)}
            </div>
            <div className="bazi-six-pillars__row bazi-six-pillars__row--nayin">
              <span>纳音</span>
              {corePillars.map((pillar) => <small key={`${pillar.id}-nayin`}>{pillar.naYin}</small>)}
            </div>
            <div className="bazi-six-pillars__row bazi-six-pillars__row--shensha">
              <span>神煞</span>
              {corePillars.map((pillar) => <div key={`${pillar.id}-shensha`}>{pillar.shenSha.length > 0 ? pillar.shenSha.map((item) => <small key={item}>{item}</small>) : <small>—</small>}</div>)}
            </div>
          </div>

          <section className="bazi-timing-rail" aria-label="大运、流年与流月时间轴">
            <div className="bazi-timing-rail__head"><strong>时间轴</strong><span>大运 → 流年 → 流月</span></div>
            <div className="bazi-timing-track">
              <span>大运</span>
              <div>{chart.raw.yun.daYun.map((item, index) => <button type="button" className={selectedDaYunIndex === index ? "is-active" : ""} key={`${item.index}-${item.ganZhi}`} onClick={() => { setSelectedDaYunIndex(index); setSelectedLiuNianYear(null); setSelectedLiuYueMonth(null); }}><small>{item.startYear}</small><strong>{item.ganZhi}</strong><em>{item.startAge}岁</em></button>)}</div>
            </div>
            <div className="bazi-timing-track">
              <span>流年</span>
              <div>{availableLiuNianYears.map((year) => <button type="button" className={activeLiuNianYear === year ? "is-active" : ""} key={year} onClick={() => { setSelectedLiuNianYear(year); setSelectedLiuYueMonth(null); }}><small>{year}</small><strong>{getLiuNianGanZhi(year)}</strong></button>)}</div>
            </div>
            <div className="bazi-timing-track bazi-timing-track--month">
              <span>流月</span>
              <div>{MONTH_LABELS.map((label, index) => { const month = index + 1; return <button type="button" className={activeLiuYueMonth === month ? "is-active" : ""} key={label} onClick={() => setSelectedLiuYueMonth(month)}><small>{label}</small><strong>{getLiuYueGanZhi(activeLiuNianYear, month)}</strong></button>; })}</div>
            </div>
            <p>当前：{selectedDaYun?.ganZhi ?? "暂无大运"} · {activeLiuNian}年 · {activeLiuYue}月</p>
          </section>
        </div>

        <details className="bazi-details">
          <summary>展开四柱详细信息（藏干、五行、长生、旬空）</summary>
          <div className="bazi-traditional-board__viewport">
        <div className="bazi-table">
          <div className="bazi-table__row bazi-table__row--head">
            <div className="bazi-table__label">项目</div>
            {chart.raw.pillars.map((pillar) => (
              <div className="bazi-table__cell bazi-table__cell--head" key={`head-${pillar.key}`}>
                <span>{PILLAR_LABELS[pillar.key]}</span>
                <strong>{pillar.pillar}</strong>
              </div>
            ))}
          </div>

          <div className="bazi-table__row">
            <div className="bazi-table__label">天干十神</div>
            {chart.raw.pillars.map((pillar) => (
              <div className="bazi-table__cell bazi-plain-cell" key={`stem-god-${pillar.key}`}>
                {renderTenGodBadge(pillar.shiShenGan)}
              </div>
            ))}
          </div>

          <div className="bazi-table__row">
            <div className="bazi-table__label">天干</div>
            {chart.raw.pillars.map((pillar) => {
              const trait = getStemTrait(pillar.heavenlyStem);
              const relation = trait ? getElementRelation(chart.raw.dayMaster, trait.element) : null;
              const isDayMaster = pillar.key === "day";

              return (
                <div
                  className={`bazi-table__cell bazi-glyph-cell${isDayMaster ? " bazi-glyph-cell--day-master" : ""}`}
                  data-element={trait?.element ?? "未知"}
                  key={`stem-${pillar.key}`}
                >
                  <strong className="bazi-glyph-cell__glyph">{pillar.heavenlyStem}</strong>
                  <span className="bazi-glyph-cell__meta">{formatTraitLabel(trait)}</span>
                  <span className="bazi-relation-badge" data-relation={relation ?? "未知"}>
                    {relation ?? "未知"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bazi-table__row">
            <div className="bazi-table__label">地支十神</div>
            {chart.raw.pillars.map((pillar) => {
              const branchGod = pillar.hiddenStems[0] ? getTenGod(chart.raw.dayMaster, pillar.hiddenStems[0]) : null;
              return (
                <div className="bazi-table__cell bazi-plain-cell" key={`branch-god-${pillar.key}`}>
                  {branchGod ? renderTenGodBadge(branchGod) : <span className="bazi-stack-cell__empty">无</span>}
                </div>
              );
            })}
          </div>

          <div className="bazi-table__row">
            <div className="bazi-table__label">地支</div>
            {chart.raw.pillars.map((pillar) => {
              const trait = getBranchTrait(pillar.earthlyBranch);
              const relation = trait ? getElementRelation(chart.raw.dayMaster, trait.element) : null;

              return (
                <div
                  className="bazi-table__cell bazi-glyph-cell"
                  data-element={trait?.element ?? "未知"}
                  key={`branch-${pillar.key}`}
                >
                  <strong className="bazi-glyph-cell__glyph">{pillar.earthlyBranch}</strong>
                  <span className="bazi-glyph-cell__meta">{formatTraitLabel(trait)}</span>
                  <span className="bazi-relation-badge" data-relation={relation ?? "未知"}>
                    {relation ?? "未知"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bazi-table__row">
            <div className="bazi-table__label">藏干十神</div>
            {chart.raw.pillars.map((pillar) => (
              <div className="bazi-table__cell bazi-stack-cell" key={`hidden-${pillar.key}`}>
                {getHiddenStemPairs(chart.raw.dayMaster, pillar).length > 0 ? (
                  getHiddenStemPairs(chart.raw.dayMaster, pillar).map(({ stem, shiShen }, index) => {
                    const trait = getStemTrait(stem);
                    const relation = trait
                      ? getElementRelation(chart.raw.dayMaster, trait.element)
                      : null;

                    return (
                      <div
                        className="bazi-stack-cell__item"
                        data-element={trait?.element ?? "未知"}
                        key={`${pillar.key}-${stem}`}
                      >
                        <small>{HIDDEN_STEM_QI_LABELS[index] ?? "藏干"}</small>
                        <strong>{stem}</strong>
                        {renderTenGodBadge(shiShen)}
                        <span>{formatTraitLabel(trait)}</span>
                        <em className="bazi-relation-badge" data-relation={relation ?? "未知"}>
                          {relation ?? "未知"}
                        </em>
                      </div>
                    );
                  })
                ) : (
                  <div className="bazi-stack-cell__empty">无</div>
                )}
              </div>
            ))}
          </div>

          <div className="bazi-table__row">
            <div className="bazi-table__label">柱五行</div>
            {chart.raw.pillars.map((pillar) => (
              <div className="bazi-table__cell bazi-plain-cell" key={`wuxing-${pillar.key}`}>
                <strong>{pillar.wuXing}</strong>
              </div>
            ))}
          </div>

          <div className="bazi-table__row">
            <div className="bazi-table__label">十二长生</div>
            {chart.raw.pillars.map((pillar) => (
              <div className="bazi-table__cell bazi-plain-cell" key={`dishi-${pillar.key}`}>
                <strong>{pillar.diShi}</strong>
              </div>
            ))}
          </div>

          <div className="bazi-table__row">
            <div className="bazi-table__label">旬空</div>
            {chart.raw.pillars.map((pillar) => (
              <div className="bazi-table__cell bazi-plain-cell" key={`xunkong-${pillar.key}`}>
                <strong>{pillar.xunKong}</strong>
                <span>{pillar.xun}</span>
              </div>
            ))}
          </div>

        </div>
        </div>
        </details>
      </section>

      <section className="bazi-relations-panel" aria-label="结构关系与注意事项">
        <div className="bazi-relations-panel__head">
          <div>
            <h2>结构关系</h2>
            <small>四柱之间的合会冲刑害破、天克地冲与空亡</small>
          </div>
          <div className="bazi-relations-filter" role="group" aria-label="关系筛选">
            <button type="button" aria-pressed={relationFilter === "all"} className={relationFilter === "all" ? "is-active" : ""} onClick={() => setRelationFilter("all")}>全部 {relationAnalysis.relations.length}</button>
            <button type="button" aria-pressed={relationFilter === "clash"} className={relationFilter === "clash" ? "is-active" : ""} onClick={() => setRelationFilter("clash")}>只看冲合</button>
          </div>
        </div>

        {relationAnalysis.relations.length ? (
          <div className="bazi-relation-groups">
            {relationBuckets.map((bucket) => (
              <details className="bazi-relation-group" key={bucket.group} open>
                <summary><strong>{bucket.group}</strong><span>{bucket.relations.length}</span></summary>
                <ul className="bazi-relation-list">
                  {bucket.relations.map((relation, index) => (
                    <li className={`bazi-relation-row is-${relation.tone}`} key={`${relation.kind}-${relation.symbols}-${index}`}>
                      <b className="bazi-relation-row__symbols">{relation.symbols}</b>
                      <span className="bazi-relation-row__kind">{relation.kind}</span>
                      <span className="bazi-relation-row__pair">{relation.pairLabel}</span>
                      <small className="bazi-relation-row__detail">{relation.detail}</small>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        ) : (
          <p className="bazi-relations-empty">四柱之间暂未发现已登记的合会冲刑害破关系。</p>
        )}

        {relationAnalysis.notes.length ? (
          <ul className="bazi-relations-notes">
            {relationAnalysis.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        ) : null}
      </section>

      <section className="bazi-luming-panel" aria-label="禄命法工具">
        <div className="bazi-luming-panel__head">
          <div>
            <h2>禄命法工具</h2>
            <small>神煞、纳音、命身宫与禄命速查</small>
          </div>
          <span>{structureAudit.luMingFeatures.length} 项</span>
        </div>

        <div className="bazi-luming-grid">
          {structureAudit.luMingFeatures.map((feature) => (
            <article className="bazi-luming-card" key={feature.name}>
              <div className="bazi-luming-card__top"><strong>{feature.name}</strong><span>{feature.positions.join(" · ")}</span></div>
              <p>{feature.evidence}</p>
            </article>
          ))}
        </div>

        <div className="bazi-sanming" aria-label="三命取象">
          <article className="bazi-sanming__card">
            <div className="bazi-sanming__top"><strong>禄命</strong><span>干禄</span></div>
            <b>{sanming.lu.target ?? "—"}</b>
            <small>{sanming.lu.hits.length ? `禄神见于 ${sanming.lu.hits.join("、")}` : "本命四柱未见禄神"}</small>
          </article>
          <article className="bazi-sanming__card">
            <div className="bazi-sanming__top"><strong>命宫</strong><span>身命</span></div>
            <b>{sanming.ming.pillar}</b>
            <small>纳音 {sanming.ming.naYin} · 命宫干 {sanming.ming.god ?? "无"}；身宫 {sanming.ming.shenGong}（{sanming.ming.shenGongGod ?? "无"}）</small>
          </article>
          <article className="bazi-sanming__card">
            <div className="bazi-sanming__top"><strong>寿元</strong><span>时命</span></div>
            <b>{sanming.shou.pillar}</b>
            <small>纳音 {sanming.shou.naYin} · 长生 {sanming.shou.diShi}{sanming.shou.relations.length ? ` · 逢${sanming.shou.relations.join("、")}` : " · 时柱无明显冲刑"}</small>
          </article>
        </div>

        <div className="bazi-tiaohou" aria-label="调候参考">
          <div className="bazi-tiaohou__head"><strong>调候参考（寒暖燥湿）</strong><span>{tiaohou.tone}</span></div>
          <p>{tiaohou.detail}</p>
          <p className="bazi-tiaohou__direction">取用方向：{tiaohou.direction}</p>
          <small>寒暖燥湿为启发式评估，非《穷通宝鉴》逐格调候用神表。</small>
        </div>

        <div className="bazi-luming-lookup" aria-label="禄命速查">
          <div className="bazi-luming-lookup__head"><strong>禄命速查</strong><span>以日主 {chart.raw.dayMaster} 起，四柱对照</span></div>
          <ul className="bazi-luming-lookup__rows">
            {lumingLookup.map((item) => (
              <li className="bazi-luming-lookup__row" key={item.name}>
                <span>{item.name}</span>
                <b>{item.targets.filter(Boolean).join(" / ")}</b>
                <small>{item.hits.length ? `见于 ${item.hits.join("、")}` : "本命四柱未见"}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <details className="bazi-details bazi-details--secondary">
        <summary>展开辅助盘与完整大运表</summary>
      <section className="bazi-support-panel">
        <div className="bazi-support-panel__header">
          <h2>辅助盘</h2>
        </div>

        <div className="bazi-support-table">
          <div className="bazi-support-table__row bazi-support-table__row--head">
            <span>附盘</span>
            <span>干支</span>
            <span>天干</span>
            <span>地支</span>
            <span>纳音</span>
            <span>属性</span>
          </div>
          {supportPillars.map((item) => {
            const { stem, branch } = splitGanZhi(item.pillar);
            const stemTrait = getStemTrait(stem);
            const branchTrait = getBranchTrait(branch);
            const stemRelation = stemTrait
              ? getElementRelation(chart.raw.dayMaster, stemTrait.element)
              : null;
            const branchRelation = branchTrait
              ? getElementRelation(chart.raw.dayMaster, branchTrait.element)
              : null;

            return (
              <article className="bazi-support-table__row" key={item.label}>
                <div className="bazi-support-table__label">
                  <span>{item.label}</span>
                </div>
                <div className="bazi-support-table__pillar">
                  <strong>{item.pillar}</strong>
                </div>
                <div
                  className="bazi-support-table__token"
                  data-element={stemTrait?.element ?? "未知"}
                >
                  <strong>{stem}</strong>
                  <span>{formatTraitLabel(stemTrait)}</span>
                  <em className="bazi-relation-badge" data-relation={stemRelation ?? "未知"}>
                    {stemRelation ?? "未知"}
                  </em>
                </div>
                <div
                  className="bazi-support-table__token"
                  data-element={branchTrait?.element ?? "未知"}
                >
                  <strong>{branch}</strong>
                  <span>{formatTraitLabel(branchTrait)}</span>
                  <em className="bazi-relation-badge" data-relation={branchRelation ?? "未知"}>
                    {branchRelation ?? "未知"}
                  </em>
                </div>
                <div className="bazi-support-table__meta">
                  <strong>{item.naYin}</strong>
                </div>
                <div className="bazi-support-table__meta">
                  <strong>
                    {formatTraitLabel(stemTrait)} / {formatTraitLabel(branchTrait)}
                  </strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bazi-yun-panel">
        <div className="panel-heading">
          <div>
            <h2>起运与大运</h2>
          </div>
        </div>

        <div className="bazi-yun-summary">
          <span>起运差 {startOffsetText}</span>
          <span>首运 {chart.raw.yun.daYun[0]?.ganZhi ?? "无"}</span>
          <span>共 {chart.raw.yun.daYun.length} 步大运</span>
        </div>

        <div className="bazi-yun-table">
          <div className="bazi-yun-table__row bazi-yun-table__row--head">
            <span>序</span>
            <span>大运</span>
            <span>运干</span>
            <span>运支</span>
            <span>年龄</span>
            <span>年份</span>
            <span>旬空</span>
          </div>
          {chart.raw.yun.daYun.map((item) => {
            const { stem, branch } = splitGanZhi(item.ganZhi);
            const stemTrait = getStemTrait(stem);
            const branchTrait = getBranchTrait(branch);
            const stemRelation = stemTrait
              ? getElementRelation(chart.raw.dayMaster, stemTrait.element)
              : null;
            const branchRelation = branchTrait
              ? getElementRelation(chart.raw.dayMaster, branchTrait.element)
              : null;
            const stemTenGod = getTenGod(chart.raw.dayMaster, stem) ?? "无";

            return (
              <div className="bazi-yun-table__row" key={`${item.index}-${item.ganZhi}`}>
                <span>{String(item.index + 1).padStart(2, "0")}</span>
                <strong className="bazi-yun-table__pillar">{item.ganZhi}</strong>
                <div className="bazi-yun-table__stack" data-element={stemTrait?.element ?? "未知"}>
                  <strong>{stem}</strong>
                  {renderTenGodBadge(stemTenGod)}
                  <small>{formatTraitLabel(stemTrait)}</small>
                  <span className="bazi-relation-badge" data-relation={stemRelation ?? "未知"}>
                    {stemRelation ?? "未知"}
                  </span>
                </div>
                <div className="bazi-yun-table__stack" data-element={branchTrait?.element ?? "未知"}>
                  <strong>{branch}</strong>
                  <small>{formatTraitLabel(branchTrait)}</small>
                  <span className="bazi-relation-badge" data-relation={branchRelation ?? "未知"}>
                    {branchRelation ?? "未知"}
                  </span>
                </div>
                <span>{item.startAge}-{item.endAge}岁</span>
                <span>{item.startYear}-{item.endYear}</span>
                <span>
                  {item.xun}
                  {item.xunKong ? ` / ${item.xunKong}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      </details>
    </div>
  );
}
