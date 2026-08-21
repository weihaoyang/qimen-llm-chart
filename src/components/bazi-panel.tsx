"use client";

import { useState, type CSSProperties } from "react";
import { Solar } from "lunar-typescript";
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

type BaziPanelProps = {
  chart: NormalizedBaziChart | null;
};

type CorePillar = {
  id: string;
  label: string;
  ganZhi: string;
  heavenlyStem: string;
  earthlyBranch: string;
  stemTenGod: string;
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

const renderTenGodBadges = (values: string[]) =>
  values.length > 0 ? (
    <div className="bazi-god-list">
      {values.map((value, index) => renderTenGodBadge(value, `${value}-${index}`))}
    </div>
  ) : (
    <span className="bazi-stack-cell__empty">无</span>
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

export function BaziPanel({ chart }: BaziPanelProps) {
  const [selectedDaYunIndex, setSelectedDaYunIndex] = useState(0);
  const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number | null>(null);
  const [selectedLiuYueMonth, setSelectedLiuYueMonth] = useState<number | null>(null);

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
  const selectedDaYun = chart.raw.yun.daYun[Math.min(selectedDaYunIndex, chart.raw.yun.daYun.length - 1)] ?? null;
  const availableLiuNianYears = selectedDaYun
    ? Array.from(
        { length: selectedDaYun.endYear - selectedDaYun.startYear + 1 },
        (_, index) => selectedDaYun.startYear + index,
      )
    : [];
  const currentYear = new Date().getFullYear();
  const activeLiuNianYear = availableLiuNianYears.includes(selectedLiuNianYear ?? currentYear)
    ? (selectedLiuNianYear ?? currentYear)
    : (availableLiuNianYears[0] ?? currentYear);
  const activeLiuNian = getLiuNianGanZhi(activeLiuNianYear);
  const currentMonth = new Date().getMonth() + 1;
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
            <div className="bazi-six-pillars__row">
              <span>十神</span>
              {corePillars.map((pillar) => <div key={`${pillar.id}-god`}>{renderTenGodBadge(pillar.stemTenGod)}</div>)}
            </div>
            <div className="bazi-six-pillars__row bazi-six-pillars__row--glyph">
              <span>天干</span>
              {corePillars.map((pillar) => {
                const trait = getStemTrait(pillar.heavenlyStem);
                return <strong data-element={trait?.element ?? "未知"} className={pillar.isDayMaster ? "is-day-master" : ""} key={`${pillar.id}-stem`}>{pillar.heavenlyStem}</strong>;
              })}
            </div>
            <div className="bazi-six-pillars__row bazi-six-pillars__row--glyph">
              <span>地支</span>
              {corePillars.map((pillar) => {
                const trait = getBranchTrait(pillar.earthlyBranch);
                return <strong data-element={trait?.element ?? "未知"} key={`${pillar.id}-branch`}>{pillar.earthlyBranch}</strong>;
              })}
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
            {chart.raw.pillars.map((pillar) => (
              <div className="bazi-table__cell bazi-plain-cell" key={`branch-god-${pillar.key}`}>
                {renderTenGodBadges(pillar.shiShenZhi)}
              </div>
            ))}
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
            <div className="bazi-table__label">藏干</div>
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
