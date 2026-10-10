"use client";

import type { LiurenChart } from "@/lib/liuren/chart";
import { DI_ZHI } from "@/lib/liuren/data";

/** 十二宫方盘：上排巳午未申，下排寅丑子亥。 */
const GRID: Array<{ zhi: string; row: number; col: number }> = [
  { zhi: "巳", row: 1, col: 1 },
  { zhi: "午", row: 1, col: 2 },
  { zhi: "未", row: 1, col: 3 },
  { zhi: "申", row: 1, col: 4 },
  { zhi: "辰", row: 2, col: 1 },
  { zhi: "酉", row: 2, col: 4 },
  { zhi: "卯", row: 3, col: 1 },
  { zhi: "戌", row: 3, col: 4 },
  { zhi: "寅", row: 4, col: 1 },
  { zhi: "丑", row: 4, col: 2 },
  { zhi: "子", row: 4, col: 3 },
  { zhi: "亥", row: 4, col: 4 },
];

export function LiurenPanel({
  chart,
  onCopyJson,
  jsonCopied,
}: {
  chart: LiurenChart;
  onCopyJson?: () => void;
  jsonCopied?: boolean;
}) {
  const cellOf = new Map(chart.plate.map((cell) => [cell.di, cell]));
  const riGan = chart.dayGanZhi.slice(0, 1);
  const riZhi = chart.dayGanZhi.slice(1);
  const jianChuRi = chart.plate.find((cell) => cell.di === riZhi)?.jianChu ?? "";

  return (
    <section className="divination-panel divination-panel--liuren" aria-label="大六壬">
      <div className="divination-panel__topline">
        <span>DA LIU REN / 12 PALACES</span>
        <span className="status status--live">{chart.keTi}</span>
      </div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">天地盘互乘 · 四课三传</p>
          <h2>大六壬</h2>
          <p className="divination-panel__subhead">
            月将 {chart.yueJiang.name}{chart.yueJiang.zhi} 加 {chart.hourZhi} 时 · 日 {chart.dayGanZhi} · {chart.fourPillars.year} {chart.fourPillars.month} {chart.fourPillars.day} {chart.fourPillars.hour}
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

      <div className="liuren-facts">
        <div><span>课体</span><b>{chart.keTi || "—"}</b><em>九宗门发用</em></div>
        <div><span>旬首 / 空亡</span><b>{chart.xunShou}</b><em>空 {chart.kongWang.join("、") || "—"}</em></div>
        <div><span>驿马</span><b>{chart.yiMa || "—"}</b><em>依日支 {riZhi}</em></div>
        <div><span>建除</span><b>{jianChuRi || "—"}</b><em>日支所临</em></div>
      </div>

      <div className="liuren-layout">
        <div className="liuren-stage">
          <div className="divination-section-heading"><span>天地盘 · 十二宫</span><small>上为天盘，下为地盘</small></div>
          <div className="liuren-plate" role="img" aria-label="十二宫天地盘">
            {GRID.map(({ zhi, row, col }) => {
              const cell = cellOf.get(zhi);
              const isDay = zhi === riZhi;
              return (
                <div key={zhi} className={`liuren-cell${isDay ? " is-day" : ""}`} style={{ gridRow: row, gridColumn: col }}>
                  <em className="liuren-cell__jiang">{cell?.jiang}</em>
                  <strong className="liuren-cell__tian">{cell?.tian}{cell?.dun ? <small>{cell.dun}</small> : null}</strong>
                  <span className="liuren-cell__di">{zhi}<i>{cell?.jianChu}</i></span>
                </div>
              );
            })}
            <div className="liuren-center">
              <b>{chart.yueJiang.name}</b>
              <span>月将 {chart.yueJiang.zhi}</span>
              <em>占时 {chart.hourZhi}</em>
            </div>
          </div>
          <p className="liuren-note">按传统方盘：上排巳午未申、下排寅丑子亥；每宫上为天将，中为天盘神与遁干，下为地盘支与建除。深色格为日支。</p>
        </div>

        <div className="liuren-side">
          <div className="divination-section-heading"><span>四课</span><small>自右向左：一 二 三 四</small></div>
          <div className="liuren-lessons">
            {[...chart.lessons].reverse().map((lesson) => (
              <article className="liuren-lesson" key={lesson.index}>
                <small>第{lesson.index}课</small>
                <strong>{lesson.upper}</strong>
                <span>{lesson.lower}</span>
                <em>{lesson.jiang}</em>
                <i>{lesson.liuQin}{lesson.dunGan ? ` · ${lesson.dunGan}` : ""}</i>
              </article>
            ))}
          </div>

          <div className="divination-section-heading"><span>三传</span><small>{chart.keTi}</small></div>
          <div className="liuren-transmissions">
            {chart.transmissions.map((item) => (
              <article className="liuren-transmission" key={item.name}>
                <small>{item.name}</small>
                <strong>{item.zhi}</strong>
                <em>{item.jiang}</em>
                <i>{item.liuQin}{item.dunGan ? ` · ${item.dunGan}` : ""}</i>
              </article>
            ))}
          </div>
          <p className="liuren-note">三传神将取自天盘（将随天盘神）；六亲以日干 {riGan} 五行为我；遁干取旬遁。</p>
        </div>
      </div>

      <div className="divination-section-heading"><span>天地盘互乘表 · 地盘十二宫</span><small>{DI_ZHI.length} 宫</small></div>
      <div className="liuren-table">
        <div className="liuren-table__row liuren-table__row--head">
          <b>地盘</b><b>天盘</b><b>天将</b><b>遁干</b><b>建除</b>
        </div>
        {chart.plate.map((cell) => (
          <div className={`liuren-table__row${cell.di === riZhi ? " is-active" : ""}`} key={cell.di}>
            <b>{cell.di}</b>
            <span>{cell.tian}</span>
            <span>{cell.jiang}</span>
            <span>{cell.dun || "—"}</span>
            <span>{cell.jianChu}</span>
          </div>
        ))}
      </div>

      <p className="divination-panel__note"><span>BOUNDARY</span>{chart.disclaimer}</p>
    </section>
  );
}
