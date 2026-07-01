import { QimenChart, i18n } from "3meta";
import { formatDateTimeInZone, toZonedDate } from "./timezone";
import type { NormalizedQimenChart, RawChartData, UserChartInput } from "./types";

i18n.setLocale("zh-CN");

const sortPalaces = (chart: RawChartData) =>
  [...chart.palaces].sort((left, right) => left.position - right.position);

export const buildChart = (
  input: UserChartInput,
): NormalizedQimenChart => {
  if (!input.datetime) {
    throw new Error("请输入日期时间。");
  }

  if (!input.timeZone) {
    throw new Error("请输入时区。");
  }

  const zonedDate = toZonedDate(input.datetime, input.timeZone);
  const rawChart = QimenChart.byDatetime(zonedDate).toJSON() as RawChartData;
  const palaces = sortPalaces(rawChart);
  const hiddenStemsByPalace = Object.fromEntries(
    Object.entries(rawChart.hiddenStems ?? {}).map(([key, value]) => [
      Number(key),
      String(value),
    ]),
  );
  const palaceMap = Object.fromEntries(
    palaces.map((palace) => [palace.position, palace]),
  ) as Record<number, RawChartData["palaces"][number]>;

  return {
    input,
    interpretedDateTime: formatDateTimeInZone(zonedDate, input.timeZone),
    raw: {
      ...rawChart,
      palaces,
    },
    hiddenStemsByPalace,
    palaceMap,
  };
};
