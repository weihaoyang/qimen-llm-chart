"use client";

import { useState } from "react";
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
import type { UserChartInput } from "@/lib/qimen/types";
import type { ChartSequenceInput, SequenceStep } from "@/lib/qimen/sequence";

const TIME_ZONES = [
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
];

type ChartFormProps = {
  defaultValue: UserChartInput;
  defaultSequenceValue: ChartSequenceInput;
  onSubmit: (value: UserChartInput) => void;
  onSequenceSubmit: (value: ChartSequenceInput) => void;
  onCopyText: () => Promise<void>;
  onCopyJson: () => Promise<void>;
  copyState: "idle" | "text" | "json";
  layout?: "top" | "sidebar";
};

export function ChartForm({
  defaultValue,
  defaultSequenceValue,
  onSubmit,
  onSequenceSubmit,
  onCopyText,
  onCopyJson,
  copyState,
  layout = "top",
}: ChartFormProps) {
  const [value, setValue] = useState<UserChartInput>(defaultValue);
  const [sequenceValue, setSequenceValue] =
    useState<ChartSequenceInput>(defaultSequenceValue);

  const updateSequence = (nextValue: Partial<ChartSequenceInput>) => {
    setSequenceValue((current) => ({ ...current, ...nextValue }));
  };

  return (
    <form
      className={`command-bar${layout === "sidebar" ? " command-bar--sidebar" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      {layout === "sidebar" ? (
        <div className="command-bar__title">
          <p className="workspace-kicker">Qimen Research Workbench</p>
          <h1>奇门遁甲盘面工作台</h1>
        </div>
      ) : null}

      <div className="command-bar__group command-bar__group--inputs">
        <label className="control-field control-field-wide">
          <span>日期时间</span>
          <div className="control-field__input-wrap">
            <CalendarClock />
            <Input
              className="control-input"
              type="datetime-local"
              value={value.datetime}
              onChange={(event) =>
                setValue((current) => ({ ...current, datetime: event.target.value }))
              }
            />
          </div>
        </label>

        <label className="control-field">
          <span>时区</span>
          <Select
            value={value.timeZone}
            onValueChange={(timeZone) => {
              setValue((current) => ({ ...current, timeZone }));
              updateSequence({ timeZone });
            }}
          >
            <SelectTrigger className="control-select">
              <SelectValue placeholder="选择时区" />
            </SelectTrigger>
            <SelectContent className="control-select-content">
              {TIME_ZONES.map((timeZone) => (
                <SelectItem key={timeZone} value={timeZone}>
                  {timeZone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="command-bar__group command-bar__actions">
        <Button className="command-button command-button-primary" type="submit">
          <Sparkles data-icon="inline-start" />
          生成盘面
        </Button>
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
      </div>

      <div className="sequence-controls">
        <label className="control-field control-field-wide">
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

        <label className="control-field control-field-wide">
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
    </form>
  );
}
