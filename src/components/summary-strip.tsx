import type { NormalizedQimenChart } from "@/lib/qimen/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type SummaryStripProps = {
  chart: NormalizedQimenChart;
};

const SUMMARY_ITEMS = [
  { label: "节气", key: "solarTerm" },
  { label: "旬首", key: "xunShou" },
  { label: "阴阳遁", key: "juType" },
  { label: "局数", key: "juNumber" },
  { label: "值符", key: "zhiFu" },
  { label: "值使", key: "zhiShi" },
  { label: "驿马", key: "postHorse" },
  { label: "时盘仪表", key: "metadata" },
  { label: "四柱", key: "pillars" },
] as const;

export function SummaryStrip({ chart }: SummaryStripProps) {
  const values: Record<(typeof SUMMARY_ITEMS)[number]["key"], string> = {
    solarTerm: chart.raw.timeInfo.solarTerm ?? "无",
    xunShou: chart.raw.timeInfo.xunShou,
    juType: chart.raw.ju.type,
    juNumber: String(chart.raw.ju.number),
    zhiFu: `${chart.raw.zhiFu.star} / ${chart.raw.zhiFu.position}宫`,
    zhiShi: `${chart.raw.zhiShi.gate} / ${chart.raw.zhiShi.position}宫`,
    postHorse: `${chart.raw.postHorse.branch} / ${chart.raw.postHorse.position}宫`,
    metadata: `${chart.raw.ju.type}${chart.raw.ju.number}局 · ${chart.raw.yuan} · ${chart.raw.season} · ${chart.raw.monthElement}`,
    pillars: [
      chart.raw.fourPillars.year,
      chart.raw.fourPillars.month,
      chart.raw.fourPillars.day,
      chart.raw.fourPillars.hour,
    ]
      .map((pillar) => `${pillar.stem}${pillar.branch}`)
      .join(" · "),
  };

  return (
    <div className="summary-strip">
      {SUMMARY_ITEMS.map((item) => (
        <Card
          className={
            item.key === "metadata"
              ? "summary-chip summary-chip--metadata"
              : item.key === "pillars"
                ? "summary-chip summary-chip--pillars"
                : item.key === "zhiFu" || item.key === "zhiShi" || item.key === "postHorse"
              ? "summary-chip summary-chip--signal"
              : item.key === "juType" || item.key === "juNumber"
                ? "summary-chip summary-chip--core"
                : "summary-chip"
          }
          key={item.key}
        >
          <CardContent className="summary-chip__content">
            <Badge className="summary-chip__badge" variant="secondary">
              {item.label}
            </Badge>
            <strong>{values[item.key]}</strong>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
