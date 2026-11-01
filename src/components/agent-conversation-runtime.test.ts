import { describe, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "@assistant-ui/react";
import { runWhenThreadReady } from "./agent-conversation";

function createRuntime(initiallyLoading: boolean) {
  let loading = initiallyLoading;
  let listener: (() => void) | undefined;
  const unsubscribe = vi.fn(() => { listener = undefined; });
  const runtime = {
    thread: { getState: () => ({ isLoading: loading }) },
    threads: {
      subscribe: (callback: () => void) => {
        listener = callback;
        return unsubscribe;
      },
    },
  } as unknown as AssistantRuntime;

  return {
    runtime,
    unsubscribe,
    setReady() {
      loading = false;
      listener?.();
    },
  };
}

describe("runWhenThreadReady", () => {
  it("waits for the main thread before running a mutation", () => {
    const harness = createRuntime(true);
    const callback = vi.fn();
    const cleanup = runWhenThreadReady(harness.runtime, callback);

    expect(callback).not.toHaveBeenCalled();
    harness.setReady();
    expect(callback).toHaveBeenCalledOnce();
    expect(harness.unsubscribe).toHaveBeenCalledOnce();
    cleanup();
  });

  it("runs immediately when ready and never runs after cleanup", () => {
    const ready = createRuntime(false);
    const callback = vi.fn();
    runWhenThreadReady(ready.runtime, callback);
    expect(callback).toHaveBeenCalledOnce();
    expect(ready.unsubscribe).not.toHaveBeenCalled();

    const pending = createRuntime(true);
    const cancelled = vi.fn();
    const cleanup = runWhenThreadReady(pending.runtime, cancelled);
    cleanup();
    pending.setReady();
    expect(cancelled).not.toHaveBeenCalled();
  });
});
