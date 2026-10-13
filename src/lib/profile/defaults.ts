import { getResolvedTimeZone } from "@/lib/qimen/defaults";
import { formatDateTimeInputInZone, getTimeZoneParts } from "@/lib/qimen/timezone";
import { DEFAULT_QIMEN_SETTINGS } from "@/lib/qimen/settings";
import { DEFAULT_BAZI_SETTINGS } from "@/lib/bazi/settings";
import type { ProfileInput } from "./types";
import { findBirthCity } from "./cities";

export const getDefaultProfileInput = (
  now = new Date(),
  resolvedTimeZone?: string,
): ProfileInput => {
  const timeZone = getResolvedTimeZone(resolvedTimeZone);
  const defaultCity = findBirthCity("上海");
  // 一律在目标时区里取年月日时分，不用 `Date#getHours()` 这类进程本地时区的读法：
  // 生产服务器的进程时区是 UTC，若在这里泄漏进来，服务端与浏览器就会渲染出不同的
  // 时间文本（React #418 水合不一致）。默认盘面的时间也应该是"这个时区的墙上时间"。
  const local = getTimeZoneParts(now, timeZone);

  return {
    calendarMode: "solar",
    datetime: formatDateTimeInputInZone(now, timeZone),
    timeZone,
    location: defaultCity
      ? {
          city: defaultCity.city,
          timeZone,
          longitude: defaultCity.longitude,
          latitude: defaultCity.latitude,
        }
      : undefined,
    gender: "male",
    timeBasis: "civil",
    baziSettings: DEFAULT_BAZI_SETTINGS,
    qimenSettings: DEFAULT_QIMEN_SETTINGS,
    solar: {
      year: local.year,
      month: local.month,
      day: local.day,
      hour: local.hour,
      minute: local.minute,
    },
  };
};
