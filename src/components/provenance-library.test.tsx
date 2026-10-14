// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { PROVENANCE } from "@/lib/provenance/registry";
import { loadAllMaterials, mergeMaterials } from "@/lib/provenance/materials/manifest";
import type { ProvenanceEntryWithMaterials, ProvenanceMaterialSet } from "@/lib/provenance/types";
import { ProvenanceLibrary } from "./provenance-library";
import { provenanceSearchText } from "./provenance-block";

const countText = (n: number) => `命中 ${n} / ${PROVENANCE.length} 条`;

/** 材料本体按需载入：测试里显式 await 一次，拼出「元数据 + 材料」的完整语料。 */
let MATERIALS: ProvenanceMaterialSet = {};
let CORPUS: ProvenanceEntryWithMaterials[] = [];
const hits = (needle: string) =>
  CORPUS.filter((entry) => provenanceSearchText(entry).includes(needle.toLocaleLowerCase())).length;

beforeAll(async () => {
  MATERIALS = await loadAllMaterials();
  CORPUS = PROVENANCE.map((entry) => mergeMaterials(entry, MATERIALS));
});

/** 打开资料库：材料本体载入完成（状态行消失）后再断言。 */
const openLibrary = async () => {
  const view = render(<ProvenanceLibrary />);
  await waitFor(() => expect(screen.queryByText("正在载入原文…")).not.toBeInTheDocument());
  return view;
};

describe("ProvenanceLibrary 资料库", () => {
  afterEach(() => cleanup());

  it("默认列出全部条目，并显示命中数", async () => {
    await openLibrary();
    expect(screen.getByText(countText(PROVENANCE.length))).toBeInTheDocument();
    // 首屏应能看到条目（例如太乙的第一条）
    expect(screen.getAllByText(/太乙金鏡式經/).length).toBeGreaterThan(0);
  });

  it("打开时按需载入材料本体（加载中先给状态）", async () => {
    const { container } = render(<ProvenanceLibrary />);
    // 材料本体不在首屏包里：抽屉打开后先显示载入状态
    expect(screen.getByText("正在载入原文…")).toBeInTheDocument();
    expect(container.querySelectorAll(".provenance__document").length).toBe(0);

    await waitFor(() => expect(screen.queryByText("正在载入原文…")).not.toBeInTheDocument());
    // 载入完成后材料本体可查阅
    expect(container.querySelectorAll(".provenance__document").length).toBeGreaterThan(0);
  });

  it("全文检索按材料本体匹配（原文片段也能搜到）", async () => {
    await openLibrary();

    const needle = "太乙金鏡式經";
    fireEvent.change(screen.getByLabelText("检索出处与原文"), { target: { value: needle } });
    const expected = hits(needle);
    expect(expected).toBeGreaterThan(0);
    expect(expected).toBeLessThan(PROVENANCE.length);
    expect(screen.getByText(countText(expected))).toBeInTheDocument();

    // 只出现在资料本体（documents）里的片段同样可搜到
    const inBody = "前為外迫";
    fireEvent.change(screen.getByLabelText("检索出处与原文"), { target: { value: inBody } });
    const expectedBody = hits(inBody);
    expect(expectedBody).toBeGreaterThan(0);
    expect(screen.getByText(countText(expectedBody))).toBeInTheDocument();
  });

  it("命中为空时给出可操作的提示", async () => {
    await openLibrary();
    fireEvent.change(screen.getByLabelText("检索出处与原文"), { target: { value: "zzz不存在的关键词zzz" } });
    expect(screen.getByText(countText(0))).toBeInTheDocument();
    expect(screen.getByText(/没有匹配的资料/)).toBeInTheDocument();
  });

  it("按体系筛选", async () => {
    const { container } = await openLibrary();
    fireEvent.click(screen.getByRole("button", { name: "太乙神数" }));
    const expected = PROVENANCE.filter((entry) => entry.system === "taiyi-shenshu").length;
    expect(expected).toBeGreaterThan(0);
    expect(screen.getByText(countText(expected))).toBeInTheDocument();
    // 结果条目里的体系标签只应出现「太乙神数」（筛选按钮不算）
    const labels = [...container.querySelectorAll(".provenance__system")].map((node) => node.textContent);
    expect(labels).toHaveLength(expected);
    expect(new Set(labels)).toEqual(new Set(["太乙神数"]));
  });

  it("按核对状态筛选（异说 / 未核 都能筛出来）", async () => {
    await openLibrary();
    for (const status of ["异说", "未核"] as const) {
      fireEvent.click(screen.getByRole("button", { name: status }));
      const expected = PROVENANCE.filter((entry) => entry.status === status).length;
      expect(screen.getByText(countText(expected))).toBeInTheDocument();
    }
    // 回到全部
    fireEvent.click(screen.getByRole("button", { name: "全部状态" }));
    expect(screen.getByText(countText(PROVENANCE.length))).toBeInTheDocument();
  });

  it("体系与状态筛选可叠加，并可回到全部", async () => {
    await openLibrary();
    fireEvent.click(screen.getByRole("button", { name: "全部体系" }));
    fireEvent.click(screen.getByRole("button", { name: "本仓自撰" }));
    const expected = PROVENANCE.filter((entry) => entry.status === "本仓自撰").length;
    expect(expected).toBeGreaterThan(0);
    expect(screen.getByText(countText(expected))).toBeInTheDocument();
  });
});
