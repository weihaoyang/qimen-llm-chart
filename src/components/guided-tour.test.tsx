// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuidedTour, GUIDED_TOUR_STEPS } from "./guided-tour";

describe("GuidedTour 分步高亮指引", () => {
  afterEach(() => cleanup());

  const renderTour = (index = 0, onClose = vi.fn()) => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const view = render(<GuidedTour index={index} onPrev={onPrev} onNext={onNext} onClose={onClose} />);
    return { ...view, onPrev, onNext, onClose };
  };

  it("按步骤显示标题、说明与进度", () => {
    renderTour(0);
    expect(screen.getByRole("dialog", { name: "分步指引" })).toBeInTheDocument();
    expect(screen.getByText(GUIDED_TOUR_STEPS[0].title)).toBeInTheDocument();
    expect(screen.getByText(`1 / ${GUIDED_TOUR_STEPS.length}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上一步" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "下一步" })).toBeEnabled();
  });

  it("下一步 / 上一步 通过回调切换步骤（组件本身不持有状态）", () => {
    const { onNext, onPrev } = renderTour(1);
    expect(screen.getByText(GUIDED_TOUR_STEPS[1].title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上一步" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    expect(onNext).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "上一步" }));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("最后一步显示「完成」并结束指引", () => {
    const { onClose, onNext } = renderTour(GUIDED_TOUR_STEPS.length - 1);
    const finish = screen.getByRole("button", { name: "完成" });
    expect(finish).toBeInTheDocument();
    fireEvent.click(finish);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("「跳过」与 Esc 都能退出", () => {
    const first = renderTour(0);
    fireEvent.click(screen.getByRole("button", { name: "跳过" }));
    expect(first.onClose).toHaveBeenCalledTimes(1);
    cleanup();

    const second = renderTour(0);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(second.onClose).toHaveBeenCalledTimes(1);
  });

  it("目标不可测时（jsdom 无布局）退化为居中说明，不报错也不画高亮", () => {
    const { container } = renderTour(0);
    expect(container.querySelector(".guided-tour__callout.is-centered")).not.toBeNull();
    expect(container.querySelector(".guided-tour__spotlight")).toBeNull();
    expect(container.querySelector(".guided-tour__dim")).not.toBeNull();
  });
});
