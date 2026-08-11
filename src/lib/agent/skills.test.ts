import { describe, expect, it } from "vitest";
import { formatAgentSkillsPrompt, selectAgentSkills } from "./skills";

describe("research agent skills", () => {
  it("selects the focused research skill", () => {
    const skills = selectAgentSkills({ mode: "research", tool: "daliuren" });
    expect(skills.some((skill) => skill.id === "daliuren-classes")).toBe(true);
    expect(formatAgentSkillsPrompt(skills)).toContain("当前启用的 Agent 技能");
  });
});
