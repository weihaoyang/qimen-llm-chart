import { QimenChart, i18n } from "3meta";
import type { NormalizedProfileInput } from "@/lib/profile";
import type { QimenSettings } from "./settings";
import { formatLocalDateTime } from "./timezone";
import type { NormalizedQimenChart, RawChartData, UserChartInput } from "./types";

i18n.setLocale("zh-CN");

const sortPalaces = (chart: RawChartData) =>
  [...chart.palaces].sort((left, right) => left.position - right.position);

/**
 * 「拆补 / 茅山」已撤下（见 `./settings.ts` 的定级说明与 `./ju-methods.test.ts` 的审计）。
 * 历史设置（localStorage / 旧链接）里可能仍带着 `method: "split" | "maoshan"`，这里一律
 * 降级到默认口径，并把**生效**口径回写进 `input`：否则核验层、参考盘提示与序列导出会
 * 把一张 3meta 盘当成跨引擎对照盘来解释。
 */
const normalizeQimenMethod = (settings?: QimenSettings): QimenSettings | undefined =>
  settings ? { ...settings, method: "default" } : undefined;

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
  const qimenSettings = normalizeQimenMethod(input.qimenSettings);
  const rawChart = QimenChart.byDatetime(
    formatLocalDateTime(input.datetime),
    buildChartOptions(qimenSettings),
  ).toJSON() as RawChartData;
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
    engine: "3meta",
    input: qimenSettings ? { ...input, qimenSettings } : input,
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
