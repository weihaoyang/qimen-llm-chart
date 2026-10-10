"use client";

import type { MayaChart } from "@/lib/maya/chart";
import { DAY_SIGN_GLOSS, HAAB_MONTHS, KICHE_DAY_SIGNS, YUCATEC_DAY_SIGNS } from "@/lib/maya/traditional";
import { ProvenanceBlock } from "./provenance-block";

export function MayaPanel({
  chart,
  dateInput,
  onDateChange,
  onCopyJson,
  jsonCopied,
}: {
  chart: MayaChart;
  dateInput: string;
  onDateChange?: (value: string) => void;
  onCopyJson?: () => void;
  jsonCopied?: boolean;
}) {
  const { traditional: t, dreamspell: d } = chart;

  return (
    <section className="divination-panel divination-panel--maya" aria-label="玛雅历法">
      <div className="divination-panel__topline">
        <span>MAYA / TZOLKIN 13:20</span>
        <span className="status status--live">GMT {chart.correlation}</span>
      </div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">LONG COUNT · TZOLKIN · DREAMSPELL</p>
          <h2>玛雅历法 · 卓尔金</h2>
          <p className="divination-panel__subhead">
            长纪年 {t.longCount.label} · 卓尔金 {t.tzolkin.label} · 哈布 {t.haab.label} · Kin {d.kin}（{d.color}{d.sealName}）
          </p>
        </div>
        <div className="divination-panel__header-actions">
          <label className="maya-date">
            日期
            <input type="date" value={dateInput} onChange={(event) => onDateChange?.(event.target.value)} />
          </label>
          {onCopyJson ? (
            <button type="button" className="divination-panel__export" onClick={onCopyJson}>
              复制 JSON <span>{jsonCopied ? "✓" : "⧉"}</span>
            </button>
          ) : null}
        </div>
      </header>
      <div className="divination-panel__rule" />

      <div className="maya-layout">
        <div className="maya-column">
          <div className="divination-section-heading"><span>传统玛雅历 · GMT {chart.correlation}</span><small>儒略日 {t.julianDay}</small></div>
          <div className="maya-hero">
            <div className="maya-hero__block">
              <small>长纪年 LONG COUNT</small>
              <strong>{t.longCount.label}</strong>
              <em>第 {t.longCount.baktun} 伯克盾 · 自 0.0.0.0.0 起 {t.daysSinceEpoch} 天</em>
            </div>
            <div className="maya-hero__block maya-hero__block--tzolkin">
              <small>卓尔金 TZOLKIN 260</small>
              <strong>{t.tzolkin.number} {t.tzolkin.yucatec}</strong>
              <em>基切语 {t.tzolkin.kiche} · {t.tzolkin.gloss}</em>
            </div>
            <div className="maya-hero__block">
              <small>哈布 HAABʼ 365</small>
              <strong>{t.haab.label}</strong>
              <em>{t.haab.wayeb ? "Wayebʼ 无名日（岁末 5 日）" : `第 ${t.haab.monthIndex + 1} 月`}</em>
            </div>
          </div>

          <div className="maya-facts">
            <div><span>夜之主</span><b>G{t.nightLord}</b><em>九夜神轮值</em></div>
            <div><span>历法轮</span><b>{t.calendarRoundDay}</b><em>第 {t.calendarRoundRound} 轮 / 18980 天</em></div>
            <div><span>卓尔金序号</span><b>{t.tzolkin.signIndex + 1}/20</b><em>当日日名在轮中的位置</em></div>
            <div><span>哈布月序</span><b>{t.haab.monthIndex + 1}/19</b><em>{HAAB_MONTHS[t.haab.monthIndex]}</em></div>
          </div>

          <div className="divination-section-heading"><span>二十日名 · 当日高亮</span><small>尤卡坦语 / 基切语</small></div>
          <div className="maya-signs">
            {YUCATEC_DAY_SIGNS.map((sign, index) => (
              <div className={`maya-sign${index === t.tzolkin.signIndex ? " is-active" : ""}`} key={sign}>
                <b>{index + 1}</b>
                <span>{sign}<small>{KICHE_DAY_SIGNS[index]}</small></span>
                <em>{DAY_SIGN_GLOSS[index]}</em>
              </div>
            ))}
          </div>
        </div>

        <div className="maya-column">
          <div className="divination-section-heading"><span>13:20 频率系统 · Dreamspell</span><small>闰日不推进</small></div>
          <div className="maya-kin">
            <div className="maya-kin__number">
              <small>KIN</small>
              <strong>{d.kin}</strong>
              <em>共 260 天一轮</em>
            </div>
            <div className="maya-kin__body">
              <p className="maya-kin__name">{d.tone}{d.sealName}<span>{d.toneNameEn} {d.sealNameEn}</span></p>
              <div className="maya-kin__meta">
                <span>{d.color} · 颜色族群</span>
                <span>第 {d.wavespell} 条波符（起于 Kin {d.wavespellStartKin} {d.wavespellSealName}）· 第 {d.wavespellPosition} 位</span>
                <span>第 {d.castle} 城堡（每 52 kin）</span>
              </div>
              <div className="maya-kin__keywords">
                <span>印记：{d.sealKeywords}</span>
                <span>调性：{d.toneKeywords}</span>
              </div>
            </div>
          </div>

          <div className="divination-section-heading"><span>神谕五方 · ORACLE</span><small>主 / 支持 / 引导 / 挑战 / 隐藏</small></div>
          <div className="maya-oracle">
            {d.oracle.map((position) => (
              <article key={position.role} className="maya-oracle__card">
                <small>{position.role}<em>{position.roleEn}</em></small>
                <strong>{position.toneName}{position.sealName}</strong>
                <span>{position.color} · 印记 {position.seal} · 音调 {position.tone}</span>
              </article>
            ))}
          </div>

          <div className="divination-section-heading"><span>十三月历 · 13 MOONS</span><small>13 × 28 + 1</small></div>
          <div className="maya-moons">
            <div className="maya-moons__row">
              <span>第 {d.moon.moon} 月 · 第 {d.moon.day} 天</span>
              <em>13 × 28 共 364 天，余 1 日为无时间日</em>
            </div>
            <div className="maya-moons__grid">
              {Array.from({ length: 28 }, (_, index) => (
                <i key={index} className={index + 1 === d.moon.day ? "is-active" : undefined}>{index + 1}</i>
              ))}
            </div>
            <div className="maya-moons__row">
              <span>第 {d.moon.week} 周 · 等离子 {d.moon.plasma}</span>
              <em>{d.moon.outOfTime ? "无时间日（Day Out of Time）" : `年度起于 ${d.moon.yearStart}`}</em>
            </div>
          </div>
        </div>
      </div>

      <p className="divination-panel__note"><span>BOUNDARY</span>{chart.disclaimer}</p>
      <ProvenanceBlock system="maya" />
    </section>
  );
}
