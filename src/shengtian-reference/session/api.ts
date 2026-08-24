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
};

export type Collaborator = {
  id: string;
  battleId: string;
  subjectType: string;
  subjectId: string;
  role: "viewer" | "contributor" | "advisor" | "owner";
  status: "invited" | "active" | "revoked";
  permissions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "include", headers: { "Content-Type":"application/json", ...(init?.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : `请求失败（${response.status}）`);
  return data as T;
}

export const sessionApi = {
  catalog: () => request<{ scenarios: CatalogScenario[] }>("/api/scenarios"),
  battles: () => request<{ battles: SessionBattle[] }>("/api/battles"),
  battle: (id:string) => request<{ battle: SessionBattle; scenario?: unknown }>(`/api/battles/${id}`),
  analysis: (id:string) => request<{ junctions: Array<{ id:string }>; moves: Array<Record<string, unknown>> }>(`/api/battles/${id}/analysis`),
  saveMoves: (id:string, junctionId:string, moves:Array<Record<string, unknown>>) => request<{ moves: unknown[] }>(`/api/battles/${id}/moves`, { method:"POST", body:JSON.stringify({ junctionId, moves }) }),
  commitment: (id:string) => request<{ commitment: Record<string, unknown> | null }>(`/api/battles/${id}/commitments`),
  commitMove: (id:string, moveId:string, changeReason?:string) => request<{ commitment: Record<string, unknown> }>(`/api/battles/${id}/commitments`, { method:"POST", body:JSON.stringify({ moveId, changeReason }) }),
  consumeUsage: (id:string, operation:string, idempotencyKey:string) => request<{ usage: unknown }>(`/api/battles/${id}/usage`, { method:"POST", body:JSON.stringify({ operation, idempotencyKey }) }),
  clone: (scenarioId:string) => request<{ battle:{ battleId:string } }>(`/api/scenarios/${scenarioId}/clone`, { method:"POST", body:JSON.stringify({}) }),
  create: (input: Record<string, unknown>) => request<{ battle: SessionBattle }>("/api/battles", { method:"POST", body:JSON.stringify(input) }),
  module: (battleId:string, moduleId:string) => request<{ state: unknown }>(`/api/battles/${battleId}/modules/${moduleId}`),
  saveModule: (battleId:string, moduleId:string, state:unknown, consent:unknown = {}) => request<{ state: unknown }>(`/api/battles/${battleId}/modules/${moduleId}`, { method:"PUT", body:JSON.stringify({ state, consent }) }),
  ai: (battleId:string, kind:string, body:Record<string, unknown>) => request<{ job: unknown; usage?: unknown }>(`/api/battles/${battleId}/ai/${kind}`, { method:"POST", body:JSON.stringify(body) }),
  aiJob: (battleId:string, jobId:string) => request<{ job: Record<string, unknown> }>(`/api/battles/${battleId}/jobs/${jobId}`),
  collaborators: (battleId:string) => request<{ collaborators: Collaborator[] }>(`/api/battles/${battleId}/collaborators`),
  inviteCollaborator: (battleId:string, input:{ subjectType:string; subjectId:string; role:"viewer"|"contributor"|"advisor"; permissions?:Record<string, unknown> }) => request<{ collaborator: Collaborator }>(`/api/battles/${battleId}/collaborators`, { method:"POST", body:JSON.stringify(input) }),
  updateCollaborator: (battleId:string, collaboratorId:string, input:{ status?:"invited"|"active"|"revoked"; action?:"accept" }) => request<{ collaborator: Collaborator }>(`/api/battles/${battleId}/collaborators`, { method:"PATCH", body:JSON.stringify({ collaboratorId, ...input }) }),
};
