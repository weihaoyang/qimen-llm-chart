import type { NormalizedQimenChart } from "@/lib/qimen/types";
import {
  SUPPORTED_QIMEN_JU_METHODS,
  SUPPORTED_QIMEN_METHODS,
  UNSUPPORTED_QIMEN_METHODS,
} from "@/lib/qimen/settings";

type MetadataPanelProps = {
  chart: NormalizedQimenChart | null;
};

const joinPillar = (value: { stem: string; branch: string }) => `${value.stem}${value.branch}`;

export function MetadataPanel({ chart }: MetadataPanelProps) {
  if (!chart) {
    return <div className="empty-panel">等待时间信息。</div>;
  }

  return (
    <div className="metadata-panel">
      <div className="panel-heading metadata-panel__heading">
        <div>
          <h2>时盘仪表</h2>
        </div>
      </div>

      <div className="metadata-signal-grid">
        <div className="metadata-signal-card">
          <span>元局</span>
          <strong>
            {chart.raw.ju.type}
            {chart.raw.ju.number}局
          </strong>
        </div>
        <div className="metadata-signal-card">
          <span>三元</span>
          <strong>{chart.raw.yuan}元</strong>
        </div>
        <div className="metadata-signal-card">
          <span>时令</span>
          <strong>{chart.raw.season}</strong>
        </div>
        <div className="metadata-signal-card">
          <span>月建五行</span>
          <strong>{chart.raw.monthElement}</strong>
        </div>
      </div>

      <div className="metadata-group">
        <p className="metadata-label">时间</p>
        <div className="metadata-list">
          <div className="metadata-row">
            <span>输入时间</span>
            <strong>{chart.input.datetime}</strong>
          </div>
          <div className="metadata-row">
            <span>时区</span>
            <strong>{chart.input.timeZone}</strong>
          </div>
          <div className="metadata-row">
            <span>解析时间</span>
            <strong>{chart.interpretedDateTime}</strong>
          </div>
          <div className="metadata-row">
            <span>农历</span>
            <strong>{chart.raw.timeInfo.lunarDate}</strong>
          </div>
        </div>
      </div>

      <div className="metadata-group">
        <p className="metadata-label">四柱</p>
        <div className="metadata-list">
          <div className="metadata-row">
            <span>年柱</span>
            <strong>{joinPillar(chart.raw.fourPillars.year)}</strong>
          </div>
          <div className="metadata-row">
            <span>月柱</span>
            <strong>{joinPillar(chart.raw.fourPillars.month)}</strong>
          </div>
          <div className="metadata-row">
            <span>日柱</span>
            <strong>{joinPillar(chart.raw.fourPillars.day)}</strong>
          </div>
          <div className="metadata-row">
            <span>时柱</span>
            <strong>{joinPillar(chart.raw.fourPillars.hour)}</strong>
          </div>
        </div>
      </div>

      <div className="metadata-group">
        <p className="metadata-label">排盘口径</p>
        <div className="metadata-list">
          <div className="metadata-row">
            <span>算法引擎</span>
            <strong>{chart.engine === "taobi" ? "taobi" : "3meta"}</strong>
          </div>
          <div className="metadata-row">
            <span>当前口径</span>
            <strong>{[...SUPPORTED_QIMEN_JU_METHODS, ...SUPPORTED_QIMEN_METHODS].join(" / ")}</strong>
          </div>
          <div className="metadata-row">
            <span>用局法</span>
            <strong>
              {chart.input.qimenSettings?.method === "split"
                ? "拆补"
                : chart.input.qimenSettings?.method === "maoshan"
                  ? "茅山"
                  : "默认"}
            </strong>
          </div>
          <div className="metadata-row">
            <span>节气</span>
            <strong>{chart.raw.timeInfo.solarTerm ?? "自动"}</strong>
          </div>
          <div className="metadata-row">
            <span>阴阳遁</span>
            <strong>{chart.raw.ju.type}</strong>
          </div>
          <div className="metadata-row">
            <span>局数</span>
            <strong>{chart.raw.ju.number}局</strong>
          </div>
          <div className="metadata-row">
            <span>年界</span>
            <strong>{chart.input.qimenSettings?.yearDivide === "normal" ? "普通年界" : "立春精确"}</strong>
          </div>
          <div className="metadata-row">
            <span>未接入</span>
            <strong>{UNSUPPORTED_QIMEN_METHODS.join(" / ")}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
