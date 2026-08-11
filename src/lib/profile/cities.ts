import type { GeoLocationInput } from "./types";

export type BirthCity = GeoLocationInput & {
  city: string;
  timeZone: string;
  longitude: number;
  latitude: number;
};

/**
 * City-level coordinates used by the true-solar-time correction.
 * The catalog intentionally keeps the IANA zone alongside the coordinates so
 * changing a city cannot leave the form with a mismatched civil-time zone.
 */
export const BIRTH_CITY_CATALOG: readonly BirthCity[] = [
  { city: "北京", timeZone: "Asia/Shanghai", longitude: 116.4074, latitude: 39.9042 },
  { city: "上海", timeZone: "Asia/Shanghai", longitude: 121.4737, latitude: 31.2304 },
  { city: "广州", timeZone: "Asia/Shanghai", longitude: 113.2644, latitude: 23.1291 },
  { city: "深圳", timeZone: "Asia/Shanghai", longitude: 114.0579, latitude: 22.5431 },
  { city: "南京", timeZone: "Asia/Shanghai", longitude: 118.7969, latitude: 32.0603 },
  { city: "杭州", timeZone: "Asia/Shanghai", longitude: 120.1551, latitude: 30.2741 },
  { city: "武汉", timeZone: "Asia/Shanghai", longitude: 114.3055, latitude: 30.5928 },
  { city: "成都", timeZone: "Asia/Shanghai", longitude: 104.0665, latitude: 30.5723 },
  { city: "重庆", timeZone: "Asia/Shanghai", longitude: 106.5516, latitude: 29.563 },
  { city: "西安", timeZone: "Asia/Shanghai", longitude: 108.9398, latitude: 34.3416 },
  { city: "天津", timeZone: "Asia/Shanghai", longitude: 117.2000, latitude: 39.0842 },
  { city: "沈阳", timeZone: "Asia/Shanghai", longitude: 123.4315, latitude: 41.8057 },
  { city: "哈尔滨", timeZone: "Asia/Shanghai", longitude: 126.6424, latitude: 45.7567 },
  { city: "长春", timeZone: "Asia/Shanghai", longitude: 125.3235, latitude: 43.8171 },
  { city: "昆明", timeZone: "Asia/Shanghai", longitude: 102.8329, latitude: 24.8801 },
  { city: "乌鲁木齐", timeZone: "Asia/Shanghai", longitude: 87.6168, latitude: 43.8256 },
  { city: "拉萨", timeZone: "Asia/Shanghai", longitude: 91.1409, latitude: 29.6525 },
  { city: "香港", timeZone: "Asia/Hong_Kong", longitude: 114.1694, latitude: 22.3193 },
  { city: "台北", timeZone: "Asia/Taipei", longitude: 121.5654, latitude: 25.033 },
  { city: "东京", timeZone: "Asia/Tokyo", longitude: 139.6917, latitude: 35.6895 },
] as const;

export const findBirthCity = (cityName?: string) =>
  BIRTH_CITY_CATALOG.find((city) => city.city === cityName);
