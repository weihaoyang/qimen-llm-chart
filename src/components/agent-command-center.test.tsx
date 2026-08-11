// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentCommandCenter } from "./agent-command-center";

const emptyLife = {
  kind: "life" as const,
  title: "人生 K 线",
  disclaimer: "",
  methodology: "",
  points: [],
  keyPoints: [],
  sourceCount: 0,
};

describe("AgentCommandCenter", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sends an unauthenticated user to unified login from the save entry", () => {
    const onLogin = vi.fn();
    render(<AgentCommandCenter mode="qimen" onModeChange={vi.fn()} inspector={<div>访谈内容</div>} life={emptyLife} question="我要不要换工作" conversationCount={0} canPersist={false} evidenceText="" evidenceJson="{}" conversation={[]} onLogin={onLogin} onCaseRestore={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /登录后保存/ }));

    expect(onLogin).toHaveBeenCalledOnce();
    expect(screen.getByText("当前为临时工作区；登录后才可保存议题")).toBeInTheDocument();
  });

  it("restores the latest saved decision tree with the selected server case", async () => {
    const savedCase = { id: "case-1", title: "是否换工作", question: "我要不要换工作", status: "active", deadline: null, createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T00:00:00.000Z" };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/agent/cases") return new Response(JSON.stringify({ cases: [savedCase] }), { status: 200 });
      if (url.endsWith("/turns")) return new Response(JSON.stringify({ turns: [{ role: "user", content: "我担心现金流" }] }), { status: 200 });
      if (url.endsWith("/tree")) return new Response(JSON.stringify({ version: 2, tree: { root: { activeWindow: "2026-09-01", evidence: "现金储备只能支撑三个月", source: "现实事实 · 访谈" }, branches: [
        { key: "advance", title: "推进", assumptions: ["已拿到书面 offer"], firstAction: "核验薪资与试用期条款", cost: "放弃当前稳定性", risks: ["试用期不确定"], validationDate: "2026-09-01", stopCondition: "书面条款低于底线" },
        { key: "verify", title: "验证", assumptions: ["目标公司业务稳定"], firstAction: "访谈两位在职员工", cost: "延迟一周决定", risks: ["错过窗口"], validationDate: "2026-08-20", stopCondition: "无法获得独立信息" },
        { key: "protect", title: "保护", assumptions: ["当前工作仍可保留"], firstAction: "维持现职并补足现金储备", cost: "短期机会成本", risks: ["继续消耗"], validationDate: null, stopCondition: "现金储备达到六个月" },
      ] } }), { status: 200 });
      if (url.endsWith("/evidence")) return new Response(JSON.stringify({ evidence: { mode: "qimen", sourceText: "保存时的盘面事实", structuredJson: { source: "saved" } } }), { status: 200 });
      return new Response(JSON.stringify({ error: "unexpected request" }), { status: 500 });
    }));

    render(<AgentCommandCenter mode="qimen" onModeChange={vi.fn()} inspector={<div>访谈内容</div>} life={emptyLife} question="临时问题" conversationCount={0} canPersist accessToken="account-token" evidenceText="" evidenceJson="{}" conversation={[]} onLogin={vi.fn()} onCaseRestore={vi.fn()} />);

    expect(await screen.findByText("已恢复服务器工作区 · 决策树 V2")).toBeInTheDocument();
    expect(screen.getByText("已保存的关键窗口")).toBeInTheDocument();
    expect(screen.getAllByText("现实事实 · 访谈")).toHaveLength(2);
    expect(screen.getByText("核验薪资与试用期条款")).toBeInTheDocument();
  });

  it("automatically creates and incrementally saves an authenticated conversation", async () => {
    const savedCase = { id: "case-auto", title: "是否换工作", question: "我要不要换工作", status: "active", deadline: null, createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T00:00:00.000Z" };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/agent/cases" && !init?.method) return new Response(JSON.stringify({ cases: [] }), { status: 200 });
      if (url === "/api/agent/cases" && init?.method === "POST") return new Response(JSON.stringify({ case: savedCase }), { status: 201 });
      if (url.endsWith("/evidence") && init?.method === "POST") return new Response(JSON.stringify({ evidence: { id: "evidence-1" } }), { status: 201 });
      if (url.endsWith("/turns") && init?.method === "POST") return new Response(JSON.stringify({ id: "turn", sequenceNo: 1 }), { status: 201 });
      return new Response(JSON.stringify({ error: "unexpected request" }), { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AgentCommandCenter mode="qimen" onModeChange={vi.fn()} inspector={<div>访谈内容</div>} life={emptyLife} question="" conversationCount={2} canPersist accessToken="account-token" evidenceText="盘面事实" evidenceJson='{"chart":"snapshot"}' conversation={[{ role: "user", content: "我要不要换工作" }, { role: "assistant", content: "请说明现金储备" }]} onLogin={vi.fn()} onCaseRestore={vi.fn()} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/agent/cases", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/agent/cases/case-auto/turns", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/agent/cases/case-auto/evidence", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith("/turns") && init?.method === "POST")).toHaveLength(2));
    const savedPhases = fetchMock.mock.calls
      .filter(([url, init]) => String(url).endsWith("/turns") && init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init?.body)).phase);
    expect(savedPhases).toEqual(["issue", "issue"]);
    expect(screen.getByText("1", { selector: ".agent-command__interview-head > strong" })).toBeInTheDocument();
  });
});
