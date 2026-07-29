import type { NormalizedBaziChart } from "@/lib/bazi/types";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { NormalizedQimenChart } from "@/lib/qimen/types";
import type { NormalizedZiweiChart } from "@/lib/ziwei/types";

type CombinedPanelProps = {
  input: NormalizedProfileInput;
  qimenChart: NormalizedQimenChart | null;
  baziChart: NormalizedBaziChart | null;
  ziweiChart: NormalizedZiweiChart | null;
};

export function CombinedPanel({
  input,
  qimenChart,
  baziChart,
  ziweiChart,
}: CombinedPanelProps) {
  return (
    <div className="combined-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-label">Combined</p>
          <h2>三盘联合研究台</h2>
        </div>
        <p>只做材料聚合与研究顺序整理，不在前端自动生成交叉断语或最后结论。</p>
      </div>

      <section className="combined-hero">
        <div className="combined-hero__main">
          <span>统一输入基准</span>
          <strong>{input.normalized.datetime}</strong>
          <p>
            {input.normalized.timeZone} / {input.normalized.timeBasis} /{" "}
            {input.original.calendarMode === "lunar" ? "农历输入" : "公历输入"} /{" "}
            {input.original.gender === "male" ? "男" : "女"}
          </p>
        </div>

        <div className="combined-hero__side">
          <div>
            <span>三盘状态</span>
            <strong>
              {qimenChart ? "奇门已就绪" : "奇门缺失"} · {baziChart ? "八字已就绪" : "八字缺失"} ·{" "}
              {ziweiChart ? "紫微已就绪" : "紫微缺失"}
            </strong>
          </div>
          <div>
            <span>研究边界</span>
            <strong>仅整理材料，不替用户先下结论</strong>
          </div>
        </div>
      </section>

      <section className="combined-anchor-grid">
        <article className="combined-anchor-card combined-anchor-card--qimen">
          <div className="combined-anchor-card__header">
            <span>奇门锚点</span>
            <strong>{qimenChart ? "Qimen" : "未生成"}</strong>
          </div>

          {qimenChart ? (
            <>
              <div className="combined-anchor-card__core">
                <div>
                  <span>节气</span>
                  <strong>{qimenChart.raw.timeInfo.solarTerm ?? "无"}</strong>
                </div>
                <div>
                  <span>元局</span>
                  <strong>
                    {qimenChart.raw.ju.type}
                    {qimenChart.raw.ju.number}局
                  </strong>
                </div>
                <div>
                  <span>值符</span>
                  <strong>
                    {qimenChart.raw.zhiFu.star} / {qimenChart.raw.zhiFu.position}宫
                  </strong>
                </div>
                <div>
                  <span>值使</span>
                  <strong>
                    {qimenChart.raw.zhiShi.gate} / {qimenChart.raw.zhiShi.position}宫
                  </strong>
                </div>
              </div>
              <p className="combined-anchor-card__note">
                先看时令、元局、值符值使与驿马，再回到九宫逐宫比对门星神干。
              </p>
            </>
          ) : (
            <div className="empty-panel">等待奇门材料。</div>
          )}
        </article>

        <article className="combined-anchor-card combined-anchor-card--bazi">
          <div className="combined-anchor-card__header">
            <span>八字锚点</span>
            <strong>{baziChart ? "Bazi" : "未生成"}</strong>
          </div>

          {baziChart ? (
            <>
              <div className="combined-anchor-card__core">
                <div>
                  <span>四柱</span>
                  <strong>{baziChart.raw.baZi.join(" / ")}</strong>
                </div>
                <div>
                  <span>日主</span>
                  <strong>{baziChart.raw.dayMaster}</strong>
                </div>
                <div>
                  <span>命宫 / 身宫</span>
                  <strong>
                    {baziChart.raw.mingGong.pillar} / {baziChart.raw.shenGong.pillar}
                  </strong>
                </div>
                <div>
                  <span>起运</span>
                  <strong>{baziChart.raw.yun.startSolar}</strong>
                </div>
              </div>
              <p className="combined-anchor-card__note">
                先读四柱与日主，再看藏干、十神、旬空与起运，不输出程序化强弱判断。
              </p>
            </>
          ) : (
            <div className="empty-panel">等待八字材料。</div>
          )}
        </article>

        <article className="combined-anchor-card combined-anchor-card--ziwei">
          <div className="combined-anchor-card__header">
            <span>紫微锚点</span>
            <strong>{ziweiChart ? "Ziwei" : "未生成"}</strong>
          </div>

          {ziweiChart ? (
            <>
              <div className="combined-anchor-card__core">
                <div>
                  <span>五行局</span>
                  <strong>{ziweiChart.raw.fiveElementsClass}</strong>
                </div>
                <div>
                  <span>命主 / 身主</span>
                  <strong>
                    {ziweiChart.raw.soul} / {ziweiChart.raw.body}
                  </strong>
                </div>
                <div>
                  <span>命宫 / 身宫</span>
                  <strong>
                    {ziweiChart.raw.earthlyBranchOfSoulPalace} /{" "}
                    {ziweiChart.raw.earthlyBranchOfBodyPalace}
                  </strong>
                </div>
                <div>
                  <span>四化</span>
                  <strong>
                    禄 {ziweiChart.raw.mutagens.lu} / 权 {ziweiChart.raw.mutagens.quan}
                  </strong>
                </div>
              </div>
              <p className="combined-anchor-card__note">
                先看命身宫、五行局、命主身主与四化，再回宫位与主辅星分布做阅读。
              </p>
            </>
          ) : (
            <div className="empty-panel">等待紫微材料。</div>
          )}
        </article>
      </section>

      <section className="combined-protocol-grid">
        <article className="combined-protocol-card">
          <span>Step 01</span>
          <strong>统一时间基准</strong>
          <p>先确认三盘都来自同一时区、同一时基和同一输入历法，避免比较时出现基准漂移。</p>
        </article>

        <article className="combined-protocol-card">
          <span>Step 02</span>
          <strong>单盘锚点先行</strong>
          <p>不要直接跳结论，先各自读取奇门锚点、八字四柱、紫微命身与四化这些最稳定材料。</p>
        </article>

        <article className="combined-protocol-card">
          <span>Step 03</span>
          <strong>寻找重复母题</strong>
          <p>把三盘都在强调的位置、时序、宫位或十神意象并列，再决定是否值得进入联合分析。</p>
        </article>

        <article className="combined-protocol-card">
          <span>Step 04</span>
          <strong>交给右侧输出区</strong>
          <p>右侧已准备结构化文本与 LLM JSON，联合模式只负责把输入、锚点与研究顺序整理清楚。</p>
        </article>
      </section>
    </div>
  );
}
