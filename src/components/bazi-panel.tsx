import type { CSSProperties } from "react";
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
            <h2>四柱并列盘</h2>
          </div>
        </div>

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
            <div className="bazi-table__label">纳音</div>
            {chart.raw.pillars.map((pillar) => (
              <div className="bazi-table__cell bazi-plain-cell" key={`nayin-${pillar.key}`}>
                <strong>{pillar.naYin}</strong>
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

          <div className="bazi-table__row">
            <div className="bazi-table__label">神煞</div>
            {chart.raw.pillars.map((pillar) => (
              <div className="bazi-table__cell bazi-plain-cell" key={`shensha-${pillar.key}`}>
                {pillar.shenSha.length > 0 ? (
                  <div className="bazi-god-list">
                    {pillar.shenSha.map((item) => (
                      <span className="bazi-ten-god-badge" key={item}>{item}</span>
                    ))}
                  </div>
                ) : (
                  <span className="bazi-stack-cell__empty">无</span>
                )}
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>

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
    </div>
  );
}
