export type CatalogScenario = {
  id: string;
  version: number;
  kind: "battlefield" | "case-study";
  title: string;
  subtitle: string;
  industry: string;
  description: string;
  modules: Array<{ id:string; title:string; description:string; access:"included"|"advanced" }>;
};

export type SessionBattle = {
  id: string;
  title: string;
  objective: string;
  minimumOutcome: string;
  idealOutcome: string;
  opponentSummary: string;
  status: string;
  hardDeadline: string | null;
  scenarioId?: string | null;
  scenarioVersion?: number | null;
  updatedAt: string;
  accessRole?: "owner" | "viewer" | "contributor" | "advisor";
};

export type Collaborator = {
  id: string;
  battleId: string;
  subjectType: string;
  subjectId: string;
  role: "viewer" | "contributor" | "advisor" | "owner";
  status: "invited" | "active" | "revoked";
  permissions: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BattleInvitation = Collaborator & {
  battleTitle: string;
  invitedBy: { subjectType:string; subjectId:string };
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "include", headers: { "Content-Type":"application/json", ...(init?.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : `请求失败（${response.status}）`);
  return data as T;
}

export const sessionApi = {
  connectors: () => request<{ connectors: Array<{ id: string|null; provider: "calendar"|"email"|"project_board"; status: "not_connected"|"pending_authorization"|"authorized"|"revoked"; scopes: string[]; lastSyncAt: string|null }> }>("/api/connectors"),
  updateConnector: (provider: "calendar"|"email"|"project_board", action: "authorize"|"revoke", scopes: string[] = []) => request<{ connector: unknown }>("/api/connectors", { method: "POST", body: JSON.stringify({ provider, action, scopes }) }),
  catalog: () => request<{ scenarios: CatalogScenario[] }>("/api/scenarios"),
  scenario: (id:string) => request<{ scenario: Record<string, unknown> }>(`/api/scenarios/${encodeURIComponent(id)}`),
  templates: () => request<{ templates: Array<Record<string, unknown>> }>("/api/templates"),
  battles: () => request<{ battles: SessionBattle[] }>("/api/battles"),
  invitations: () => request<{ invitations: BattleInvitation[] }>("/api/battles/invitations"),
  respondInvitation: (invitationId:string, action:"accept"|"decline") => request<{ invitation: Collaborator }>("/api/battles/invitations", { method:"PATCH", body:JSON.stringify({ invitationId, action }) }),
  battle: (id:string) => request<{ battle: SessionBattle; scenario?: unknown }>(`/api/battles/${id}`),
  updateBattle: (id:string, input:Record<string, unknown>) => request<{ battle: SessionBattle }>(`/api/battles/${id}`, { method:"PATCH", body:JSON.stringify(input) }),
  deleteBattle: (id:string) => request<{ deleted:boolean }>(`/api/battles/${id}`, { method:"DELETE", body:JSON.stringify({ confirmation:"DELETE" }) }),
  analysis: (id:string) => request<{ gravity?: Record<string, unknown> | null; junctions: Array<Record<string, unknown>>; moves: Array<Record<string, unknown>> }>(`/api/battles/${id}/analysis`),
  strategyTemplates: (id:string) => request<{ templates: Array<import('../../lib/scenarios/strategy-templates').ScenarioStrategyTemplate> }>(`/api/battles/${id}/strategy-templates`),
  generateAnalysis: (id:string, resourceSnapshot?: Record<string, number>) => request<{ gravity?: Record<string, unknown> | null; junctions: Array<Record<string, unknown>>; moves: Array<Record<string, unknown>> }>(`/api/battles/${id}/analysis`, { method:"POST", body:JSON.stringify({ resourceSnapshot }) }),
  saveMoves: (id:string, junctionId:string, moves:Array<Record<string, unknown>>) => request<{ moves: unknown[] }>(`/api/battles/${id}/moves`, { method:"POST", body:JSON.stringify({ junctionId, moves }) }),
  deleteMove: (id:string, moveId:string) => request<{ deleted:boolean }>(`/api/battles/${id}/moves?moveId=${encodeURIComponent(moveId)}`, { method:"DELETE" }),
  updateMoveSource: (id:string, moveId:string, source:Record<string, unknown>) => request<{ move: Record<string, unknown> }>(`/api/battles/${id}/moves/${moveId}`, { method:"PATCH", body:JSON.stringify({ source }) }),
  commitment: (id:string) => request<{ commitment: Record<string, unknown> | null }>(`/api/battles/${id}/commitments`),
  commitMove: (id:string, moveId:string, changeReason?:string) => request<{ commitment: Record<string, unknown> }>(`/api/battles/${id}/commitments`, { method:"POST", body:JSON.stringify({ moveId, changeReason }) }),
  execution: (id:string, moveId:string) => request<{ actions: Array<Record<string, unknown>>; breakers: Array<Record<string, unknown>> }>(`/api/battles/${id}/moves/${moveId}/execution`),
  facts: (id:string) => request<{ facts: Array<Record<string, unknown>> }>(`/api/battles/${id}/facts`),
  addFacts: (id:string, facts:Array<Record<string, unknown>>) => request<{ facts: Array<Record<string, unknown>> }>(`/api/battles/${id}/facts`, { method:'POST', body:JSON.stringify({ facts }) }),
  constraints: (id:string) => request<{ constraints: Array<Record<string, unknown>> }>(`/api/battles/${id}/constraints`),
  replaceConstraints: (id:string, constraints:Array<Record<string, unknown>>) => request<{ constraints: Array<Record<string, unknown>> }>(`/api/battles/${id}/constraints`, { method:'PUT', body:JSON.stringify({ constraints }) }),
  confirmInterview: (id:string, input:{ confirmationKey:string; facts:Array<Record<string, unknown>>; constraints:Array<Record<string, unknown>> }) => request<{ facts:Array<Record<string, unknown>>; constraints:Array<Record<string, unknown>>; reused?:boolean }>(`/api/battles/${id}/interview/confirm`, { method:'POST', headers:{ 'Idempotency-Key': input.confirmationKey }, body:JSON.stringify(input) }),
  triggerBreaker: (id:string, moveId:string, breakerId:string) => request<{ breaker: Record<string, unknown> }>(`/api/battles/${id}/moves/${moveId}/execution`, { method:"PATCH", body:JSON.stringify({ action:"trigger_breaker", breakerId }) }),
  consumeUsage: (id:string, operation:string, idempotencyKey:string) => request<{ usage: unknown }>(`/api/battles/${id}/usage`, { method:"POST", body:JSON.stringify({ operation, idempotencyKey }) }),
  consumeUsageAndSaveModule: (id:string, operation:string, idempotencyKey:string, moduleId:string, state:Record<string,unknown>, consent:Record<string,unknown> = {}) => request<{ usage:unknown; module:unknown; reused?:boolean }>(`/api/battles/${id}/usage`, { method:"POST", body:JSON.stringify({ operation,idempotencyKey,moduleUpdate:{ moduleId,state,consent } }) }),
  clone: (scenarioId:string) => request<{ battle:{ battleId:string; scenarioId:string; scenarioVersion:number; sourceType:string } }>(`/api/scenarios/${scenarioId}/clone`, { method:"POST", body:JSON.stringify({}) }),
  create: (input: Record<string, unknown>) => request<{ battle: SessionBattle }>("/api/battles", { method:"POST", body:JSON.stringify(input) }),
  module: (battleId:string, moduleId:string) => request<{ state: unknown }>(`/api/battles/${battleId}/modules/${moduleId}`),
  saveModule: (battleId:string, moduleId:string, state:unknown, consent:unknown = {}) => request<{ state: unknown }>(`/api/battles/${battleId}/modules/${moduleId}`, { method:"PUT", body:JSON.stringify({ state, consent }) }),
  decisionBoard: (battleId:string, action:Record<string, unknown>) => request<{ state: { version:number; state: Record<string, unknown>; consent:Record<string, unknown>; updatedAt:string; role:string } }>(`/api/battles/${battleId}/decision-board`, { method:"POST", body:JSON.stringify(action) }),
  ai: (battleId:string, kind:string, body:Record<string, unknown>) => request<{ job: unknown; usage?: unknown }>(`/api/battles/${battleId}/ai/${kind}`, { method:"POST", body:JSON.stringify(body) }),
  aiJob: (battleId:string, jobId:string) => request<{ job: Record<string, unknown> }>(`/api/battles/${battleId}/jobs/${jobId}`),
  activateTemplate: (battleId:string, templateId:string) => request<{ templateId:string; ownedTemplateIds:string[] }>(`/api/battles/${battleId}/templates/${templateId}`, { method:"POST", body:JSON.stringify({}) }),
  memories: () => request<{ memories: Array<Record<string, unknown>> }>(`/api/battles/memories`),
  profile: () => request<{ profile: { profile: Record<string, unknown> } | null; archonProgress:{ reviewedBattles:number; committedBattles:number; collaborationBattles:number; archiveUnlocks:number; score:number; rankTitle:string; seals:number; privileges:{ precognition:boolean; archiveAnnotation:boolean; realityProposal:boolean } } }>(`/api/battles/profile`),
  entitlement: () => request<{ usage: { available:number; reserved:number; consumed:number } }>(`/api/entitlement`),
  saveProfile: (profile: Record<string, unknown>) => request<{ profile: unknown }>(`/api/battles/profile`, { method:"PUT", body:JSON.stringify({ profile }) }),
  saveCalibration: (input: { battleId?: string | null; dimension: string; expected?: number | null; actual?: number | null; note?: string }) => request<{ event: unknown }>(`/api/battles/calibration`, { method:"POST", body:JSON.stringify(input) }),
  saveReview: (battleId:string, input:{ outcome:string; facts:string; whatChanged:string; nextAdjustment:string; diagnosis?:Record<string, unknown>; commitmentId?:string|null; idempotencyKey?:string }) => request<{ review: Record<string, unknown> }>(`/api/battles/${battleId}/reviews`, { method:"POST", body:JSON.stringify(input) }),
  claimRealityEchoReward: (battleId:string, echoId:string) => request<{ state: unknown; reused?: boolean }>(`/api/battles/${battleId}/reality-echoes/claim`, { method:"POST", body:JSON.stringify({ echoId }) }),
  deleteMemory: (id:string) => request<{ deleted:boolean }>(`/api/battles/memories?id=${encodeURIComponent(id)}`, { method:"DELETE" }),
  saveMemory: (input:{ id?:string; battleId?:string|null; title:string; memory:Record<string, unknown>; source?:Record<string, unknown>; consentStatus?:"active"|"paused"|"revoked" }) => request<{ memory: Record<string, unknown> }>(`/api/battles/memories`, { method:"POST", body:JSON.stringify(input) }),
  collaborators: (battleId:string) => request<{ collaborators: Collaborator[] }>(`/api/battles/${battleId}/collaborators`),
  inviteCollaborator: (battleId:string, input:{ subjectType:string; subjectId:string; role:"viewer"|"contributor"|"advisor"; permissions?:Record<string, unknown> }) => request<{ collaborator: Collaborator }>(`/api/battles/${battleId}/collaborators`, { method:"POST", body:JSON.stringify(input) }),
  updateCollaborator: (battleId:string, collaboratorId:string, input:{ status?:"invited"|"active"|"revoked"; action?:"accept" }) => request<{ collaborator: Collaborator }>(`/api/battles/${battleId}/collaborators`, { method:"PATCH", body:JSON.stringify({ collaboratorId, ...input }) }),
};
