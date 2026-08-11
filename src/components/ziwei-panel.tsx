"use client";

import { Iztrolabe } from "@/vendor/react-iztro";
import type { ProfileInput } from "@/lib/profile";

type ZiweiPanelProps = {
  value: ProfileInput;
};

const parseDateTime = (datetime: string) => {
  const match = datetime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    throw new Error(`无法解析日期时间: ${datetime}`);
  }

  const [, year, month, day, hour] = match;
  return {
    birthday: `${Number(year)}-${Number(month)}-${Number(day)}`,
    hour: Number(hour),
  };
};

const toTimeIndex = (hour: number) => {
  if (hour === 0) {
    return 0;
  }

  if (hour === 23) {
    return 12;
  }

  return Math.floor((hour + 1) / 2);
};

export function ZiweiPanel({ value }: ZiweiPanelProps) {
  const { birthday, hour } = parseDateTime(value.datetime);
  const lunar = value.lunar;
  const now = new Date();
  const lunarBirthday =
    value.calendarMode === "lunar" && lunar
      ? `${lunar.year}-${lunar.month}-${lunar.day}`
      : birthday;
  const birthTimeIndex = toTimeIndex(hour);
  const currentTimeIndex = toTimeIndex(now.getHours());

  return (
    <div className="ziwei-panel">
      <div className="ziwei-panel__meta">
        <div className="ziwei-meta-chip">
          <span>历法</span>
          <strong>{value.calendarMode === "lunar" ? "农历" : "公历"}</strong>
        </div>
        <div className="ziwei-meta-chip">
          <span>生日</span>
          <strong>{lunarBirthday}</strong>
        </div>
        <div className="ziwei-meta-chip">
          <span>时辰索引</span>
          <strong>{birthTimeIndex}</strong>
        </div>
        <div className="ziwei-meta-chip">
          <span>性别 / 闰月</span>
          <strong>
            {value.gender === "male" ? "男" : "女"} / {lunar?.isLeapMonth ? "是" : "否"}
          </strong>
        </div>
      </div>

      <div className="ziwei-panel__canvas">
        <Iztrolabe
          birthday={lunarBirthday}
          birthdayType={value.calendarMode}
          birthTime={birthTimeIndex}
          centerPalaceAlign
          fixLeap
          gender={value.gender}
          horoscopeDate={now}
          horoscopeHour={currentTimeIndex}
          isLeapMonth={lunar?.isLeapMonth}
          lang="zh-CN"
          width="100%"
        />
      </div>
    </div>
  );
}
