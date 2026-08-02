"use client";

import { CalendarClock, Clipboard, FileJson2, Sparkles, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProfileInput } from "@/lib/profile";
import { getSelectableTimeZones } from "@/lib/qimen/defaults";
import {
  QIMEN_SOLAR_TERMS,
  SUPPORTED_QIMEN_JU_METHODS,
  SUPPORTED_QIMEN_METHODS,
  UNSUPPORTED_QIMEN_METHODS,
  type QimenJuNumber,
  type QimenSettings,
} from "@/lib/qimen/settings";
import type { ChartSequenceInput, SequenceStep } from "@/lib/qimen/sequence";
import type { WorkbenchMode } from "@/lib/workbench/types";

const TIME_ZONES = [
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
];

const parseDateTime = (datetime: string) => {
  const match = datetime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    return {
      year: 2026,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
    };
  }

  const [, year, month, day, hour, minute] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
};

type ChartFormProps = {
  value: ProfileInput;
  qimenSettings: QimenSettings;
  sequenceValue: ChartSequenceInput;
  onValueChange: (value: ProfileInput) => void;
  onQimenSettingsChange: (value: QimenSettings) => void;
  onSequenceValueChange: (value: ChartSequenceInput) => void;
  onSubmit: (value: ProfileInput) => void;
  onSequenceSubmit: (value: ChartSequenceInput) => void;
  onCopyText: () => Promise<void>;
  onCopyJson: () => Promise<void>;
  copyState: "idle" | "text" | "json";
  layout?: "top" | "sidebar";
  mode?: WorkbenchMode;
  showCopyActions?: boolean;
  showSequenceControls?: boolean;
};

export function ChartForm({
  value,
  qimenSettings,
  sequenceValue,
  onValueChange,
  onQimenSettingsChange,
  onSequenceValueChange,
  onSubmit,
  onSequenceSubmit,
  onCopyText,
  onCopyJson,
  copyState,
  layout = "top",
  mode = "qimen",
  showCopyActions = true,
  showSequenceControls = true,
}: ChartFormProps) {
  const updateQimenSettings = (nextValue: Partial<QimenSettings>) => {
    onQimenSettingsChange({ ...qimenSettings, ...nextValue });
  };
  const updateSequence = (nextValue: Partial<ChartSequenceInput>) => {
    onSequenceValueChange({ ...sequenceValue, ...nextValue });
  };
  const updateLocation = (longitude?: number) => {
    onValueChange({
      ...value,
      location:
        longitude === undefined
          ? undefined
          : {
              ...value.location,
              longitude,
            },
    });
  };
  const fallbackLunar = value.lunar ?? {
    ...parseDateTime(value.datetime),
    isLeapMonth: false,
  };
  const timeZoneOptions = getSelectableTimeZones(value.timeZone, TIME_ZONES);
  const isSidebar = layout === "sidebar";

  return (
    <form
      className={`command-bar${isSidebar ? " command-bar--sidebar" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      {isSidebar ? (
        <div className="command-bar__title">
          <span className="command-bar__eyebrow">Input</span>
          <h2>参数控制台</h2>
        </div>
      ) : null}

      <div className="command-bar__section command-bar__section--fields">
        <div className="command-bar__group command-bar__group--inputs">
          <label className="control-field control-field-wide">
            <span>历法</span>
            <Select
              value={value.calendarMode}
              onValueChange={(calendarMode) =>
                onValueChange({
                  ...value,
                  calendarMode: calendarMode as ProfileInput["calendarMode"],
                })
              }
            >
              <SelectTrigger className="control-select">
                <SelectValue placeholder="选择历法" />
              </SelectTrigger>
              <SelectContent className="control-select-content">
                <SelectItem value="solar">公历</SelectItem>
                <SelectItem value="lunar">农历</SelectItem>
              </SelectContent>
            </Select>
          </label>

          {value.calendarMode === "solar" ? (
            <label className="control-field control-field-wide">
              <span>日期时间</span>
              <div className="control-field__input-wrap">
                <CalendarClock />
                <Input
                  className="control-input"
                  type="datetime-local"
                  value={value.datetime}
                  onChange={(event) =>
                    onValueChange({ ...value, datetime: event.target.value })
                  }
                />
              </div>
            </label>
          ) : (
            <div className="lunar-input-grid">
              <label className="control-field">
                <span>农历年</span>
                <Input
                  className="control-input"
                  type="number"
                  value={String(fallbackLunar.year)}
                  onChange={(event) =>
                    onValueChange({
                      ...value,
                      lunar: {
                        ...fallbackLunar,
                        year: Number(event.target.value),
                      },
                    })
                  }
                />
              </label>

              <label className="control-field">
                <span>农历月</span>
                <Input
                  className="control-input"
                  type="number"
                  value={String(fallbackLunar.month)}
                  onChange={(event) =>
                    onValueChange({
                      ...value,
                      lunar: {
                        ...fallbackLunar,
                        month: Number(event.target.value),
                      },
                    })
                  }
                />
              </label>

              <label className="control-field">
                <span>农历日</span>
                <Input
                  className="control-input"
                  type="number"
                  value={String(fallbackLunar.day)}
                  onChange={(event) =>
                    onValueChange({
                      ...value,
                      lunar: {
                        ...fallbackLunar,
                        day: Number(event.target.value),
                      },
                    })
                  }
                />
              </label>

              <label className="control-field">
                <span>农历时</span>
                <Input
                  className="control-input"
                  type="number"
                  value={String(fallbackLunar.hour ?? 0)}
                  onChange={(event) =>
                    onValueChange({
                      ...value,
                      lunar: {
                        ...fallbackLunar,
                        hour: Number(event.target.value),
                      },
                    })
                  }
                />
              </label>

              <label className="control-field">
                <span>农历分</span>
                <Input
                  className="control-input"
                  type="number"
                  value={String(fallbackLunar.minute ?? 0)}
                  onChange={(event) =>
                    onValueChange({
                      ...value,
                      lunar: {
                        ...fallbackLunar,
                        minute: Number(event.target.value),
                      },
                    })
                  }
                />
              </label>

              <label className="checkbox-field">
                <input
                  checked={Boolean(fallbackLunar.isLeapMonth)}
                  type="checkbox"
                  onChange={(event) =>
                    onValueChange({
                      ...value,
                      lunar: {
                        ...fallbackLunar,
                        isLeapMonth: event.target.checked,
                      },
                    })
                  }
                />
                <span>闰月</span>
              </label>
            </div>
          )}

          <label className="control-field">
            <span>性别</span>
            <Select
              value={value.gender}
              onValueChange={(gender) =>
                onValueChange({ ...value, gender: gender as ProfileInput["gender"] })
              }
            >
              <SelectTrigger className="control-select">
                <SelectValue placeholder="选择性别" />
              </SelectTrigger>
              <SelectContent className="control-select-content">
                <SelectItem value="male">男</SelectItem>
                <SelectItem value="female">女</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="control-field">
            <span>时区</span>
            <Select
              value={value.timeZone}
              onValueChange={(timeZone) => {
                onValueChange({ ...value, timeZone });
                updateSequence({ timeZone });
              }}
            >
              <SelectTrigger className="control-select">
                <SelectValue placeholder="选择时区" />
              </SelectTrigger>
              <SelectContent className="control-select-content">
                {timeZoneOptions.map((timeZone) => (
                  <SelectItem key={timeZone} value={timeZone}>
                    {timeZone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="control-field">
            <span>时间基准</span>
            <Select
              value={value.timeBasis}
              onValueChange={(timeBasis) =>
                onValueChange({
                  ...value,
                  timeBasis: timeBasis as ProfileInput["timeBasis"],
                })
              }
            >
              <SelectTrigger className="control-select">
                <SelectValue placeholder="选择时间基准" />
              </SelectTrigger>
              <SelectContent className="control-select-content">
                <SelectItem value="civil">标准时</SelectItem>
                <SelectItem value="true-solar">真太阳时</SelectItem>
              </SelectContent>
            </Select>
          </label>

          {value.timeBasis === "true-solar" ? (
            <div className="control-field control-field--true-solar">
              <label htmlFor="true-solar-longitude">经度</label>
              <Input
                id="true-solar-longitude"
                className="control-input"
                type="number"
                inputMode="decimal"
                min="-180"
                max="180"
                step="0.01"
                placeholder="例如 116.40"
                value={value.location?.longitude?.toString() ?? ""}
                onChange={(event) => {
                  const nextValue = event.target.value.trim();
                  updateLocation(nextValue === "" ? undefined : Number(nextValue));
                }}
              />
              <small>按出生地经度修正，东经为正、西经为负</small>
            </div>
          ) : null}

          {mode === "qimen" ? (
            <>
              <label className="control-field">
                <span>用局法</span>
                <Select
                  value={qimenSettings.method}
                  onValueChange={(method) =>
                    updateQimenSettings({
                      method: method as QimenSettings["method"],
                    })
                  }
                >
                  <SelectTrigger className="control-select">
                    <SelectValue placeholder="选择用局法" />
                  </SelectTrigger>
                  <SelectContent className="control-select-content">
                    <SelectItem value="default">{SUPPORTED_QIMEN_JU_METHODS[0]}</SelectItem>
                    <SelectItem value="split">{SUPPORTED_QIMEN_JU_METHODS[1]}</SelectItem>
                    <SelectItem value="maoshan">{SUPPORTED_QIMEN_JU_METHODS[2]}</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="control-field">
                <span>节气</span>
                <Select
                  value={qimenSettings.solarTerm}
                  onValueChange={(solarTerm) =>
                    updateQimenSettings({
                      solarTerm: solarTerm as QimenSettings["solarTerm"],
                    })
                  }
                >
                  <SelectTrigger className="control-select">
                    <SelectValue placeholder="自动节气" />
                  </SelectTrigger>
                  <SelectContent className="control-select-content">
                    <SelectItem value="auto">自动节气</SelectItem>
                    {QIMEN_SOLAR_TERMS.map((solarTerm) => (
                      <SelectItem key={solarTerm} value={solarTerm}>
                        {solarTerm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="control-field">
                <span>阴阳遁</span>
                <Select
                  value={qimenSettings.dunType}
                  onValueChange={(dunType) =>
                    updateQimenSettings({
                      dunType: dunType as QimenSettings["dunType"],
                    })
                  }
                >
                  <SelectTrigger className="control-select">
                    <SelectValue placeholder="自动判定" />
                  </SelectTrigger>
                  <SelectContent className="control-select-content">
                    <SelectItem value="auto">自动判定</SelectItem>
                    <SelectItem value="yang">阳遁</SelectItem>
                    <SelectItem value="yin">阴遁</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="control-field">
                <span>局数</span>
                <Select
                  value={String(qimenSettings.juNumber)}
                  onValueChange={(juNumber) =>
                    updateQimenSettings({
                      juNumber:
                        juNumber === "auto"
                          ? "auto"
                          : (Number(juNumber) as Exclude<QimenJuNumber, "auto">),
                    })
                  }
                >
                  <SelectTrigger className="control-select">
                    <SelectValue placeholder="自动定局" />
                  </SelectTrigger>
                  <SelectContent className="control-select-content">
                    <SelectItem value="auto">自动定局</SelectItem>
                    {Array.from({ length: 9 }, (_, index) => {
                      const value = String(index + 1);
                      return (
                        <SelectItem key={value} value={value}>
                          {value}局
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </label>

              <label className="control-field">
                <span>年界</span>
                <Select
                  value={qimenSettings.yearDivide}
                  onValueChange={(yearDivide) =>
                    updateQimenSettings({
                      yearDivide: yearDivide as QimenSettings["yearDivide"],
                    })
                  }
                >
                  <SelectTrigger className="control-select">
                    <SelectValue placeholder="立春精确" />
                  </SelectTrigger>
                  <SelectContent className="control-select-content">
                    <SelectItem value="exact">立春精确</SelectItem>
                    <SelectItem value="normal">普通年界</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </>
          ) : null}
        </div>
      </div>

      {mode === "qimen" ? (
        <div className="command-bar__section command-bar__section--methods">
          <div className="qimen-method-panel">
            <div className="qimen-method-panel__group">
              <span>已接入</span>
              <div className="qimen-method-panel__chips">
                {SUPPORTED_QIMEN_JU_METHODS.map((item) => (
                  <strong className="qimen-method-chip" key={item}>
                    {item}
                  </strong>
                ))}
                {SUPPORTED_QIMEN_METHODS.map((item) => (
                  <strong className="qimen-method-chip" key={item}>
                    {item}
                  </strong>
                ))}
              </div>
            </div>

            <div className="qimen-method-panel__group">
              <span>未接入</span>
              <div className="qimen-method-panel__chips">
                {UNSUPPORTED_QIMEN_METHODS.map((item) => (
                  <strong className="qimen-method-chip qimen-method-chip--muted" key={item}>
                    {item}
                  </strong>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="command-bar__section command-bar__section--actions">
        <div className="command-bar__group command-bar__actions">
          <Button className="command-button command-button-primary" type="submit">
            <Sparkles data-icon="inline-start" />
            生成盘面
          </Button>
          {showCopyActions ? (
            <>
              <Button
                className="command-button"
                variant="outline"
                type="button"
                onClick={() => {
                  void onCopyText();
                }}
              >
                <Clipboard data-icon="inline-start" />
                {copyState === "text" ? "已复制文本" : "复制结构化文本"}
              </Button>
              <Button
                className="command-button"
                variant="outline"
                type="button"
                onClick={() => {
                  void onCopyJson();
                }}
              >
                <FileJson2 data-icon="inline-start" />
                {copyState === "json" ? "已复制 JSON" : "复制 JSON"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {mode === "qimen" && showSequenceControls ? (
        <div className="command-bar__section command-bar__section--sequence">
          <div className="sequence-controls">
            <label className="control-field">
              <span>序列开始</span>
              <div className="control-field__input-wrap">
                <CalendarClock />
                <Input
                  className="control-input"
                  type="datetime-local"
                  value={sequenceValue.startDatetime}
                  onChange={(event) => updateSequence({ startDatetime: event.target.value })}
                />
              </div>
            </label>

            <label className="control-field">
              <span>序列结束</span>
              <div className="control-field__input-wrap">
                <CalendarClock />
                <Input
                  className="control-input"
                  type="datetime-local"
                  value={sequenceValue.endDatetime}
                  onChange={(event) => updateSequence({ endDatetime: event.target.value })}
                />
              </div>
            </label>

            <label className="control-field">
              <span>时间间隔</span>
              <Select
                value={sequenceValue.step}
                onValueChange={(step) => updateSequence({ step: step as SequenceStep })}
              >
                <SelectTrigger className="control-select">
                  <SelectValue placeholder="选择间隔" />
                </SelectTrigger>
                <SelectContent className="control-select-content">
                  <SelectItem value="double-hour">时辰 / 2小时</SelectItem>
                  <SelectItem value="day">天 / 1天</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <Button
              className="command-button"
              variant="outline"
              type="button"
              onClick={() => onSequenceSubmit(sequenceValue)}
            >
              <TimerReset data-icon="inline-start" />
              生成序列
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
