// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { PROVENANCE, PROVENANCE_SYSTEM_LABELS, provenanceBySystem } from "@/lib/provenance/registry";
import { loadAllMaterials } from "@/lib/provenance/materials/manifest";
import type { ProvenanceEntry, ProvenanceMaterialSet, ProvenanceSystem } from "@/lib/provenance/types";
import { ProvenanceBlock } from "./provenance-block";
import { TaiyiPanel } from "./taiyi-panel";
import { buildTaiyiChart } from "@/lib/taiyi/chart";

const ALL_SYSTEMS = Object.keys(PROVENANCE_SYSTEM_LABELS) as ProvenanceSystem[];

/**
 * 材料本体（整段原文 / 整表数值 / 源码行）已从 registry 拆到按需模块
 * `src/lib/provenance/materials/*`。下面的纪律检查仍要覆盖材料本体本身，
 * 所以测试里显式 await 全量取回一次（与「资料库」打开时走的是同一条路径）。
 */
let MATERIALS: ProvenanceMaterialSet = {};
const documentsOf = (entry: ProvenanceEntry) => MATERIALS[entry.id] ?? [];

beforeAll(async () => {
  MATERIALS = await loadAllMaterials();
});

/** 展开「出处与原文」区块——材料本体此时才按需载入；等到二级 `<details>` 出现为止。 */
const expandProvenance = async (container: HTMLElement) => {
  const details = container.querySelector("details.provenance") as HTMLDetailsElement;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  await waitFor(() => expect(container.querySelectorAll("details.provenance__document").length).toBeGreaterThan(0));
};

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
      provenanceBySystem(system).some((entry) => documentsOf(entry).length > 0),
    );
    // 至少 3 个体系把「资料本体」放进产品（按需载入，不再随首屏打包）
    expect(systemsWithDocuments.length).toBeGreaterThanOrEqual(3);

    const taiyiDocs = provenanceBySystem("taiyi-shenshu").flatMap(documentsOf);
    expect(taiyiDocs.some((doc) => doc.lines.some((line) => line.includes("前為外迫")))).toBe(true);
    // 太乙十一类格局的全文都在（逐条一个 document）
    expect(taiyiDocs.length).toBeGreaterThanOrEqual(11);

    const qizhengDocs = provenanceBySystem("qizheng").flatMap(documentsOf);
    const mansionDoc = qizhengDocs.find((doc) => doc.lines.some((line) => line.includes("斗初宮五度五十分")));
    expect(mansionDoc).toBeDefined();
    // 28 宿逐值，一条不漏
    expect(mansionDoc?.lines.filter((line) => /＝/.test(line)).length).toBe(28);
  });

  it("keeps every document well-formed: a title and non-empty verbatim lines", () => {
    for (const documents of Object.values(MATERIALS)) {
      for (const doc of documents) {
        expect(doc.title.trim().length).toBeGreaterThan(0);
        expect(doc.lines.length).toBeGreaterThan(0);
        for (const line of doc.lines) expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("never lists a source without also carrying the material itself", () => {
    // 不允许「只有书名/仓库名 + 外链」的条目：每条都必须至少带
    // quote（短引句）或 documents（材料本体，按需模块里）或 details 之一。
    const bare = PROVENANCE.filter(
      (entry) => !entry.quote && documentsOf(entry).length === 0 && (entry.details?.length ?? 0) === 0,
    );
    expect(
      bare.map((entry) => entry.id),
      "以下条目只挂了出处/链接，未把材料本体放进产品（缺 quote / documents / details）：",
    ).toEqual([]);
  });

  it("only knows material bodies through the on-demand modules (registry stays short)", () => {
    // 结构纪律：长材料不再挂在 registry 的条目上，只能从按需模块取回。
    for (const entry of PROVENANCE) {
      expect(Object.keys(entry), `${entry.id} 把材料本体塞回了 registry`).not.toContain("documents");
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

  it("leaves the long material out until the block is expanded, then loads it on demand", async () => {
    const { container } = render(<ProvenanceBlock system="taiyi-shenshu" />);

    // 未展开：首屏只渲染引文/出处等短字段，材料本体不在 DOM（因此也不在首屏包里）
    expect(container.querySelectorAll("details.provenance__document").length).toBe(0);
    expect(screen.queryByText(/前為外迫後為内迫/)).not.toBeInTheDocument();

    await expandProvenance(container);
    expect(screen.getByText(/前為外迫後為内迫/)).toBeInTheDocument();
  });

  it("mounts the long document bodies as collapsible, height-capped nested <details>", async () => {
    const { container } = render(<ProvenanceBlock system="taiyi-shenshu" />);
    await expandProvenance(container);

    // 资料本体展开后可在 DOM 中查阅，且为原文片段
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

  it("shows the loading state while the material is being fetched", async () => {
    const { container } = render(<ProvenanceBlock system="taiyi-shenshu" />);
    const details = container.querySelector("details.provenance") as HTMLDetailsElement;
    details.open = true;
    fireEvent(details, new Event("toggle"));

    expect(screen.getByText("正在载入原文…")).toBeInTheDocument();
    await waitFor(() => expect(container.querySelectorAll("details.provenance__document").length).toBeGreaterThan(0));
    expect(screen.queryByText("正在载入原文…")).not.toBeInTheDocument();
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
