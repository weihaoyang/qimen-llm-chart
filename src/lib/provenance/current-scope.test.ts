import { describe, expect, it } from "vitest";
import { PROVENANCE } from "./registry";
import { buildTaiyiChart } from "../taiyi/chart";
import { buildQizhengChart } from "../qizheng/chart";
import { getDefaultProfileInput, normalizeProfileInput } from "../profile";

describe("provenance scope agrees with active calculations", () => {
  it("does not describe implemented Taiyi general flanking as absent", () => {
    const chart = buildTaiyiChart({ year: 724, cycle: 360, dun: "阳遁", ruJu: 2 });
    expect(chart.patterns.some((item) => item.startsWith("大小将挟："))).toBe(true);
    const note = PROVENANCE.find((item) => item.id === "shared-heuristics")?.details?.join(" ");
    expect(note).toContain("大小将挟只覆盖");
    expect(note).not.toContain("自挟」未实现");
  });

  it("identifies the approximations of the calculated historical Ziqi model", () => {
    const chart = buildQizhengChart(normalizeProfileInput(getDefaultProfileInput(new Date("2026-01-01T04:00:00Z"), "Asia/Shanghai")));
    expect(chart.stars.some((item) => item.name === "紫气")).toBe(true);
    const note = PROVENANCE.find((item) => item.id === "qizheng-four-remainders")?.note;
    expect(note).toContain("乾隆甲子法元");
    expect(note).toContain("其他年代为外推");
  });
});
