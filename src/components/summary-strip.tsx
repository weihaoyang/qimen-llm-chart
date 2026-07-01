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
  };

  return (
    <div className="summary-strip">
      {SUMMARY_ITEMS.map((item) => (
        <Card className="summary-chip" key={item.key}>
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
