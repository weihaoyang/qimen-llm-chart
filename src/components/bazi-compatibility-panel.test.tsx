/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import { normalizeProfileInput } from "@/lib/profile/normalize";
import type { ProfileInput } from "@/lib/profile";
import { buildBaziCompatibility } from "@/lib/bazi/compatibility";
import { BaziCompatibilityPanel } from "./bazi-compatibility-panel";

const profile = (datetime: string, gender: ProfileInput["gender"]): ProfileInput => ({
  calendarMode: "solar",
  datetime,
  timeZone: "Asia/Shanghai",
  gender,
  timeBasis: "civil",
});

const left = buildBaziChartFromProfile(normalizeProfileInput(profile("1990-05-20T14:30", "male")));
const right = buildBaziChartFromProfile(normalizeProfileInput(profile("1992-11-08T09:15", "female")));

afterEach(cleanup);

describe("BaziCompatibilityPanel", () => {
  it("renders the relationship overview and keeps full charts behind explicit disclosure", () => {
    render(
      <BaziCompatibilityPanel
        value={buildBaziCompatibility(left, right)}
        chart={left}
        partnerChart={right}
        datetime="1992-11-08T09:15"
        gender="female"
        onDatetimeChange={vi.fn()}
        onGenderChange={vi.fn()}
        onPurchase={vi.fn()}
        loading={false}
        open
      />,
    );

    expect(screen.getByText("把两张盘，读成一段关系")).toBeTruthy();
    expect(screen.getByText("关系总览")).toBeTruthy();
    expect(screen.getByText("关系信号")).toBeTruthy();
    expect(screen.getByText("双方完整盘面")).toBeTruthy();
    expect(screen.getAllByText("展开盘面 +")).toHaveLength(2);
    expect(screen.getByDisplayValue("1992-11-08T09:15")).toBeTruthy();
  });

  it("shows a clear second-chart empty state before calculation", () => {
    render(
      <BaziCompatibilityPanel
        value={null}
        chart={left}
        partnerChart={null}
        datetime=""
        gender="female"
        onDatetimeChange={vi.fn()}
        onGenderChange={vi.fn()}
        onPurchase={vi.fn()}
        loading={false}
        open
      />,
    );

    expect(screen.getByText("等待第二张盘面")).toBeTruthy();
    expect(screen.getByText("填写出生日期与时间后，系统会生成免费规则版合盘。")).toBeTruthy();
  });
});
