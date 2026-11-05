import { Solar } from "lunar-typescript";
import { getCivilDateTime } from "@/lib/profile/normalize";
import { QimenChart, i18n } from "3meta";
import type { NormalizedProfileInput } from "@/lib/profile";
import { matchesFeiGong, matchesFuGong, matchesSanQiDeShi } from "./patterns";
import { QIMEN_SOLAR_TERMS, type QimenSettings } from "./settings";
import { formatLocalDateTime, getChinaEphemerisParts, toZonedDate } from "./timezone";
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
  civilDatetime = input.datetime,
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
  const qimenSettings = input.qimenSettings;
  const selectedTerm = qimenSettings?.solarTerm;
  if (selectedTerm && selectedTerm !== "auto" && !QIMEN_SOLAR_TERMS.some((term) => term === selectedTerm)) {
    throw new Error(`未知的奇门节气：${selectedTerm}`);
  }
  const instant = toZonedDate(civilDatetime, input.timeZone);
  const { year, month, day, hour, minute, second } = getChinaEphemerisParts(instant);
  const ephemeris = Solar.fromYmdHms(year, month, day, hour, minute, second).getLunar();
  const options = {
    solarTerm: ephemeris.getPrevJieQi(false).getName(),
    exactYearGZ: ephemeris.getYearInGanZhiExact(),
    exactMonthGZ: ephemeris.getMonthInGanZhiExact(),
    ...buildChartOptions(qimenSettings),
  };
  const rawChart = QimenChart.byDatetime(
    localDateTime,
    options,
  ).toJSON() as RawChartData;
  const sanQiId = "patterns.common.san_qi_de_shi";
  const fuGongId = "patterns.bad.fu_gong_ge";
  const feiGongId = "patterns.bad.fei_gong_ge";
  const isCorrectedBadPattern = (id: string | undefined) => id === fuGongId || id === feiGongId;
  const palaces = sortPalaces(rawChart).map((palace) => {
    const auspiciousPatterns = (palace.auspiciousPatterns ?? []).filter(({ id }) => id !== sanQiId);
    const inauspiciousPatterns = (palace.inauspiciousPatterns ?? []).filter(({ id }) => !isCorrectedBadPattern(id));
    const position = palace.position;
    if (matchesSanQiDeShi(palace)) {
      auspiciousPatterns.push({ id: sanQiId, name: "三奇得使", type: "三奇得使", position, description: "天盘三奇配地盘六甲所遁之仪" });
    }
    if (matchesFuGong(palace, rawChart.zhiFu.heavenlyStem)) {
      inauspiciousPatterns.push({ id: fuGongId, name: "伏宫格", type: "伏宫格", position, description: "天盘庚临地盘本旬值符原宫" });
    }
    if (matchesFeiGong(palace, rawChart.zhiFu.position)) {
      inauspiciousPatterns.push({ id: feiGongId, name: "飞宫格", type: "飞宫格", position, description: "天盘值符临地盘庚" });
    }
    return { ...palace, auspiciousPatterns, inauspiciousPatterns };
  });
  const auspiciousPatterns = (rawChart.specialPatterns.auspiciousPatterns ?? []).filter(({ id }) => id !== sanQiId);
  auspiciousPatterns.push(...palaces.flatMap((palace) => palace.auspiciousPatterns.filter(({ id }) => id === sanQiId)));
  const inauspiciousPatterns = (rawChart.specialPatterns.inauspiciousPatterns ?? []).filter(({ id }) => !isCorrectedBadPattern(id));
  inauspiciousPatterns.push(...palaces.flatMap((palace) => palace.inauspiciousPatterns.filter(({ id }) => isCorrectedBadPattern(id))));
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
      specialPatterns: { ...rawChart.specialPatterns, auspiciousPatterns, inauspiciousPatterns },
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
  }, getCivilDateTime(profile));
