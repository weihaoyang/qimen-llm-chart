// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PROVENANCE } from "@/lib/provenance/registry";
import { ProvenanceLibrary, } from "./provenance-library";
import { provenanceSearchText } from "./provenance-block";

const countText = (n: number) => `命中 ${n} / ${PROVENANCE.length} 条`;

describe("ProvenanceLibrary 资料库", () => {
  afterEach(() => cleanup());

  it("默认列出全部条目，并显示命中数", () => {
    render(<ProvenanceLibrary />);
    expect(screen.getByText(countText(PROVENANCE.length))).toBeInTheDocument();
    // 首屏应能看到条目（例如太乙的第一条）
    expect(screen.getAllByText(/太乙金鏡式經/).length).toBeGreaterThan(0);
  });

  it("全文检索按材料本体匹配（原文片段也能搜到）", () => {
    render(<ProvenanceLibrary />);
    const input = screen.getByLabelText("检索出处与原文");

    const needle = "太乙金鏡式經";
    fireEvent.change(input, { target: { value: needle } });
    const expected = PROVENANCE.filter((entry) => provenanceSearchText(entry).includes(needle.toLocaleLowerCase())).length;
    expect(expected).toBeGreaterThan(0);
    expect(expected).toBeLessThan(PROVENANCE.length);
    expect(screen.getByText(countText(expected))).toBeInTheDocument();

    // 只出现在资料本体（documents）里的片段同样可搜到
    const inBody = "前為外迫";
    fireEvent.change(input, { target: { value: inBody } });
    const expectedBody = PROVENANCE.filter((entry) => provenanceSearchText(entry).includes(inBody.toLocaleLowerCase())).length;
    expect(expectedBody).toBeGreaterThan(0);
    expect(screen.getByText(countText(expectedBody))).toBeInTheDocument();
  });

  it("命中为空时给出可操作的提示", () => {
    render(<ProvenanceLibrary />);
    fireEvent.change(screen.getByLabelText("检索出处与原文"), { target: { value: "zzz不存在的关键词zzz" } });
    expect(screen.getByText(countText(0))).toBeInTheDocument();
    expect(screen.getByText(/没有匹配的资料/)).toBeInTheDocument();
  });

  it("按体系筛选", () => {
    const { container } = render(<ProvenanceLibrary />);
    fireEvent.click(screen.getByRole("button", { name: "太乙神数" }));
    const expected = PROVENANCE.filter((entry) => entry.system === "taiyi-shenshu").length;
    expect(expected).toBeGreaterThan(0);
    expect(screen.getByText(countText(expected))).toBeInTheDocument();
    // 结果条目里的体系标签只应出现「太乙神数」（筛选按钮不算）
    const labels = [...container.querySelectorAll(".provenance__system")].map((node) => node.textContent);
    expect(labels).toHaveLength(expected);
    expect(new Set(labels)).toEqual(new Set(["太乙神数"]));
  });

  it("按核对状态筛选（异说 / 未核 都能筛出来）", () => {
    render(<ProvenanceLibrary />);
    for (const status of ["异说", "未核"] as const) {
      fireEvent.click(screen.getByRole("button", { name: status }));
      const expected = PROVENANCE.filter((entry) => entry.status === status).length;
      expect(screen.getByText(countText(expected))).toBeInTheDocument();
    }
    // 回到全部
    fireEvent.click(screen.getByRole("button", { name: "全部状态" }));
    expect(screen.getByText(countText(PROVENANCE.length))).toBeInTheDocument();
  });

  it("体系与状态筛选可叠加，并可回到全部", () => {
    render(<ProvenanceLibrary />);
    fireEvent.click(screen.getByRole("button", { name: "全部体系" }));
    fireEvent.click(screen.getByRole("button", { name: "本仓自撰" }));
    const expected = PROVENANCE.filter((entry) => entry.status === "本仓自撰").length;
    expect(expected).toBeGreaterThan(0);
    expect(screen.getByText(countText(expected))).toBeInTheDocument();
  });
});
