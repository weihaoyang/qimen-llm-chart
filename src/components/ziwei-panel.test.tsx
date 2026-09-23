/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProfileInput } from "@/lib/profile";

const state = vi.hoisted(() => ({ props: [] as Array<Record<string, unknown>> }));

// The vendor iztro component is irrelevant to the panel's own contract, and it
// pulls in a full chart renderer. Capture its props instead.
vi.mock("@/vendor/react-iztro", () => ({
  Iztrolabe: (props: Record<string, unknown>) => {
    state.props.push(props);
    return <div data-testid="iztrolabe" />;
  },
}));

import { ZiweiPanel } from "./ziwei-panel";

const baseValue: ProfileInput = {
  calendarMode: "solar",
  datetime: "1990-05-20T14:30",
  timeZone: "Asia/Shanghai",
  gender: "male",
  timeBasis: "civil",
};

describe("ZiweiPanel", () => {
  it("renders a fallback instead of throwing when the datetime is malformed", () => {
    // This panel shares a page with the qimen and bazi panels, so an uncaught
    // throw during render blanked the entire workspace.
    expect(() => render(<ZiweiPanel value={{ ...baseValue, datetime: "not-a-datetime" }} />)).not.toThrow();
    expect(screen.getByRole("alert").textContent).toContain("日期时间格式无效");
  });

  it("keeps the first render free of wall-clock inputs, then fills them in", () => {
    state.props.length = 0;
    render(<ZiweiPanel value={baseValue} />);

    // `render` flushes effects, so index 0 is the pre-mount render — the one
    // that has to match the server output. `new Date()` differs between the two
    // sides, so the horoscope inputs must be absent here.
    const first = state.props[0];
    expect(first?.horoscopeDate).toBeUndefined();
    expect(first?.horoscopeHour).toBeUndefined();
    expect(first?.birthday).toBe("1990-5-20");
    expect(first?.birthTime).toBe(7);

    // The horoscope must still arrive after mount rather than being dropped.
    const last = state.props.at(-1);
    expect(last?.horoscopeDate).toBeInstanceOf(Date);
    expect(typeof last?.horoscopeHour).toBe("number");
  });

  it("forwards the product's day-boundary convention to iztro", () => {
    // iztro defaults to 晚子时算次日; the product defaults to 子正换日. Passing the
    // convention through is what keeps this panel's 紫微 positions consistent with
    // the 八字 panel and with the server-side ziwei chart.
    const divideFor = (dayBoundary?: "midnight" | "zi-start") => {
      state.props.length = 0;
      render(
        <ZiweiPanel
          value={dayBoundary ? { ...baseValue, baziSettings: { yearBoundary: "li-chun", dayBoundary } } : baseValue}
        />,
      );
      return (state.props.at(-1)?.options as { dayDivide?: string } | undefined)?.dayDivide;
    };

    expect(divideFor()).toBe("current");
    expect(divideFor("midnight")).toBe("current");
    expect(divideFor("zi-start")).toBe("forward");
  });
});
