import { describe, expect, it } from "vitest";
import { getDefaultProfileInput, normalizeProfileInput, type ProfileInput } from "@/lib/profile";
import { buildHumanDesignChart } from "./chart";
import { buildHumanDesignComposite, humanDesignGates } from "./composite";

const chartFor = (iso: string) => {
  const input: ProfileInput = getDefaultProfileInput(new Date(iso), "Asia/Shanghai");
  input.location = { city: "上海", timeZone: "Asia/Shanghai", latitude: 31.2304, longitude: 121.4737 };
  return buildHumanDesignChart(normalizeProfileInput(input));
};

describe("human design composite", () => {
  it("merges both designs and reports partner-introduced channels", () => {
    const self = chartFor("1990-05-20T08:30:00+08:00");
    const partner = chartFor("1992-02-02T09:00:00+08:00");
    const composite = buildHumanDesignComposite(self, partner);

    const union = new Set([...humanDesignGates(self), ...humanDesignGates(partner)]);
    expect(new Set(composite.gates)).toEqual(union);

    // Every composite channel is a real channel whose gates are in the union.
    for (const channel of composite.channels) {
      expect(union.has(channel.gates[0])).toBe(true);
      expect(union.has(channel.gates[1])).toBe(true);
    }
    // The composite can only add: it keeps the self design.
    expect(composite.channels.length).toBeGreaterThanOrEqual(self.channels.length);
    expect(composite.centers.length).toBeGreaterThanOrEqual(self.centers.filter((center) => center.defined).length);

    // newChannels/newCenters are exactly the addition over the self chart.
    const selfChannels = new Set(self.channels.map((channel) => channel.gates.join("-")));
    expect(composite.newChannels.every((channel) => !selfChannels.has(channel.gates.join("-")))).toBe(true);
    const selfCenters = new Set(self.centers.filter((center) => center.defined).map((center) => center.name));
    expect(composite.newCenters.every((name) => !selfCenters.has(name))).toBe(true);
    expect(composite.newCenters).toEqual(composite.centers.filter((name) => !selfCenters.has(name)));

    // Merging is order-independent for the gate set.
    const reversed = buildHumanDesignComposite(partner, self);
    expect(new Set(reversed.gates)).toEqual(union);
    expect(reversed.type).toBe(composite.type);
  });
});
