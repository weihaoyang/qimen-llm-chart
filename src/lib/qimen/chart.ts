import { Solar } from "lunar-typescript";
import { getCivilDateTime } from "@/lib/profile/normalize";
import { QimenChart, i18n } from "3meta";
import type { NormalizedProfileInput } from "@/lib/profile";
import { beiGeReasons, sanQiRestrictionReasons, sanQiTombStems, tianWangReasons, metalStarInFireReasons, fireInMetalReasons, matchesPillarGengGe, matchesPillarFeiGan, matchesFeiGong, matchesFuGong, matchesSanQiDeShi, matchesSanZha, matchesHuDun, matchesGuiDun, matchesQiYouLuWei, matchesSanQiShengDian, matchesDiJia, matchesRenJia, matchesShenJia, matchesGuiJia, matchesHuanYi, matchesXiangZuo, yunDunReasons, fengDunReasons, tianDunReasons, renDunReasons, longDunReasons, shenDunReasons } from "./patterns";
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
  const huanYiId = "patterns.common.huan_yi";
  const xiangZuoId = "patterns.common.xiang_zuo";
  const yunDunId = "patterns.jiu_dun.yun_dun";
  const fengDunId = "patterns.jiu_dun.feng_dun";
  const tianDunId = "patterns.jiu_dun.tian_dun";
  const renDunId = "patterns.jiu_dun.ren_dun";
  const shenDunId = "patterns.jiu_dun.shen_dun";
  const longDunId = "patterns.jiu_dun.long_dun";
  const sanZha = [
    { id: "patterns.san_za_wu_jia.zhen_zha", name: "真诈", deity: "太阴" },
    { id: "patterns.san_za_wu_jia.xiu_zha", name: "休诈", deity: "六合" },
    { id: "patterns.san_za_wu_jia.chong_zha", name: "重诈", deity: "九地" },
  ];
  const correctedGoodRules = [
    { id: "patterns.jiu_dun.hu_dun", name: "虎遁", match: matchesHuDun },
    { id: "patterns.jiu_dun.gui_dun", name: "鬼遁", match: matchesGuiDun },
    { id: "patterns.san_za_wu_jia.di_jia", name: "地假", match: matchesDiJia },
    { id: "patterns.san_za_wu_jia.ren_jia", name: "人假", match: matchesRenJia },
    { id: "patterns.san_za_wu_jia.shen_jia", name: "神假", match: matchesShenJia },
    { id: "patterns.san_za_wu_jia.gui_jia", name: "鬼假", match: matchesGuiJia },
    { id: "patterns.common.qi_you_lu_wei", name: "奇游禄位", match: matchesQiYouLuWei },
    { id: "patterns.common.san_qi_sheng_dian", name: "三奇贵人升殿", match: matchesSanQiShengDian },
  ];
  const isCorrectedGoodPattern = (id: string | undefined) => id === sanQiId || id === huanYiId || id === xiangZuoId || id === yunDunId || id === fengDunId || id === tianDunId || id === renDunId || id === longDunId || id === shenDunId || sanZha.some(rule => rule.id === id) || correctedGoodRules.some(rule => rule.id === id);
  const fuGongId = "patterns.bad.fu_gong_ge";
  const feiGongId = "patterns.bad.fei_gong_ge";
  const pillarGengRules = [
    { id: "patterns.bad.sui_ge", name: "岁格", pillar: rawChart.fourPillars.year },
    { id: "patterns.bad.yue_ge", name: "月格", pillar: rawChart.fourPillars.month },
    { id: "patterns.bad.shi_ge", name: "时格", pillar: rawChart.fourPillars.hour },
    { id: "patterns.bad.ri_ge", name: "日格（伏干格）", pillar: rawChart.fourPillars.day },
  ];
  const feiGanId = "patterns.bad.fei_gan_ge";
  const tianWangId = "patterns.bad.tian_wang_si_zhang";
  const sanQiTombId = "patterns.bad.san_qi_ru_mu";
  const sanQiRestrictionId = "patterns.bad.san_qi_shou_xing";
  const beiGeId = "patterns.bad.bei_ge";
  const metalStarId = "patterns.bad.jin_ru_huo_xiang_star";
  const fireStarGateId = "patterns.bad.huo_ru_jin_xiang_star_gate";
  const isCorrectedBadPattern = (id: string | undefined) => id === fuGongId || id === feiGongId || id === feiGanId || id === tianWangId || id === sanQiTombId || id === sanQiRestrictionId || id === beiGeId || id === metalStarId || id === fireStarGateId || id === "patterns.bad.fu_gan_ge" || pillarGengRules.some(rule => rule.id === id);
  const palaces = sortPalaces(rawChart).map((palace) => {
    const auspiciousPatterns = (palace.auspiciousPatterns ?? []).filter(({ id }) => !isCorrectedGoodPattern(id));
    const inauspiciousPatterns = (palace.inauspiciousPatterns ?? []).filter(({ id }) => !isCorrectedBadPattern(id));
    const position = palace.position;
    const metalStarReasons = metalStarInFireReasons(palace);
    if (metalStarReasons.length) inauspiciousPatterns.push({ id: metalStarId, name: "金入火乡（星）", type: "金入火乡（星）", position, description: `${metalStarReasons.join("、")}（艺术典704）` });
    const fireReasons = fireInMetalReasons(palace);
    if (fireReasons.length) inauspiciousPatterns.push({ id: fireStarGateId, name: "火入金乡（星门）", type: "火入金乡（星门）", position, description: `${fireReasons.join("、")}（艺术典704，分别临宫解读）` });
    if (matchesHuanYi(palace, rawChart.zhiFu.heavenlyStem)) auspiciousPatterns.push({ id: huanYiId, name: "欢怡", type: "欢怡", position, description: "天盘三奇临地盘本旬值符遁仪" });
    if (matchesXiangZuo(palace, rawChart.zhiFu.position)) auspiciousPatterns.push({ id: xiangZuoId, name: "相佐", type: "相佐", position, description: "天盘值符临地盘三奇" });
    const yunReasons = yunDunReasons(palace);
    if (yunReasons.length) auspiciousPatterns.push({ id: yunDunId, name: "云遁", type: "云遁", position, description: yunReasons.join("、") });
    const fengReasons = fengDunReasons(palace);
    if (fengReasons.length) auspiciousPatterns.push({ id: fengDunId, name: "风遁", type: "风遁", position, description: fengReasons.join("、") });
    const tianReasons = tianDunReasons(palace);
    if (tianReasons.length) auspiciousPatterns.push({ id: tianDunId, name: "天遁", type: "天遁", position, description: tianReasons.join("、") });
    const renReasons = renDunReasons(palace);
    if (renReasons.length) auspiciousPatterns.push({ id: renDunId, name: "人遁", type: "人遁", position, description: renReasons.join("、") });
    const shenReasons = shenDunReasons(palace);
    if (shenReasons.length) auspiciousPatterns.push({ id: shenDunId, name: "神遁", type: "神遁", position, description: shenReasons.join("、") });
    const longReasons = longDunReasons(palace);
    if (longReasons.length) auspiciousPatterns.push({ id: longDunId, name: "龙遁", type: "龙遁", position, description: longReasons.join("、") });
    if (matchesSanQiDeShi(palace)) {
      auspiciousPatterns.push({ id: sanQiId, name: "三奇得使", type: "三奇得使", position, description: "天盘三奇配地盘六甲所遁之仪" });
    }
    for (const rule of correctedGoodRules) {
      if (rule.match(palace)) {
        auspiciousPatterns.push({
          id: rule.id, name: rule.name, type: rule.name, position,
          description: rule.id.startsWith("patterns.jiu_dun.")
            ? "依《奇门遁甲秘笈大全》奇门吉格所列条件"
            : rule.id.startsWith("patterns.san_za_wu_jia.")
              ? "五假以天盘干合门神；人假取《奇门法窍》六壬读法"
              : "天盘三奇临本宫，依《奇门法窍》升殿、奇游禄位条",
        });
      }
    }
    for (const rule of sanZha) {
      if (matchesSanZha(palace, rule.deity)) {
        auspiciousPatterns.push({
          id: rule.id, name: rule.name, type: rule.name, position,
          description: "天盘三奇合开休生三吉门，下临" + rule.deity,
        });
      }
    }
    for (const rule of pillarGengRules) {
      if (matchesPillarGengGe(palace, rule.pillar)) {
        inauspiciousPatterns.push({ id: rule.id, name: rule.name, type: rule.name, position, description: "天盘庚加该柱地盘干；甲按本柱六甲遁仪" });
      }
    }
    const beiReasons = beiGeReasons(palace, rawChart.zhiFu.heavenlyStem, rawChart.zhiFu.position, rawChart.fourPillars);
    if (beiReasons.length) {
      inauspiciousPatterns.push({ id: beiGeId, name: "悖格", type: "悖格", position, description: beiReasons.join("、") });
    }
    const restrictionReasons = sanQiRestrictionReasons(palace);
    if (restrictionReasons.length) {
      inauspiciousPatterns.push({ id: sanQiRestrictionId, name: "三奇受刑", type: "三奇受刑", position, description: restrictionReasons.join("、") });
    }
    const tombStems = sanQiTombStems(palace);
    if (tombStems.length) {
      inauspiciousPatterns.push({ id: sanQiTombId, name: "三奇入墓", type: "三奇入墓", position, description: `天盘${tombStems.join("/")}入墓（本站口径）` });
    }
    const tianWang = tianWangReasons(palace, rawChart.zhiFu.position);
    if (tianWang.length) {
      inauspiciousPatterns.push({ id: tianWangId, name: "天网四张（两种口径）", type: "天网四张", position, description: tianWang.join("、") });
    }
    if (matchesPillarFeiGan(palace, rawChart.fourPillars.day)) {
      inauspiciousPatterns.push({ id: feiGanId, name: "飞干格", type: "飞干格", position, description: "天盘日干加地盘庚；甲按日柱遁仪" });
    }
    if (matchesFuGong(palace, rawChart.zhiFu.heavenlyStem)) {
      inauspiciousPatterns.push({ id: fuGongId, name: "伏宫格", type: "伏宫格", position, description: "天盘庚临地盘本旬值符原宫" });
    }
    if (matchesFeiGong(palace, rawChart.zhiFu.position)) {
      inauspiciousPatterns.push({ id: feiGongId, name: "飞宫格", type: "飞宫格", position, description: "天盘值符临地盘庚" });
    }
    return { ...palace, auspiciousPatterns, inauspiciousPatterns };
  });
  const auspiciousPatterns = (rawChart.specialPatterns.auspiciousPatterns ?? []).filter(({ id }) => !isCorrectedGoodPattern(id));
  auspiciousPatterns.push(...palaces.flatMap((palace) => palace.auspiciousPatterns.filter(({ id }) => isCorrectedGoodPattern(id))));
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
