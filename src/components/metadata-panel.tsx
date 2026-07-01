import type { NormalizedQimenChart } from "@/lib/qimen/types";

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
    </div>
  );
}
