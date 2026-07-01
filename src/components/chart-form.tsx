"use client";

import { useState } from "react";
import { CalendarClock, Clipboard, FileJson2, Sparkles } from "lucide-react";
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
  onSubmit: (value: UserChartInput) => void;
  onCopyText: () => Promise<void>;
  onCopyJson: () => Promise<void>;
  copyState: "idle" | "text" | "json";
  layout?: "top" | "sidebar";
};

export function ChartForm({
  defaultValue,
  onSubmit,
  onCopyText,
  onCopyJson,
  copyState,
  layout = "top",
}: ChartFormProps) {
  const [value, setValue] = useState<UserChartInput>(defaultValue);

  return (
    <form
      className={`command-bar${layout === "sidebar" ? " command-bar--sidebar" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
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
            onValueChange={(timeZone) =>
              setValue((current) => ({ ...current, timeZone }))
            }
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
    </form>
  );
}
