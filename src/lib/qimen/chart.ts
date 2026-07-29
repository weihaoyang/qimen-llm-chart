import { QimenChart, i18n } from "3meta";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { QimenSettings } from "./settings";
import { buildTaobiChartData } from "./taobi";
import { formatLocalDateTime } from "./timezone";
import type { NormalizedQimenChart, RawChartData, UserChartInput } from "./types";

i18n.setLocale("zh-CN");

const sortPalaces = (chart: RawChartData) =>
  [...chart.palaces].sort((left, right) => left.position - right.position);

const buildChartOptions = (settings?: QimenSettings) => {
  if (!settings) {
    return undefined;
  }

  return {
    ...(settings.solarTerm !== "auto" ? { solarTerm: settings.solarTerm } : {}),
    ...(settings.dunType !== "auto"
      ? { isYangdun: settings.dunType === "yang" }
      : {}),
    ...(settings.juNumber !== "auto" ? { juNumber: settings.juNumber } : {}),
    yearDivide: settings.yearDivide,
  } as const;
};

export const buildChart = (
  input: UserChartInput,
): NormalizedQimenChart => {
  if (!input.datetime) {
    throw new Error("请输入日期时间。");
  }

  if (!input.timeZone) {
    throw new Error("请输入时区。");
  }

  // 3meta expects local wall-clock calendar fields rather than a timezone-shifted Date object.
  // Passing a Date here would convert the user's selected local time into the runtime timezone
  // and can shift the hour/day when the selected timezone differs from the local machine.
  const localDateTime = formatLocalDateTime(input.datetime);
  const qimenMethod = input.qimenSettings?.method;
  const baseRawChart = QimenChart.byDatetime(
    formatLocalDateTime(input.datetime),
    buildChartOptions(input.qimenSettings),
  ).toJSON() as RawChartData;
  const useTaobiMethod = qimenMethod === "split" || qimenMethod === "maoshan";
  const rawChart =
    useTaobiMethod && qimenMethod
      ? buildTaobiChartData(input.datetime, input.timeZone, baseRawChart, qimenMethod)
      : baseRawChart;
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
    engine: useTaobiMethod ? "taobi" : "3meta",
    input,
    interpretedDateTime: localDateTime,
    raw: {
      ...rawChart,
      palaces,
    },
    hiddenStemsByPalace,
    palaceMap,
  };
};

export const buildQimenChartFromProfile = (
  profile: NormalizedProfileInput,
): NormalizedQimenChart =>
  buildChart({
    datetime: profile.normalized.datetime,
    timeZone: profile.normalized.timeZone,
    qimenSettings: profile.original.qimenSettings,
  });
