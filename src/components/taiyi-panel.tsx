"use client";

import type { TaiyiChart } from "@/lib/taiyi/chart";
import { HARMONY_SOURCE, POSITION_TO_PALACE } from "@/lib/taiyi/chart";
import { GENERALS, PALACES, PATTERNS } from "@/lib/taiyi/data";
import { ProvenanceBlock } from "./provenance-block";

/** 十六神方盘（5×5 外环，顺时针自西北乾起）。 */
const PLATE: Array<{ position: string; row: number; col: number }> = [
  { position: "乾", row: 1, col: 1 },
  { position: "亥", row: 1, col: 2 },
  { position: "子", row: 1, col: 3 },
  { position: "丑", row: 1, col: 4 },
  { position: "艮", row: 1, col: 5 },
  { position: "寅", row: 2, col: 5 },
  { position: "卯", row: 3, col: 5 },
  { position: "辰", row: 4, col: 5 },
  { position: "巽", row: 5, col: 5 },
  { position: "巳", row: 5, col: 4 },
  { position: "午", row: 5, col: 3 },
  { position: "未", row: 5, col: 2 },
  { position: "坤", row: 5, col: 1 },
  { position: "申", row: 4, col: 1 },
  { position: "酉", row: 3, col: 1 },
  { position: "戌", row: 2, col: 1 },
];

export function TaiyiPanel({
  chart,
  yearInput,
  cycle,
  dun,
  ruJuInput,
  onYearChange,
  onCycleChange,
  onDunChange,
  onRuJuChange,
  onCopyJson,
  jsonCopied,
}: {
  chart: TaiyiChart;
  yearInput: string;
  cycle: number;
  dun: "auto" | "阳遁" | "阴遁";
  ruJuInput: string;
  onYearChange?: (value: string) => void;
  onCycleChange?: (value: number) => void;
  onDunChange?: (value: "auto" | "阳遁" | "阴遁") => void;
  onRuJuChange?: (value: string) => void;
  onCopyJson?: () => void;
  jsonCopied?: boolean;
}) {
  const marks = new Map<string, { label: string; tone: string }[]>();
  const mark = (position: string, label: string, tone: string) => {
    marks.set(position, [...(marks.get(position) ?? []), { label, tone }]);
  };
  mark(chart.taiyi.position, "太乙", "taiyi");
  mark(chart.tianMu.position, "天目", "mu");
  mark(chart.shiJi.position, "始击", "ji");
  mark(chart.jiShen.position, "计神", "shen");

  return (
    <section className="divination-panel divination-panel--taiyi" aria-label="太乙神数">
      <div className="divination-panel__topline">
        <span>TAIYI SHENSHU / 16 DEITIES</span>
        <span className="status status--live">{chart.input.dun} · 入局 {chart.accumulation.ruJu}</span>
      </div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">三式之首 · 岁计排盘</p>
          <h2>太乙神数</h2>
          <p className="divination-panel__subhead">
            {chart.input.year} 年 · 太乙第 {chart.taiyi.palace} 宫（{chart.taiyi.trigram}）· 天目 {chart.tianMu.deity.name} · 始击 {chart.shiJi.deity.name} · 主算 {chart.counts.host} / 客算 {chart.counts.guest}
          </p>
        </div>
        <div className="divination-panel__header-actions">
          {onCopyJson ? (
            <button type="button" className="divination-panel__export" onClick={onCopyJson}>
              复制 JSON <span>{jsonCopied ? "✓" : "⧉"}</span>
            </button>
          ) : null}
        </div>
      </header>
      <div className="divination-panel__rule" />

      <div className="taiyi-controls">
        <label>年份<input type="number" value={yearInput} onChange={(event) => onYearChange?.(event.target.value)} /></label>
        <label>元六纪周期
          <div className="rune-selector">
            {[360, 365].map((value) => (
              <button key={value} type="button" className={value === cycle ? "is-active" : undefined} aria-pressed={value === cycle} onClick={() => onCycleChange?.(value)}>{value}</button>
            ))}
          </div>
        </label>
        <label>遁（须人工选定）
          <div className="rune-selector">
            {(["auto", "阳遁", "阴遁"] as const).map((value) => (
              <button key={value} type="button" className={value === dun ? "is-active" : undefined} aria-pressed={value === dun} onClick={() => onDunChange?.(value)}>{value === "auto" ? "未定（默认阳遁）" : value}</button>
            ))}
          </div>
        </label>
        <label>入局数覆盖<input type="number" min={1} max={72} placeholder="留空为推算" value={ruJuInput} onChange={(event) => onRuJuChange?.(event.target.value)} /></label>
      </div>
      {dun === "auto" ? (
        <p className="taiyi-note">遁未选定：古籍《太乙金镜式经》卷三与《太乙秘書》皆阳局七十二局、阴局七十二局并列（秘書阳局第一局太乙一宫、阴局第一局太乙九宫），遁不由局数推出，暂按阳遁排出——请在上方选定遁。</p>
      ) : null}

      <div className="taiyi-facts">
        <div><span>积年</span><b>{chart.accumulation.jiyear}</b><em>入纪元数 {chart.accumulation.eraRemainder} → 入局数 {chart.accumulation.ruJu}</em></div>
        <div><span>太乙</span><b>{chart.taiyi.palace} 宫</b><em>{chart.taiyi.trigram} · {chart.taiyi.element} · 本周第 {chart.taiyi.block} 个三年</em></div>
        <div><span>主算 → 主大将</span><b>{chart.counts.host} → 大将 {chart.counts.hostGeneralPalace} 宫 · 参将 {chart.counts.hostSuPalace} 宫</b><em>主算{chart.counts.hostParity} · 主算{chart.counts.hostHarmonyLevel}（卷二）</em></div>
        <div><span>客算 → 客大将</span><b>{chart.counts.guest} → 大将 {chart.counts.guestGeneralPalace} 宫 · 参将 {chart.counts.guestSuPalace} 宫</b><em>客算{chart.counts.guestParity} · 客算{chart.counts.guestHarmonyLevel}（卷二）</em></div>
        <div><span>天目（文昌）</span><b>{chart.tianMu.deity.name}</b><em>{chart.tianMu.position} · {chart.tianMu.standing}{chart.tianMu.palace ? `（第 ${chart.tianMu.palace} 宫）` : ""}</em></div>
        <div><span>始击（客目）</span><b>{chart.shiJi.deity.name}</b><em>{chart.shiJi.position} · {chart.shiJi.standing}{chart.shiJi.palace ? `（第 ${chart.shiJi.palace} 宫）` : ""}</em></div>
        <div><span>计神</span><b>{chart.jiShen.deity.name}</b><em>{chart.jiShen.position} · 岁星之使</em></div>
        <div><span>和数（事实）</span><b>主算 {chart.counts.hostHarmonyLevel} · 客算 {chart.counts.guestHarmonyLevel}</b><em>另一系清单（出处待考）：主算 {chart.counts.hostHarmonyLevelVariant} · 客算 {chart.counts.guestHarmonyLevelVariant}；本仓不下和/不和与长/短判词</em></div>
      </div>

      <div className="taiyi-layout">
        <div className="taiyi-stage">
          <div className="divination-section-heading"><span>十六神盘</span><small>外环：十六神 · 内：太乙八宫</small></div>
          <div className="taiyi-plate" role="img" aria-label="太乙十六神盘">
            {PLATE.map(({ position, row, col }) => (
              <div className={`taiyi-cell${position in POSITION_TO_PALACE ? " is-main" : ""}`} key={position} style={{ gridRow: row, gridColumn: col }}>
                <span className="taiyi-cell__pos">{position}</span>
                <em>{(chart.cycle.find((deity) => deity.position === position) ?? { name: "" }).name}</em>
                <span className="taiyi-cell__marks">
                  {(marks.get(position) ?? []).map((entry) => (
                    <b key={entry.label} className={`taiyi-mark taiyi-mark--${entry.tone}`}>{entry.label}</b>
                  ))}
                </span>
              </div>
            ))}
            <div className="taiyi-center">
              <b>太乙</b>
              <span>第 {chart.taiyi.palace} 宫 {chart.taiyi.trigram}</span>
              <em>{chart.input.dun} · 入局 {chart.accumulation.ruJu}</em>
            </div>
          </div>
          <p className="taiyi-note">外环按顺时针列十六神（自西北乾起）；八正宫（子午卯酉乾坤艮巽）以边框标出，其余为间神。</p>
        </div>

        <div className="taiyi-side">
          <div className="divination-section-heading"><span>格局 · {PATTERNS.length} 格</span><small>{chart.patterns.length ? `${chart.patterns.length} 条命中` : "未见命中"}</small></div>
          <div className="taiyi-patterns">
            {PATTERNS.map((pattern) => {
              const hit = chart.patterns.some((entry) => entry.startsWith(pattern.name));
              return (
                <div className={`taiyi-pattern${hit ? " is-hit" : ""}`} key={pattern.name}>
                  <b>{pattern.name}</b>
                  <span>{pattern.rule}</span>
                  <em>{pattern.meaning}</em>
                </div>
              );
            })}
          </div>

          <div className="divination-section-heading"><span>太乙八宫</span><small>三年一宫 · 二十四年一周</small></div>
          <div className="taiyi-table">
            <div className="taiyi-table__row taiyi-table__row--head"><b>宫</b><b>卦</b><b>方位</b><b>五行</b><b>八门</b><b>气 / 分野</b></div>
            {PALACES.map((palace) => (
              <div className={`taiyi-table__row${palace.palace === chart.taiyi.palace ? " is-active" : ""}`} key={palace.palace}>
                <b>{palace.palace}</b>
                <span>{palace.trigram}</span>
                <span>{palace.direction}</span>
                <span>{palace.element}</span>
                <span>{palace.gate}</span>
                <em>{[palace.qi, palace.note].filter(Boolean).join(" · ") || "—"}</em>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="divination-section-heading"><span>太乙八将</span><small>运行规则</small></div>
      <div className="taiyi-generals">
        {GENERALS.map((general) => (
          <article className="taiyi-general" key={general.name}>
            <header><b>{general.name}</b><em>{general.element}</em></header>
            <span>{general.alias}</span>
            <p>{general.rule}</p>
          </article>
        ))}
      </div>

      <p className="taiyi-note">{HARMONY_SOURCE}同篇又作「八三四九为阳宫，二七六一为阴宫」。另有一系和数清单作「上和十四、十八；次和二十三、二十九、三十二、三十六；下和十二、十六、二十一、二十七、三十四、三十八」，**本仓未能核到其一手出处**（独立核查在维基文库《太乙秘書》与《金鏡式經》卷二/卷三中均未见），故只作「另一系说法」并列、不归属于任何书名。两书局注亦互相矛盾（如秘書阳局 1「客算十三和」与卷三立成同局「十三〈不和〉」），本仓只列算值与奇偶，不据此下和/不和结论。</p>

      <p className="divination-panel__note"><span>BOUNDARY</span>{chart.disclaimer}</p>

      <ProvenanceBlock system="taiyi-shenshu" />
    </section>
  );
}
