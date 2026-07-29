// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProfileInput } from "@/lib/profile";
import type { ChartSequenceInput } from "@/lib/qimen/sequence";
import type { QimenSettings } from "@/lib/qimen/settings";
import { ChartForm } from "./chart-form";

const createProps = (
  overrides?: Partial<{
    value: ProfileInput;
    qimenSettings: QimenSettings;
    sequenceValue: ChartSequenceInput;
  }>,
) => ({
  value: overrides?.value ?? {
    calendarMode: "solar",
    datetime: "2026-07-01T21:30",
    timeZone: "Asia/Shanghai",
    gender: "male",
    timeBasis: "civil",
  },
  qimenSettings: overrides?.qimenSettings ?? {
    method: "default",
    solarTerm: "auto",
    dunType: "auto",
    juNumber: "auto",
    yearDivide: "exact",
  },
  sequenceValue: overrides?.sequenceValue ?? {
    startDatetime: "2026-07-01T21:30",
    endDatetime: "2026-07-02T21:30",
    timeZone: "Asia/Shanghai",
    step: "double-hour",
  },
  onValueChange: vi.fn(),
  onQimenSettingsChange: vi.fn(),
  onSequenceValueChange: vi.fn(),
  onSubmit: vi.fn(),
  onSequenceSubmit: vi.fn(),
  onCopyText: vi.fn().mockResolvedValue(undefined),
  onCopyJson: vi.fn().mockResolvedValue(undefined),
  copyState: "idle" as const,
  layout: "sidebar" as const,
});

describe("ChartForm", () => {
  it("shows the unified workbench title in sidebar mode", () => {
    render(<ChartForm {...createProps()} />);

    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "参数控制台" })).toBeInTheDocument();
    expect(screen.getAllByText("节气").length).toBeGreaterThan(0);
    expect(screen.getAllByText("阴阳遁").length).toBeGreaterThan(0);
    expect(screen.getAllByText("局数").length).toBeGreaterThan(0);
    expect(screen.getAllByText("年界").length).toBeGreaterThan(0);
    expect(screen.getByText("用局法")).toBeInTheDocument();
    expect(screen.getByText("已接入")).toBeInTheDocument();
    expect(screen.getByText("未接入")).toBeInTheDocument();
    expect(screen.getAllByText("拆补").length).toBeGreaterThan(0);
    expect(screen.getAllByText("茅山").length).toBeGreaterThan(0);
    expect(screen.getByText("置闰")).toBeInTheDocument();
    expect(screen.getByText("飞盘")).toBeInTheDocument();
  });

  it("submits the edited datetime value", () => {
    const props = createProps();
    function ControlledHarness() {
      const [value, setValue] = useState(props.value);
      const [sequenceValue, setSequenceValue] = useState(props.sequenceValue);

      return (
        <ChartForm
          {...props}
          value={value}
          sequenceValue={sequenceValue}
          onValueChange={setValue}
          onSequenceValueChange={setSequenceValue}
        />
      );
    }

    const { container } = render(<ControlledHarness />);
    const form = container.querySelector("form");

    if (!form) {
      throw new Error("form not found");
    }

    fireEvent.change(within(form).getAllByLabelText("日期时间")[0], {
      target: { value: "2026-07-03T08:15" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "生成盘面" }));

    expect(props.onSubmit).toHaveBeenCalledWith({
      calendarMode: "solar",
      datetime: "2026-07-03T08:15",
      timeZone: "Asia/Shanghai",
      gender: "male",
      timeBasis: "civil",
    });
  });

  it("syncs its displayed values when the parent updates the defaults", async () => {
    const initialProps = createProps();
    const nextValue = {
      calendarMode: "solar" as const,
      datetime: "2026-07-03T08:15",
      timeZone: "Asia/Seoul",
      gender: "male" as const,
      timeBasis: "civil" as const,
    };
    const nextSequenceValue = {
      startDatetime: "2026-07-03T08:15",
      endDatetime: "2026-07-04T08:15",
      timeZone: "Asia/Seoul",
      step: "day" as const,
    };

    const { container, rerender } = render(<ChartForm {...initialProps} />);

    rerender(
      <ChartForm
        {...initialProps}
        value={nextValue}
        sequenceValue={nextSequenceValue}
      />,
    );

    const inputs = container.querySelectorAll('input[type="datetime-local"]');

    await waitFor(() => {
      expect(inputs[0]).toHaveValue("2026-07-03T08:15");
      expect(inputs[1]).toHaveValue("2026-07-03T08:15");
    });
  });

  it("submits lunar fields when the form is in lunar mode", () => {
    const props = createProps({
      value: {
        calendarMode: "lunar",
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        gender: "female",
        timeBasis: "civil",
        lunar: {
          year: 2026,
          month: 5,
          day: 19,
          isLeapMonth: false,
          hour: 11,
          minute: 30,
        },
      },
    });

    function ControlledHarness() {
      const [value, setValue] = useState(props.value);
      const [sequenceValue, setSequenceValue] = useState(props.sequenceValue);

      return (
        <ChartForm
          {...props}
          value={value}
          sequenceValue={sequenceValue}
          onValueChange={setValue}
          onSequenceValueChange={setSequenceValue}
        />
      );
    }

    const { container } = render(<ControlledHarness />);
    const form = container.querySelector("form");

    if (!form) {
      throw new Error("form not found");
    }

    const scoped = within(form);

    fireEvent.change(scoped.getByLabelText("农历月"), {
      target: { value: "6" },
    });
    fireEvent.click(scoped.getByRole("checkbox", { name: "闰月" }));
    fireEvent.click(scoped.getByRole("button", { name: "生成盘面" }));

    expect(props.onSubmit).toHaveBeenCalledWith({
      calendarMode: "lunar",
      datetime: "2026-07-03T11:30",
      timeZone: "Asia/Shanghai",
      gender: "female",
      timeBasis: "civil",
      lunar: {
        year: 2026,
        month: 6,
        day: 19,
        isLeapMonth: true,
        hour: 11,
        minute: 30,
      },
    });
  });

  it("submits true-solar settings with longitude", () => {
    const props = createProps({
      value: {
        calendarMode: "solar",
        datetime: "2026-07-03T11:30",
        timeZone: "Asia/Shanghai",
        gender: "male",
        timeBasis: "true-solar",
        location: {
          longitude: 116.4,
        },
      },
    });

    function ControlledHarness() {
      const [value, setValue] = useState(props.value);
      const [sequenceValue, setSequenceValue] = useState(props.sequenceValue);

      return (
        <ChartForm
          {...props}
          value={value}
          sequenceValue={sequenceValue}
          onValueChange={setValue}
          onSequenceValueChange={setSequenceValue}
        />
      );
    }

    const { container } = render(<ControlledHarness />);
    const form = container.querySelector("form");

    if (!form) {
      throw new Error("form not found");
    }

    const scoped = within(form);

    fireEvent.change(scoped.getByLabelText("经度"), {
      target: { value: "121.47" },
    });
    fireEvent.click(scoped.getByRole("button", { name: "生成盘面" }));

    expect(props.onSubmit).toHaveBeenCalledWith({
      calendarMode: "solar",
      datetime: "2026-07-03T11:30",
      timeZone: "Asia/Shanghai",
      gender: "male",
      timeBasis: "true-solar",
      location: {
        longitude: 121.47,
      },
    });
  });
});
