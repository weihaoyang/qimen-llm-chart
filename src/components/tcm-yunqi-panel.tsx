"use client";

import type { TcmYunqiView } from "@/lib/tcm/chart";
import { ProvenanceBlock } from "./provenance-block";

/**
 * 「中医运气」面板：把所选流年的五运六气与本命八字并置，供人自行对照阅读。
 *
 * 复用 divination.css 既有类（`divination-panel*`、`hd-summary`、`hd-grid`、`hd-cell*`、
 * `divination-section-heading`），不新增 CSS；`tcm-*` 只是给测试与阅读分段用的无样式容器。
 *
 * 边界与 `src/lib/tcm/chart.ts`、Agent 提示词三处一致：只呈现可核验的古籍条款与推演结果，
 * 不做体质判断、不做诊断、不给方药、不预测疾病。
 */
export function TcmYunqiPanel({
  value,
  yearInput,
  onYearChange,
  onCopyJson,
  jsonCopied,
}: {
  value: TcmYunqiView;
  yearInput: string;
  onYearChange?: (value: string) => void;
  onCopyJson?: () => void;
  jsonCopied?: boolean;
}) {
  const yun = value.yunqi.yun;
  const summaries = [
    { label: "中运", main: `${yun.element}运 · ${yun.strength}`, sub: `${yun.jiName}之纪 · 平气名 ${yun.pingQiName}` },
    { label: "司天", main: value.yunqi.siTian, sub: "三之气（客气）" },
    { label: "在泉", main: value.yunqi.zaiQuan, sub: "终之气，与司天相对" },
  ];

  return (
    <section className="divination-panel divination-panel--tcm" aria-label="中医运气">
      <div className="divination-panel__topline">
        <span>TCM YUN-QI / FIVE-MOVEMENTS &amp; SIX-QI</span>
        <span className="status status--live">{value.yearGanzhi} · {value.year}</span>
      </div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">八字结合 · 五运六气 · 文献对照</p>
          <h2>中医运气</h2>
          <p className="divination-panel__subhead">
            按《素问》运气条款推演所选流年的中运、司天、在泉与六步客主加临，并把四柱干支与本命五行分布并置；只作文献对照，不做诊断、不给方药。
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

      <div className="divination-panel__composite">
        <label>
          流年（干支年）
          <input
            value={yearInput}
            onChange={(event) => onYearChange?.(event.target.value)}
            aria-label="流年（干支年）"
            placeholder="如 2026"
          />
        </label>
        <span>按干支纪年（立春交年）取年；运气「交气日」有异说，见下方边界声明与「出处与原文」。</span>
      </div>

      <div className="hd-summary">
        {summaries.map((item) => (
          <div key={item.label}>
            <small>{item.label}</small>
            <strong>{item.main}</strong>
            <span>{item.sub}</span>
          </div>
        ))}
      </div>

      <div className="divination-section-heading">
        <span>六步客主加临</span>
        <small>主气六步（《六微旨大论》）× 客气六步（《六元正纪大论》）</small>
      </div>
      <div className="hd-grid tcm-steps">
        {value.yunqi.steps.map((step) => (
          <div className="hd-cell" key={step.name}>
            <span className="hd-cell__number">{step.name}</span>
            <b>主 {step.zhuQi}</b>
            <span className="hd-cell__side"><i />客 {step.keQi}</span>
            <span className="hd-cell__side">{step.verdict}</span>
          </div>
        ))}
      </div>

      <div className="divination-section-heading">
        <span>四柱 → 脏腑 / 经络</span>
        <small>《针灸聚英·十二经纳天干歌》·《针灸大全·十二经纳地支歌》</small>
      </div>
      <div className="hd-grid tcm-pillars">
        {value.pillars.map((pillar) => (
          <div className="hd-cell" key={pillar.key}>
            <span className="hd-cell__number">{pillar.label} · {pillar.ganShiShen}</span>
            <b>{pillar.pillar}</b>
            <span className="hd-cell__side"><i />{pillar.gan} → {pillar.ganOrgan ?? "—"}{pillar.ganJiWei ? `（${pillar.ganJiWei}）` : ""}</span>
            <span className="hd-cell__side">{pillar.zhi} → {pillar.zhiMeridian ?? "—"}</span>
          </div>
        ))}
      </div>

      <div className="divination-section-heading">
        <span>五行并置</span>
        <small>当年运气角色 × 本命五行权重占比（只并置，不判吉凶）</small>
      </div>
      <div className="hd-grid tcm-contrast">
        {value.contrast.map((row) => (
          <div className="hd-cell" key={row.element}>
            <span className="hd-cell__number">{row.element}</span>
            <b>{row.yunRoles.length ? row.yunRoles.join("、") : "当年运气未及"}</b>
            <span className="hd-cell__side"><i />本命占比 {(row.selfShare * 100).toFixed(1)}%</span>
            <span className="hd-cell__side">权重 {row.selfWeight}</span>
          </div>
        ))}
      </div>

      <div className="divination-section-heading">
        <span>五行配属</span>
        <small>《素问·阴阳应象大论》·《素问·金匮真言论》</small>
      </div>
      <div className="hd-grid tcm-attributes">
        {value.elementAttributes.map((item) => (
          <div className="hd-cell" key={item.element}>
            <span className="hd-cell__number">{item.element}</span>
            <b>{item.zang} · {item.body} · {item.orifice}</b>
            <span className="hd-cell__side">味 {item.flavor} / 色 {item.color} / 音 {item.note} / 声 {item.voice}</span>
            <span className="hd-cell__side">志 {item.emotion} / 数 {item.number} / 臭 {item.smell} / 谷 {item.grain}</span>
          </div>
        ))}
      </div>

      <p className="divination-panel__note">
        <span>DAYUN</span>
        {value.daYun
          ? `大运 ${value.daYun.ganZhi}（${value.daYun.startYear}–${value.daYun.endYear}，${value.daYun.startAge}–${value.daYun.endAge} 岁）覆盖所选流年。`
          : "所选流年不在载荷给出的大运区间内。"}
        {` 日主 ${value.dayMaster.gan}（${value.dayMaster.element ?? "—"}），主${value.dayMaster.season ?? "—"}，脏 ${value.dayMaster.organ ?? "—"}，经 ${value.dayMaster.meridian ?? "—"}。`}
      </p>

      <div className="divination-section-heading">
        <span>边界声明</span>
        <small>逐条列出 · 本页只作文献对照</small>
      </div>
      <ul className="tcm-boundaries">
        {value.boundaries.map((line) => <li key={line}>{line}</li>)}
      </ul>

      <ProvenanceBlock system="bazi-tcm" />
    </section>
  );
}

export default TcmYunqiPanel;
