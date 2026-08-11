export const AGENT_WORKBENCH_MODES = ["qimen", "bazi", "ziwei", "combined", "research"] as const;
export const AGENT_INTERVIEW_PHASES = ["issue", "facts", "constraints", "options", "costs", "action"] as const;

export const isAgentWorkspaceId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const isAgentWorkbenchMode = (value: unknown): value is (typeof AGENT_WORKBENCH_MODES)[number] =>
  typeof value === "string" && AGENT_WORKBENCH_MODES.includes(value as (typeof AGENT_WORKBENCH_MODES)[number]);

export const isAgentInterviewPhase = (value: unknown): value is (typeof AGENT_INTERVIEW_PHASES)[number] =>
  typeof value === "string" && AGENT_INTERVIEW_PHASES.includes(value as (typeof AGENT_INTERVIEW_PHASES)[number]);
