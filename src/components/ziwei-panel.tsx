"use client";

import { useEffect, useState } from "react";
import { Iztrolabe } from "@/vendor/react-iztro";
import type { ProfileInput } from "@/lib/profile";
import { DEFAULT_BAZI_SETTINGS } from "@/lib/bazi/settings";
import { toTimeIndex } from "@/lib/ziwei/time-index";
import type { NormalizedZiweiChart } from "@/lib/ziwei/types";
import { ProvenanceBlock } from "./provenance-block";

type ZiweiPanelProps = {
  value: ProfileInput;
  chart?: NormalizedZiweiChart | null;
};

const parseDateTime = (datetime: string) => {
  const match = datetime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour] = match;
  return {
    birthday: `${Number(year)}-${Number(month)}-${Number(day)}`,
    hour: Number(hour),
  };
};

export function ZiweiPanel({ value, chart }: ZiweiPanelProps) {
  // `new Date()` resolves to a different instant during the server render than
  // during the client render, which desynchronizes hydration. Resolve the
  // horoscope inputs after mount instead; the library treats both as optional,
  // so the first paint simply renders without the 流年 layer.
  const [now, setNow] = useState<Date | null>(null);
  // The metadata chips are secondary reading, not the chart. On phones they
  // leave the flow and open from this disclosure button so the astrolabe keeps
  // the whole screen; above the phone breakpoint the button is `display: none`
  // and the chip row renders exactly as before.
  const [metaOpen, setMetaOpen] = useState(false);
  useEffect(() => {
    // One-shot mount read of a client-only value. The rule's rationale (a state
    // update cascading into another render pass) does not apply: this runs once
    // and never again, and there is no render-phase source for "now".
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount read of a client-only value
    setNow(new Date());
  }, []);

  const parsed = parseDateTime(value.datetime);
  // A malformed datetime must not blank the workspace: this panel is one of
  // three on the same page, and an uncaught throw during render takes all of
  // them down with it.
  if (!parsed) {
    return (
      <div className="ziwei-panel">
        <div className="ziwei-panel__meta" role="alert">
          <div className="ziwei-meta-chip">
            <span>紫微斗数</span>
            <strong>日期时间格式无效，无法排盘</strong>
          </div>
        </div>
      </div>
    );
  }

  const { birthday, hour } = parsed;
  const lunar = value.lunar;
  const lunarBirthday =
    value.calendarMode === "lunar" && lunar
      ? `${lunar.year}-${lunar.month}-${lunar.day}`
      : birthday;
  const birthTimeIndex = toTimeIndex(hour);
  const currentTimeIndex = now ? toTimeIndex(now.getHours()) : undefined;
  // iztro defaults to 晚子时算次日, while the product's default is 子正换日 — and the
  // 八字 panel and the server-side ziwei chart both honour that setting. Without
  // passing it through, this panel would place a 23:00 birth on a different day
  // (and therefore at a different 紫微 position) than the rest of the product.
  const dayDivide = (value.baziSettings?.dayBoundary ?? DEFAULT_BAZI_SETTINGS.dayBoundary) === "midnight"
    ? "current"
    : "forward";

  return (
    <div className="ziwei-panel">
      <button
        type="button"
        className="ziwei-panel__meta-toggle"
        aria-expanded={metaOpen}
        aria-controls="ziwei-panel-meta"
        onClick={() => setMetaOpen((open) => !open)}
      >
        <span>盘面信息</span>
        <b aria-hidden="true">{metaOpen ? "▾" : "▸"}
        </b>
      </button>

      <div
        className={`ziwei-panel__meta${metaOpen ? " is-open" : ""}`}
        id="ziwei-panel-meta"
      >
        <div className="ziwei-meta-chip">
          <span>历法</span>
          <strong>{value.calendarMode === "lunar" ? "农历" : "公历"}</strong>
        </div>
        <div className="ziwei-meta-chip">
          <span>生日</span>
          <strong>{lunarBirthday}</strong>
        </div>
        <div className="ziwei-meta-chip">
          <span>时辰索引</span>
          <strong>{birthTimeIndex}</strong>
        </div>
        <div className="ziwei-meta-chip">
          <span>性别 / 闰月</span>
          <strong>
            {value.gender === "male" ? "男" : "女"} / {lunar?.isLeapMonth ? "是" : "否"}
          </strong>
        </div>
      </div>

      <div className="ziwei-panel__canvas">
        <Iztrolabe
          // iztro-hook's rebuild effect omits `options` from its dependency list,
          // so switching the convention alone would leave the previous chart on
          // screen. Remounting is the only reliable way to force a rebuild.
          key={dayDivide}
          options={{ dayDivide }}
          birthday={lunarBirthday}
          birthdayType={value.calendarMode}
          birthTime={birthTimeIndex}
          centerPalaceAlign
          fixLeap
          gender={value.gender}
          horoscopeDate={now ?? undefined}
          horoscopeHour={currentTimeIndex}
          isLeapMonth={lunar?.isLeapMonth}
          lang="zh-CN"
          width="100%"
        />
      </div>

      {chart ? (
        <section className="ziwei-insights" aria-labelledby="ziwei-insights-title">
          <header className="ziwei-insights__header">
            <div>
              <p>STRUCTURE / EVIDENCE</p>
              <h2 id="ziwei-insights-title">命盘结构识别</h2>
            </div>
            <span>{chart.raw.patterns.length} 项结构</span>
          </header>
          <div className="ziwei-insights__facts">
            <article><span>命宫三方四正</span><strong>{chart.raw.sanFangSiZheng.join(" · ") || "资料不足"}</strong></article>
            <article><span>命主 / 身主</span><strong>{chart.raw.mingZhu} / {chart.raw.shenZhu}</strong></article>
          </div>
          {chart.raw.patterns.length ? (
            <div className="ziwei-insights__patterns">
              {chart.raw.patterns.map((item) => (
                <article className="ziwei-insight" key={item.id}>
                  <div className="ziwei-insight__title"><h3>{item.name}</h3><span data-level={item.level}>{item.level}</span></div>
                  <p>{item.summary}</p>
                  <div className="ziwei-insight__evidence">{item.evidence.map((evidence) => <span key={evidence}>{evidence}</span>)}</div>
                  <small>来源：{item.source ?? "未标注"}</small>
                </article>
              ))}
            </div>
          ) : <p className="ziwei-insights__empty">当前规则未识别到已实现的格局；这不代表命盘不存在其他传统结构。</p>}
          {chart.raw.emptyPalaces.length ? (
            <details className="ziwei-insights__empty-palaces">
              <summary>空宫与对宫借星 <span>{chart.raw.emptyPalaces.length}</span></summary>
              <ul>{chart.raw.emptyPalaces.map((item) => <li key={item.palace}><strong>{item.palace}</strong><span>对宫 {item.oppositePalace}</span><span>借星 {item.borrowedStars.join("、") || "无主星"}</span></li>)}</ul>
            </details>
          ) : null}
          <footer>结构识别根据盘面星曜与宫位关系生成，供核对与研究，不构成确定事件判断。</footer>
        </section>
      ) : null}

      <ProvenanceBlock system="ziwei" />
    </div>
  );
}
