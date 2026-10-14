// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildBaziChartFromProfile } from "@/lib/bazi/chart";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildTcmYunqiView } from "@/lib/tcm/chart";
import { TcmYunqiPanel } from "./tcm-yunqi-panel";

// 用真实八字引擎 + 真实运气内核跑出视图（不 mock），钉住"运气条款 → 脏腑/经络对照 → 边界声明"这条链。
const buildView = (year: number) => {
  const input: ProfileInput = getDefaultProfileInput(new Date("1990-05-20T08:30:00+08:00"), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return buildTcmYunqiView(buildBaziChartFromProfile(normalizeProfileInput(input)), year);
};

describe("TcmYunqiPanel", () => {
  afterEach(() => cleanup());

  it("renders the summary cards, the six ke-zhu steps, the four pillars and the two element tables", () => {
    const view = buildView(2026);
    const { container } = render(<TcmYunqiPanel value={view} yearInput="2026" />);

    expect(screen.getByRole("heading", { name: "中医运气" })).toBeInTheDocument();
    expect(screen.getByLabelText("流年（干支年）")).toHaveValue("2026");
    // 三张摘要卡：中运 / 司天 / 在泉
    expect(container.querySelectorAll(".hd-summary > div")).toHaveLength(3);
    // 六步客主加临六行
    expect(container.querySelectorAll(".tcm-steps .hd-cell")).toHaveLength(6);
    // 五行并置五格
    expect(container.querySelectorAll(".tcm-contrast .hd-cell")).toHaveLength(5);
    // 五行配属五格
    expect(container.querySelectorAll(".tcm-attributes .hd-cell")).toHaveLength(5);
  });

  it("gives every pillar an organ and a meridian from the sourced songs", () => {
    const view = buildView(2026);
    const { container } = render(<TcmYunqiPanel value={view} yearInput="2026" />);

    const cells = [...container.querySelectorAll(".tcm-pillars .hd-cell")];
    expect(cells).toHaveLength(4);
    view.pillars.forEach((pillar, index) => {
      const text = cells[index].textContent ?? "";
      expect(text).toContain(pillar.pillar);
      // 《针灸聚英·十二经纳天干歌》的脏腑与《针灸大全·十二经纳地支歌》的经络都要出现
      expect(text).toContain(pillar.ganOrgan ?? "");
      expect(text).toContain(pillar.zhiMeridian ?? "");
      expect(text.match(/→/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    });
  });

  it("spells out the boundaries and never slips into diagnosis or prescription wording", () => {
    const view = buildView(2026);
    const { container } = render(<TcmYunqiPanel value={view} yearInput="2026" />);

    const boundaries = [...container.querySelectorAll(".tcm-boundaries li")].map((node) => node.textContent ?? "");
    expect(boundaries.length).toBeGreaterThanOrEqual(5);
    const joined = boundaries.join(" ");
    expect(joined).toContain("不做诊断");
    expect(joined).toContain("不给方药");
    expect(joined).toContain("不预测疾病");
    expect(joined).toContain("大寒");

    // 整块面板不得出现诊断/处方式措辞
    const text = container.textContent ?? "";
    for (const forbidden of ["建议服用", "处方", "汤剂", "服用剂量", "确诊", "证型", "治则", "宜服"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});
