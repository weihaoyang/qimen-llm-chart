import { getPosition } from "celestine";
import { JIAZI } from "3meta";
import { offsetMinutes } from "@/lib/astro/chart";
import { buildQimenChartFromProfile } from "@/lib/qimen/chart";
import type { NormalizedProfileInput } from "@/lib/profile";
import { DI_ZHI, GUI_SHUN_ZHI, JIAN_CHU, JI_GONG, SAN_HE, SHEN_JIANG, YE_GUI, YI_MA, YUE_JIANG_NAMES, ZHOU_GUI, liuQin, xunAndKong, xunDun, yueJiangFromSunLongitude } from "./data";
import { GE_NAMES, SANCHUAN_TABLE } from "./sanchuan-table";

const DAY_BRANCHES = ["卯", "辰", "巳", "午", "未", "申"];
const mod12 = (value: number) => ((value % 12) + 12) % 12;

export const julianDayAt = (datetime: string, timeZone: string) => {
  const [date, time] = datetime.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes(datetime, timeZone) * 60000;
  return 2440587.5 + utcMillis / 86400000;
};

export type LiurenPlateCell = { di: string; tian: string; jiang: string; dun: string; jianChu: string };
export type LiurenLesson = { index: number; upper: string; lower: string; jiang: string; liuQin: string; dunGan: string };
export type LiurenTransmission = { name: string; zhi: string; jiang: string; liuQin: string; dunGan: string };

export type LiurenChart = {
  format: "qmdj-liuren-v1";
  input: { datetime: string; timeZone: string };
  fourPillars: { year: string; month: string; day: string; hour: string };
  dayGanZhi: string;
  hourZhi: string;
  yueJiang: { zhi: string; name: string };
  xunShou: string;
  kongWang: string[];
  yiMa: string;
  keTi: string;
  plate: LiurenPlateCell[];
  lessons: LiurenLesson[];
  transmissions: LiurenTransmission[];
  disclaimer: string;
};

export const buildLiurenChart = (profile: NormalizedProfileInput): LiurenChart => {
  const datetime = profile.normalized.datetime;
  const timeZone = profile.normalized.timeZone;
  const qimen = buildQimenChartFromProfile(profile);
  const pillars = qimen.raw.fourPillars;
  const fourPillars = {
    year: `${pillars.year.stem}${pillars.year.branch}`,
    month: `${pillars.month.stem}${pillars.month.branch}`,
    day: `${pillars.day.stem}${pillars.day.branch}`,
    hour: `${pillars.hour.stem}${pillars.hour.branch}`,
  };
  const dayGanZhi = fourPillars.day;
  const riGan = pillars.day.stem;
  const riZhi = pillars.day.branch;
  const hourZhi = pillars.hour.branch;
  const monthZhi = pillars.month.branch;
  const hourIndex = DI_ZHI.indexOf(hourZhi);

  // 月将：太阳过宫（以太阳黄经定中气）
  const sunLongitude = getPosition("Sun", julianDayAt(datetime, timeZone)).longitude;
  const yueJiangIndex = yueJiangFromSunLongitude(sunLongitude);
  const yueJiangZhi = DI_ZHI[yueJiangIndex];

  // 天地盘：月将加时
  const tianPan: Record<string, string> = {};
  for (let j = 0; j < 12; j += 1) tianPan[DI_ZHI[j]] = DI_ZHI[mod12(yueJiangIndex + j - hourIndex)];

  // 十二天将：昼贵 / 夜贵起贵人，顺逆随贵人所临
  const zhou = DAY_BRANCHES.includes(hourZhi);
  const guiZhi = zhou ? ZHOU_GUI[riGan] : YE_GUI[riGan];
  let guiDiIndex = 0;
  for (let j = 0; j < 12; j += 1) if (tianPan[DI_ZHI[j]] === guiZhi) guiDiIndex = j;
  const shun = GUI_SHUN_ZHI.includes(DI_ZHI[guiDiIndex]);
  const jiangByTian: Record<string, string> = {};
  for (let i = 0; i < 12; i += 1) {
    const diIndex = mod12(shun ? guiDiIndex + i : guiDiIndex - i);
    jiangByTian[tianPan[DI_ZHI[diIndex]]] = SHEN_JIANG[i];
  }

  // 旬首 / 旬空 / 旬遁
  const { xunShou, kong } = xunAndKong(JIAZI, dayGanZhi);
  const dun = xunDun(xunShou);

  // 建除十二神：以月建之天盘所临地盘宫起「建」（同 liuren-ts-lib 口径）
  let jianStart = 0;
  for (let j = 0; j < 12; j += 1) if (tianPan[DI_ZHI[j]] === monthZhi) jianStart = j;
  const jianChuByDi: Record<string, string> = {};
  for (let i = 0; i < 12; i += 1) jianChuByDi[DI_ZHI[mod12(jianStart + i)]] = JIAN_CHU[i];

  const plate: LiurenPlateCell[] = DI_ZHI.map((di) => ({ di, tian: tianPan[di], jiang: jiangByTian[tianPan[di]] ?? "", dun: dun[di] ?? "", jianChu: jianChuByDi[di] }));

  const shang = (zhi: string) => tianPan[zhi];
  const lesson = (index: number, upper: string, lower: string): LiurenLesson => ({
    index,
    upper,
    lower,
    jiang: jiangByTian[upper] ?? "",
    liuQin: liuQin(riGan, upper),
    dunGan: dun[lower] ?? "",
  });
  const jiGong = JI_GONG[riGan];
  const ke1Upper = shang(jiGong);
  const ke2Upper = shang(ke1Upper);
  const ke3Upper = shang(riZhi);
  const ke4Upper = shang(ke3Upper);
  const lessons: LiurenLesson[] = [lesson(1, ke1Upper, riGan), lesson(2, ke2Upper, ke1Upper), lesson(3, ke3Upper, riZhi), lesson(4, ke4Upper, ke3Upper)];

  // 三传：以「日干支 + 干上神」查表（见 sanchuan-table 说明）
  const entry = SANCHUAN_TABLE[dayGanZhi]?.[DI_ZHI.indexOf(ke1Upper)] ?? ["", 0];
  const [chuan, geIndex] = entry;
  const chuanZhi = chuan.split("");
  const geName = GE_NAMES[geIndex] ?? "";
  const sorted = [...chuanZhi].sort().join("");
  const sanHe = SAN_HE[sorted] ?? (["辰", "戌", "丑", "未"].every((zhi) => chuanZhi.includes(zhi)) && chuanZhi.length === 3 ? "稼穑" : "");
  const transmissions: LiurenTransmission[] = ["初传", "中传", "末传"].map((name, index) => {
    const zhi = chuanZhi[index] ?? "";
    return { name, zhi, jiang: jiangByTian[zhi] ?? "", liuQin: liuQin(riGan, zhi), dunGan: dun[zhi] ?? "" };
  });

  return {
    format: "qmdj-liuren-v1",
    input: { datetime, timeZone },
    fourPillars,
    dayGanZhi,
    hourZhi,
    yueJiang: { zhi: yueJiangZhi, name: YUE_JIANG_NAMES[yueJiangIndex] },
    xunShou,
    kongWang: kong,
    yiMa: YI_MA[riZhi] ?? "",
    keTi: sanHe ? `${geName}·${sanHe}` : geName,
    plate,
    lessons,
    transmissions,
    disclaimer: "大六壬研究盘：天地盘以「月将加时」起（月将按太阳过宫），四课依干寄宫，三传按「日干支＋干上神」查表（移植自 Apache-2.0 的 liuren-ts-lib），天将依昼夜贵人与顺逆，另附旬遁、旬空、驿马、建除。天将的昼夜贵人取通行口诀（壬癸昼卯夜巳，个别流派互乙）。结果仅供研究，不构成预测或现实裁决。",
  };
};
