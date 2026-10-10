// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PROVENANCE, PROVENANCE_SYSTEM_LABELS, provenanceBySystem } from "@/lib/provenance/registry";
import type { ProvenanceSystem } from "@/lib/provenance/types";
import { ProvenanceBlock } from "./provenance-block";
import { TaiyiPanel } from "./taiyi-panel";
import { buildTaiyiChart } from "@/lib/taiyi/chart";

const ALL_SYSTEMS = Object.keys(PROVENANCE_SYSTEM_LABELS) as ProvenanceSystem[];

describe("provenance registry", () => {
  it("covers every workbench system with at least one entry", () => {
    for (const system of ALL_SYSTEMS) {
      expect(provenanceBySystem(system).length, `${system} 缺少出处条目`).toBeGreaterThan(0);
    }
  });

  it("keeps every entry citable: precise citation + a status", () => {
    for (const entry of PROVENANCE) {
      expect(entry.citation.trim().length).toBeGreaterThan(0);
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(["已核", "异说", "未核", "本仓自撰"]).toContain(entry.status);
      // 有逐字引文的条目必须给出处链接或书篇，否则无从核对
      if (entry.quote) expect(entry.citation.length).toBeGreaterThan(8);
    }
  });

  it("records the disagreements instead of hiding them", () => {
    const variants = PROVENANCE.filter((entry) => entry.status === "异说");
    expect(variants.length).toBeGreaterThanOrEqual(3);
    // 太乙：和数异文、阳宫两说；七政四余：四余定义异说
    expect(variants.some((entry) => entry.system === "taiyi-shenshu")).toBe(true);
    expect(variants.some((entry) => entry.system === "qizheng")).toBe(true);
  });

  it("carries verbatim document bodies (not just short quotes) for several systems", () => {
    const systemsWithDocuments = ALL_SYSTEMS.filter((system) =>
      provenanceBySystem(system).some((entry) => (entry.documents?.length ?? 0) > 0),
    );
    // 至少 3 个体系把「资料本体」直接放进前端
    expect(systemsWithDocuments.length).toBeGreaterThanOrEqual(3);

    const taiyiDocs = provenanceBySystem("taiyi-shenshu").flatMap((entry) => entry.documents ?? []);
    expect(taiyiDocs.some((doc) => doc.lines.some((line) => line.includes("前為外迫")))).toBe(true);
    // 太乙十一类格局的全文都在（逐条一个 document）
    expect(taiyiDocs.length).toBeGreaterThanOrEqual(11);

    const qizhengDocs = provenanceBySystem("qizheng").flatMap((entry) => entry.documents ?? []);
    const mansionDoc = qizhengDocs.find((doc) => doc.lines.some((line) => line.includes("斗初宮五度五十分")));
    expect(mansionDoc).toBeDefined();
    // 28 宿逐值，一条不漏
    expect(mansionDoc?.lines.filter((line) => /＝/.test(line)).length).toBe(28);
  });

  it("keeps every document well-formed: a title and non-empty verbatim lines", () => {
    for (const entry of PROVENANCE) {
      for (const doc of entry.documents ?? []) {
        expect(doc.title.trim().length).toBeGreaterThan(0);
        expect(doc.lines.length).toBeGreaterThan(0);
        for (const line of doc.lines) expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("ProvenanceBlock", () => {
  afterEach(() => cleanup());

  it("renders the quotes, sources and status labels for a system", () => {
    render(<ProvenanceBlock system="taiyi-shenshu" />);
    expect(screen.getByText(/出处与原文 · 供查阅/)).toBeInTheDocument();
    expect(screen.getByText(/十四、十八、三十三為上和/)).toBeInTheDocument();
    expect(screen.getAllByText(/异说/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/未核/).length).toBeGreaterThan(0);
  });

  it("mounts the long document bodies as collapsible, height-capped nested <details>", () => {
    const { container } = render(<ProvenanceBlock system="taiyi-shenshu" />);

    // 资料本体仍在 DOM 中（可展开后由读者查阅），且为原文片段
    expect(screen.getByText(/前為外迫後為内迫/)).toBeInTheDocument();

    const dockBlocks = container.querySelectorAll("details.provenance__document");
    expect(dockBlocks.length).toBeGreaterThan(0);
    for (const block of dockBlocks) {
      expect(block.tagName).toBe("DETAILS");
      expect(block.querySelector("summary.provenance__document-summary")).not.toBeNull();
      // 二级 details 是「可展开」的：正文置于其上、summary 为其首子元素
      expect(block.querySelector("summary")).toBe(block.firstElementChild);
      // 长资料限高滚动，靠 class 控制，不撑爆面板
      expect(block.querySelector(".provenance__document-body")).not.toBeNull();
    }
  });

  it("renders nothing for a system without entries", () => {
    const { container } = render(<ProvenanceBlock system={"__none__" as ProvenanceSystem} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is actually mounted inside a workbench panel", () => {
    render(<TaiyiPanel chart={buildTaiyiChart({ year: 2024, cycle: 360, dun: "阳遁", ruJu: 1 })} yearInput="2024" cycle={360} dun="阳遁" ruJuInput="" />);
    expect(screen.getByText(/出处与原文 · 供查阅/)).toBeInTheDocument();
    expect(screen.getAllByText(/太乙金鏡式經/).length).toBeGreaterThan(0);
  });
});
