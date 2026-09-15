// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CombinedMap } from "./combined-map";

vi.stubGlobal("React", React);
afterEach(cleanup);
it("keeps missing evidence explicit and hands the selected topic and action to the existing agent", () => {
  const onQuestion = vi.fn();
  render(<CombinedMap qimen={null} bazi={null} ziwei={null} agent={<div>现有 Agent</div>} onQuestion={onQuestion} />);
  expect(screen.getByText("八字尚未生成，请调整盘面资料")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "财务" }));
  fireEvent.click(screen.getByRole("button", { name: /03.*紫微/ }));
  expect(screen.getByText("该领域的紫微宫位资料未生成")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /解释这些依据/ }));
  expect(onQuestion.mock.lastCall?.[0]).toContain("紫微在财务问题上的依据");
  fireEvent.click(screen.getByRole("button", { name: /PATH.*延后决定/ }));
  expect(onQuestion.mock.lastCall?.[0]).toContain("延后决定");
  expect(onQuestion.mock.lastCall?.[0]).toContain("不代表奇门已重新起局");
});
