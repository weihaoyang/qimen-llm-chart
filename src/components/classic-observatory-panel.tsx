"use client";

import { Compass } from "lucide-react";

type ClassicKind = "daliuren" | "taiyi";
type DaliurenJson = {
  基本信息: { 占测时间: string; 昼夜: string; 四柱: string; 课式: string; 月将: string; 关键状态: { 空亡: string[]; 驿马: string; 丁马: string; 天马: string }; 农历?: string; 月将名称?: string; 本命?: string; 行年?: string; 附加课体?: string[] };
  四课: Array<{ 课别: string; 乘将: string; 上神: string; 下神: string }>;
  三传: Array<{ 传序: string; 地支: string; 天将: string; 六亲: string; 遁干: string }>;
  天地盘: Array<{ 地盘: string; 五行?: string; 旺衰?: string; 天盘: string; 天将: string; 遁干: string; 长生十二神: string; 建除?: string }>;
};
type TaiyiJson = {
  问卜与时空底盘: { 时间: string; 农历: string; 节气?: string; 四柱: string; 分钟段?: string };
  外部时空环境: { 星宿: string; 值星: string; 天神: string };
  核心物理关系: { 能量交互: string };
  九星阵列: Array<{ 观测层级: string; 太乙名: string; 神性: string; 北斗名: string; 映射参考: string; 五行: string; 方位: string; 宫位: string }>;
  古典参考: { 主诀原文: string; 使用提示: string };
};

type ClassicObservatoryPanelProps = { kind: ClassicKind; value: { text: string; json: unknown } | null };

const field = (label: string, value?: string) => <div key={label}><span>{label}</span><strong>{value || "—"}</strong></div>;

function DaliurenBoard({ chart }: { chart: DaliurenJson }) {
  const info = chart.基本信息;
  return <>
    <section className="classic-observatory__summary daliuren-summary">
      {field("占测时间", info.占测时间)}{field("农历", info.农历)}{field("四柱", info.四柱)}{field("昼夜", info.昼夜)}{field("月将", `${info.月将}${info.月将名称 ? ` · ${info.月将名称}` : ""}`)}{field("课式", info.课式)}
    </section>
    <section className="daliuren-board-section">
      <div className="classic-observatory__section-head"><div><span>天地盘</span><h3>十二宫</h3></div><p>由地盘、天盘、天将与遁干组成。选择宫位时先确认位置，再核对关系，不把单一符号直接等同于事件。</p></div>
      <div className="daliuren-board">
        {chart.天地盘.map((palace) => <article key={palace.地盘} className={`daliuren-palace is-${palace.旺衰 ?? "平"}`}><header><b>{palace.地盘}</b><span>{palace.五行 ?? ""} · {palace.旺衰 ?? ""}</span></header><div><strong>{palace.天盘}</strong><em>{palace.天将}</em></div><footer><span>遁 {palace.遁干}</span><span>{palace.长生十二神}</span><span>{palace.建除 ?? ""}</span></footer></article>)}
      </div>
    </section>
    <section className="daliuren-courses">
      <div className="classic-observatory__section-head"><div><span>四课</span><h3>事体与传导</h3></div><p>四课呈现上下神与乘将；三传呈现初、中、末的结构传导。</p></div>
      <div className="daliuren-courses__grid">{chart.四课.map((course) => <article key={course.课别}><span>{course.课别}</span><strong>{course.上神}</strong><i>临</i><b>{course.下神}</b><em>{course.乘将}</em></article>)}</div>
      <div className="daliuren-transmissions">{chart.三传.map((item, index) => <article key={item.传序}><span>{item.传序}</span><strong>{item.地支}</strong><div>{item.天将} · {item.六亲}</div><small>遁干 {item.遁干}</small>{index < chart.三传.length - 1 ? <i aria-hidden="true">→</i> : null}</article>)}</div>
    </section>
    <section className="classic-observatory__anchors"><strong>课体与动象</strong><div>{field("空亡", info.关键状态.空亡.join(" / "))}{field("驿马", info.关键状态.驿马)}{field("丁马", info.关键状态.丁马)}{field("天马", info.关键状态.天马)}{field("附加课体", info.附加课体?.join(" / "))}</div></section>
  </>;
}

function TaiyiBoard({ chart }: { chart: TaiyiJson }) {
  const context = chart.问卜与时空底盘;
  const env = chart.外部时空环境;
  return <>
    <section className="classic-observatory__summary taiyi-summary">{field("时间", context.时间)}{field("农历", context.农历)}{field("节气", context.节气)}{field("四柱", context.四柱)}{field("星宿", env.星宿)}{field("值星", env.值星)}{field("天神", env.天神)}{field("能量交互", chart.核心物理关系.能量交互)}</section>
    <section className="taiyi-star-section"><div className="classic-observatory__section-head"><div><span>九星阵列</span><h3>时间尺度中的星曜位置</h3></div><p>每张卡明确保留观测层级、五行、方位和宫位；先看本层级，再看星间关系。</p></div><div className="taiyi-star-grid">{chart.九星阵列.map((star) => <article key={`${star.观测层级}-${star.太乙名}`}><header><span>{star.观测层级}</span><b>{star.宫位}</b></header><strong>{star.太乙名}</strong><p>{star.神性}</p><footer><span>{star.五行}</span><span>{star.方位}</span><span>{star.北斗名}</span></footer></article>)}</div></section>
    <section className="taiyi-reading"><div><span>主诀原文</span><strong>{chart.古典参考.主诀原文}</strong></div><div><span>使用提示</span><p>{chart.古典参考.使用提示}</p></div></section>
  </>;
}

export function ClassicObservatoryPanel({ kind, value }: ClassicObservatoryPanelProps) {
  const isDaliuren = kind === "daliuren";
  const title = isDaliuren ? "大六壬盘面" : "太乙神数盘面";
  const description = isDaliuren ? "天地盘、四课与三传共同构成一张可读的起课结构。" : "日盘九星、时空环境与古典锚点共同构成一张可读的太乙盘。";
  const chart = value?.json as DaliurenJson | TaiyiJson | undefined;
  return <section className={`classic-observatory classic-observatory--${kind}`} aria-label={title}>
    <header className="classic-observatory__header"><div><span><Compass size={16} aria-hidden="true" /> 三式观测 · {isDaliuren ? "大六壬" : "太乙神数"}</span><h2>{title}</h2><p>{description}</p></div><div className="classic-observatory__protocol"><strong>观测协议</strong><span>结构 → 依据 → 现实核验</span></div></header>
    {chart ? isDaliuren ? <DaliurenBoard chart={chart as DaliurenJson} /> : <TaiyiBoard chart={chart as TaiyiJson} /> : <div className="empty-panel">当前时间无法生成此盘，请先检查日期、时间与时区。</div>}
  </section>;
}
