import { Solar } from "lunar-typescript";
import { getChinaEphemerisParts } from "@/lib/qimen/timezone";

// The lunar ephemeris expresses term times on the China Standard Time clock.
const monthGenerals = new Map([
  ["大寒", "子"], ["雨水", "亥"], ["春分", "戌"], ["谷雨", "酉"],
  ["小满", "申"], ["夏至", "未"], ["大暑", "午"], ["处暑", "巳"],
  ["秋分", "辰"], ["霜降", "卯"], ["小雪", "寅"], ["冬至", "丑"],
]);

export function monthGeneralAt(instant: Date): string {
  const { year, month, day, hour, minute, second } = getChinaEphemerisParts(instant);
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, second).getLunar();
  const term = lunar.getPrevQi(false).getName();
  const general = monthGenerals.get(term);
  if (general === undefined) throw new Error(`无法按中气「${term}」确定月将。`);
  return general;
}
