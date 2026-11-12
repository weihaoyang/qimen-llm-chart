"use client";

import type { QizhengChart, QizhengStar } from "@/lib/qizheng/chart";
import { ProvenanceBlock } from "./provenance-block";

const StarTable = ({ title, stars }: { title: string; stars: QizhengStar[] }) => (
  <>
    <div className="divination-section-heading"><span>{title}</span><small>{stars.length} 曜</small></div>
    <div className="qizheng-table">
      {stars.map((star, index) => (
        <div className="qizheng-row" key={star.name} style={{ "--item-index": index } as React.CSSProperties}>
          <b>{star.name}</b>
          <span title="宫位与宿位按未显示的精度计算">约 {star.longitude.toFixed(2)}°</span>
          <span>{star.palaceName}({star.branch})</span>
          <span>宿{star.mansion} · 度主{star.mansionRuler}{star.mansionComparison ? <small>牛宿界对照：{star.mansionComparison.mansion}（{star.mansionComparison.method}）</small> : null}{star.nodeConventionComparison ? <small title={star.nodeConventionComparison.method}>新法命名对照：约 {star.nodeConventionComparison.longitude.toFixed(2)}° · {star.nodeConventionComparison.palaceName}({star.nodeConventionComparison.branch}) · 宿{star.nodeConventionComparison.mansion}</small> : null}</span>
          <span className={`qizheng-row__dignity is-${star.dignity === "庙" || star.dignity === "旺" ? "good" : star.dignity === "陷" ? "bad" : "flat"}`}>现表：{star.dignity}{star.classicalDignity ? <small>星学大成卷{star.classicalDignity.volume}{star.classicalDignity.passage ? `〈${star.classicalDignity.passage}〉` : ""}：{star.classicalDignity.label}{star.classicalDignity.alternatives?.map((item) => `；〈${item.passage}〉：${item.label}`)}</small> : null}</span>
          <span>{star.element} · {star.fortune}</span>
        </div>
      ))}
    </div>
  </>
);

export function QizhengPanel({ value, onCopyJson, jsonCopied }: { value: QizhengChart; onCopyJson?: () => void; jsonCopied?: boolean }) {
  return (
    <section className="divination-panel divination-panel--qizheng" aria-label="七政四余">
      <div className="divination-panel__topline"><span>QIZHENG SIYU / 07</span><span className={value.complete ? "status status--live" : "status"}>命宫 {value.mingPalace.branch}{value.complete ? "" : " · 部分排盘"}</span></div>
      <header className="divination-panel__header">
        <div>
          <p className="divination-panel__kicker">SEVEN LUMINARIES / FOUR REMNANTS</p>
          <h2>七政四余</h2>
          <p className="divination-panel__subhead">七政＝日月与水金火木土五星；四余＝罗睺、计都、月孛、紫气。七政黄经取本仓真星历；罗睺/计都为黄白平交点，新法命名对照仅交换同一组交点的名称，并非重算古历；庙旺标签属于主盘。月孛为平月远地点。紫气用清代平行研究模型，法元子正按 UTC+08 近似；1911 年鬼、柳两宿已有样本对照，其他年代为外推。二十八宿用康熙旧钤并按岁差推移，与乾隆宿界存在差异。十二宫按古典十二次，命宫用果老式。庙旺陷采用有限表项，未列不等于古籍无说。</p>
        </div>
        <div className="divination-panel__header-actions">
          {onCopyJson ? <button type="button" className="divination-panel__export" onClick={onCopyJson}>复制 JSON <span>{jsonCopied ? "✓" : "⧉"}</span></button> : null}
        </div>
      </header>
      <div className="divination-panel__rule" />

      <div className="divination-section-heading"><span>十二宫</span><small>命宫 {value.mingPalace.branch}宫起</small></div>
      <div className="qizheng-palaces">
        {value.palaces.map((palace) => (
          <span key={palace.name} className={palace.name === "命宫" ? "is-ming" : undefined}>{palace.name}<b>{palace.branch} · {palace.ruler}</b></span>
        ))}
      </div>

      {value.bodyDegree ? <p>身度（伴月法） · {value.bodyDegree.mansion}宿起点东行约 {value.bodyDegree.degreesFromMansionStart.toFixed(2)}° · 度主{value.bodyDegree.ruler}</p> : null}
      {!value.complete ? <p role="status">部分排盘：缺少 {value.missingStars.join("、")} 的有效星位。</p> : null}
      <StarTable title="七政落宫" stars={value.stars.filter((star) => star.kind === "七政")} />
      <StarTable title="四余落宫" stars={value.stars.filter((star) => star.kind === "四余")} />

      <p className="divination-panel__note"><span>BOUNDARY</span>{value.disclaimer}</p>
      <ProvenanceBlock system="qizheng" />
    </section>
  );
}
