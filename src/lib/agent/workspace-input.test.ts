import { describe, expect, it } from "vitest";
import { isAgentInterviewPhase, isAgentWorkbenchMode, isAgentWorkspaceId } from "./workspace-input";

describe("agent workspace input contract", () => {
  it("accepts only UUIDs generated for product-owned records", () => {
    expect(isAgentWorkspaceId("00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isAgentWorkspaceId("00000000-0000-0000-0000-000000000001")).toBe(false);
    expect(isAgentWorkspaceId("not-a-uuid")).toBe(false);
  });

  it("keeps persisted modes and interview phases restorable", () => {
    expect(isAgentWorkbenchMode("combined")).toBe(true);
    expect(isAgentWorkbenchMode("arbitrary")).toBe(false);
    expect(isAgentInterviewPhase("facts")).toBe(true);
    expect(isAgentInterviewPhase("free-form")).toBe(false);
  });
});
