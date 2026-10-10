import { describe, expect, it } from "vitest";
import { BAZI_CLASSIC_EXCERPTS, selectBaziClassicsContext } from "./bazi-classics";

describe("bazi classics payload", () => {
  it("never claims verbatim quotations and keeps editor's notes out of the excerpt text", () => {
    for (const excerpt of BAZI_CLASSIC_EXCERPTS) {
      expect(excerpt.text.trim().length).toBeGreaterThan(0);
      expect(excerpt.sourceBook).toMatch(/^《.+》$/);
      expect(excerpt.section.length).toBeGreaterThan(0);
      // 编者按不得混入摘录正文
      expect(excerpt.text).not.toContain("编者按");
      if (excerpt.editorial) {
        expect(excerpt.editorial.length).toBeGreaterThan(0);
        expect(excerpt.text).not.toContain(excerpt.editorial);
      }
    }
  });

  it("labels excerpts as un-proofread and forbids verbatim citation", () => {
    const context = selectBaziClassicsContext({ question: "请分析流年太岁", structuredText: "", jsonPayload: "", limit: 6 });
    expect(context).toContain("未逐字校对");
    expect(context).toContain("只能表述为「据《书名·篇目》大意」");
    expect(context).toContain("禁止把摘录当作逐字原文引用");
    // 旧的「原始语料/原文摘录」口径不得再出现
    expect(context).not.toContain("原始语料");
    expect(context).not.toContain("原文摘录");
  });

  it("marks editor's notes as non-classical whenever they are shipped", () => {
    const context = selectBaziClassicsContext({ question: "请分析流年太岁与岁运", structuredText: "", jsonPayload: "", limit: 6 });
    if (context.includes("编者按")) {
      expect(context).toContain("编者按（本仓现代说明，非原文，禁止作为古籍引用）：");
    }
  });

  it("keeps the ranking behaviour: the explicit angle wins", () => {
    const dayun = selectBaziClassicsContext({ question: "只看大运", structuredText: "", jsonPayload: "", limit: 1 });
    expect(dayun).toContain("论大运");
  });
});
