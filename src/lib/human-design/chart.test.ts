import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildHumanDesignChart, HD_CHANNELS, HD_GATE_CENTERS } from "./chart";
import { serializeHumanDesignToStructuredText } from "./serializer";

const VALID_PROFILES = ["1/3", "1/4", "2/4", "2/5", "3/5", "3/6", "4/6", "4/1", "5/1", "5/2", "6/2", "6/3"];
const VALID_TYPES = ["生成者", "显示生产者", "投射者", "反映者", "显化者"];
const VALID_AUTHORITIES = ["情绪权威", "骶骨权威", "脾权威", "意志力权威", "自我投射权威", "环境权威", "月亮权威"];
const VALID_DEFINITIONS = ["无定义", "单一", "二分", "三分", "四分"];
const VALID_CROSS = ["右角度", "并列", "左角度"];

const chartFor = (iso: string, withLocation = true) => {
  const input: ProfileInput = getDefaultProfileInput(new Date(iso), "Asia/Shanghai");
  if (withLocation) input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  else delete input.location;
  return buildHumanDesignChart(normalizeProfileInput(input));
};

describe("human design chart", () => {
  it("derives a stable, well-formed chart", () => {
    const chart = chartFor("2026-01-01T00:00:00Z");
    expect(chart.centers).toHaveLength(9);
    expect(Object.keys(chart.activations)).toHaveLength(13);
    expect(VALID_TYPES).toContain(chart.type);
    expect(VALID_AUTHORITIES).toContain(chart.authority);
    expect(VALID_PROFILES).toContain(chart.profile);
    expect(VALID_DEFINITIONS).toContain(chart.definition);
    expect(VALID_CROSS).toContain(chart.incarnationCrossType);
    expect(chart.complete).toBe(true);
    expect(chart.precision?.gate).toBe("reliable");
    expect(chartFor("2026-01-01T00:00:00Z")).toEqual(chart);
  });

  it("uses the personality Sun line and design Sun line for the profile", () => {
    const chart = chartFor("2026-01-01T00:00:00Z");
    expect(chart.profile).toBe(`${chart.activations.sun.personality.line}/${chart.activations.sun.design.line}`);
    // Guard the old bug: the personality Earth always shares the Sun's line, so
    // pairing them produced impossible profiles like "5/5".
    expect(chart.activations.earth.personality.line).toBe(chart.activations.sun.personality.line);
    expect(chart.profile).not.toMatch(/^(\d)\/\1$/);
  });

  it("maps every gate to exactly one center and keeps 36 channels", () => {
    expect(HD_CHANNELS).toHaveLength(36);
    expect(Object.keys(HD_GATE_CENTERS)).toHaveLength(64);
    expect(new Set(Object.values(HD_GATE_CENTERS)).size).toBe(9);
    expect([...Object.keys(HD_GATE_CENTERS)].map(Number).sort((a, b) => a - b)).toEqual(Array.from({ length: 64 }, (_, index) => index + 1));
  });

  it("computes without birth coordinates and matches the located chart", () => {
    const located = chartFor("2000-11-11T23:45:00+08:00", true);
    const unlocated = chartFor("2000-11-11T23:45:00+08:00", false);
    expect(unlocated.complete).toBe(true);
    expect(Object.keys(unlocated.activations)).toHaveLength(13);
    expect(unlocated.input.latitude).toBeNull();
    expect(unlocated.type).toBe(located.type);
    expect(unlocated.profile).toBe(located.profile);
    expect(unlocated.definition).toBe(located.definition);
    expect(unlocated.channels.map((channel) => channel.gates)).toEqual(located.channels.map((channel) => channel.gates));
  });

  it("serializes the derived fields into the structured text", () => {
    const text = serializeHumanDesignToStructuredText(chartFor("1990-05-20T08:30:00+08:00"));
    expect(text).toContain("类型：");
    expect(text).toContain("Profile：");
    expect(text).toContain("定义：");
    expect(text).toContain("人生主题");
    expect(text).toContain("通道（");
  });
});
