/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgentMarkdown } from "./agent-markdown";

describe("AgentMarkdown", () => {
  it("renders common AI markdown as readable elements", () => {
    render(<AgentMarkdown content={"## 结论\n\n**建议**：先观察。\n\n- 盘面依据\n- 现实行动\n\n> 需要承担的代价"} />);
    expect(screen.getByRole("heading", { name: "结论" })).toBeTruthy();
    expect(screen.getByText("建议")).toBeTruthy();
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getByText("需要承担的代价")).toBeTruthy();
  });

  it("only turns http(s) markdown links into links", () => {
    render(<AgentMarkdown content="[依据](https://example.com) [不发送](javascript:alert(1))" />);
    expect(screen.getByRole("link", { name: "依据" }).getAttribute("href")).toBe("https://example.com");
    expect(screen.getByText("[不发送](javascript:alert(1))")).toBeTruthy();
  });
});
