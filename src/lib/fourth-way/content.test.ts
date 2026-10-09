import { describe, expect, it } from "vitest";
import { FOURTH_WAY_CONTENT } from "./content";
import { serializeFourthWayToCompactJson, serializeFourthWayToStructuredText } from "./serializer";

describe("fourth way content", () => {
  it("covers the core concepts with unique section ids", () => {
    expect(FOURTH_WAY_CONTENT.format).toBe("qmdj-fourth-way-v1");
    const ids = FOURTH_WAY_CONTENT.sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("law-of-three");
    expect(ids).toContain("law-of-seven");
    for (const section of FOURTH_WAY_CONTENT.sections) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.summary.length).toBeGreaterThan(0);
      expect(section.points.length).toBeGreaterThan(0);
    }
    expect(FOURTH_WAY_CONTENT.disclaimer).toContain("不是科学共识");
  });

  it("serializes to structured text and compact json", () => {
    const text = serializeFourthWayToStructuredText();
    expect(text).toContain("第四道");
    expect(text).toContain("三律");
    expect(text).toContain("七律");
    expect(text).toContain("九型图");
    expect(text).toContain("边界：");

    const parsed = JSON.parse(serializeFourthWayToCompactJson()) as { format: string; sections: unknown[] };
    expect(parsed.format).toBe("qmdj-fourth-way-v1");
    expect(parsed.sections).toHaveLength(FOURTH_WAY_CONTENT.sections.length);
  });
});
