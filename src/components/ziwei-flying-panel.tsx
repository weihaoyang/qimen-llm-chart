"use client";

import type { ZiweiFlyingChart } from "@/lib/ziwei-flying/chart";
import { MUTAGEN_NAMES, STEM_MUTAGENS, TECHNIQUES, TIAN_YI } from "@/lib/ziwei-flying/data";

export function ZiweiFlyingPanel({
  chart,
  onCopyJson,
  jsonCopied,
}: {
  chart: ZiweiFlyingChart;
  onCopyJson?: () => void;
  jsonCopied?: boolean;
}) {
  return (
    <section className="divination-panel divination-panel--ziwei-flying" aria-label="紫微飞星与河洛化象">
      <div className="divination-panel__topline">
        <span>ZIWEI FLYING / HE-LUO</span>
        <span className="status status--live">{chart.year.ganZhi} · 来因 {chart.laiYin?.palace ?? "—"}</span>
      </div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">宫干飞化 · 自化 · 河洛化象</p>
          <h2>紫微飞星 · 河洛化象</h2>
          <p className="divination-panel__subhead">
            生年 {chart.year.ganZhi} · 生年四化 {chart.natives.map((item) => `${item.mutagen}${item.star}`).join(" ")} · 天乙贵人宫 {chart.tianYi.palaces.filter((name) => name !== "—").join("、") || "—"}
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

      <div className="zf-facts">
        <div><span>生年干支</span><b>{chart.year.ganZhi}</b><em>十干四化之「年干」</em></div>
        <div><span>来因宫</span><b>{chart.laiYin?.palace ?? "—"}</b><em>生年天干所在六内宫</em></div>
        <div><span>天乙贵人宫</span><b>{chart.tianYi.palaces.filter((name) => name !== "—").join("、") || "—"}</b><em>贵人支 {chart.tianYi.branches.join("、") || "—"}</em></div>
        <div><span>禄转忌 / 忌转忌</span><b>{chart.chains.luZhuanJi[0]?.to ?? "—"} / {chart.chains.jiZhuanJi[0]?.to ?? "—"}</b><em>北派转忌技法</em></div>
      </div>

      <div className="divination-section-heading"><span>生年四化 · 落宫</span><small>年干 {chart.year.stem}</small></div>
      <div className="zf-natives">
        {chart.natives.map((item) => (
          <div className={`zf-native zf-native--${item.mutagen === "禄" ? "lu" : item.mutagen === "权" ? "quan" : item.mutagen === "科" ? "ke" : "ji"}`} key={item.mutagen}>
            <b>{item.mutagen}</b>
            <span>{item.star}</span>
            <em>{item.palace}</em>
          </div>
        ))}
      </div>

      <div className="divination-section-heading"><span>飞星矩阵 · 十二宫宫干飞化</span><small>禄 权 科 忌 → 飞入宫</small></div>
      <div className="zf-matrix">
        <div className="zf-matrix__row zf-matrix__row--head">
          <b>宫</b><b>宫干</b><b>洛书·九星</b><b>河图</b>
          {MUTAGEN_NAMES.map((name) => <b key={name}>{name}</b>)}
          <b>向心</b>
        </div>
        {chart.rows.map((row) => (
          <div className={`zf-matrix__row${row.isLaiYin ? " is-laiyin" : ""}${row.isTianYi ? " is-tianyi" : ""}`} key={row.index}>
            <b>{row.palace}<small>{row.branch}{row.isInner ? "·内" : ""}</small></b>
            <span>{row.stem}</span>
            <span>{row.luoShu} {row.nineStar}<small>{row.trigram}</small></span>
            <span>{row.heTu || "—"}</span>
            {row.hits.map((hit) => (
              <span key={hit.mutagen} className={hit.self ? "is-self" : undefined}>
                {hit.star}
                <small>→{hit.toPalace}{hit.self ? "（自化）" : ""}</small>
              </span>
            ))}
            <span className="zf-incoming">
              {row.incoming.length ? row.incoming.map((item) => `${item.fromPalace}${item.mutagen}${item.star}`).join("、") : "—"}
            </span>
          </div>
        ))}
      </div>
      <p className="zf-note">标记说明：<b>is-laiyin</b> 底纹为来因宫，<b>is-tianyi</b> 边框为天乙贵人宫；「→宫名（自化）」表示该化星落回本宫，属离心自化；「向心」列为对宫宫干化入本宫的星。</p>

      <div className="divination-section-heading"><span>转忌链</span><small>禄因忌果</small></div>
      <div className="zf-chains">
        {[...chart.chains.luZhuanJi, ...chart.chains.jiZhuanJi].map((item, index) => (
          <div className="zf-chain" key={`${item.star}-${index}`}>
            <b>{index === 0 ? "禄转忌" : "忌转忌"}</b>
            <span>{item.star}（落 {item.origin}）</span>
            <em>以 {item.via} 宫干飞忌</em>
            <strong>{item.star2} → {item.to}</strong>
          </div>
        ))}
        {!chart.chains.luZhuanJi.length && !chart.chains.jiZhuanJi.length ? <p className="zf-note">生年四化未落宫，无法起转忌链。</p> : null}
      </div>

      <div className="zf-two">
        <div>
          <div className="divination-section-heading"><span>十干四化表</span><small>口诀：甲廉破武阳…</small></div>
          <div className="zf-table">
            {Object.entries(STEM_MUTAGENS).map(([stem, stars]) => (
              <div className="zf-table__row" key={stem}>
                <b>{stem}</b>
                {stars.map((star, index) => <span key={star}>{MUTAGEN_NAMES[index]}{star}</span>)}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="divination-section-heading"><span>天乙贵人（年干取）</span><small>甲戊庚牛羊…</small></div>
          <div className="zf-table">
            {Object.entries(TIAN_YI).map(([stem, branches]) => (
              <div className="zf-table__row zf-table__row--narrow" key={stem}>
                <b>{stem}</b>
                <span>{branches.join("、")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="divination-section-heading"><span>技法条目</span><small>规则与边界</small></div>
      <div className="zf-techniques">
        {TECHNIQUES.map((item) => (
          <article className="zf-technique" key={item.name}>
            <header><b>{item.name}</b></header>
            <p>{item.rule}</p>
            <em>{item.note}</em>
          </article>
        ))}
      </div>

      <p className="divination-panel__note"><span>BOUNDARY</span>{chart.disclaimer}</p>
    </section>
  );
}
