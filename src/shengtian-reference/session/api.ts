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
  clone: (scenarioId:string) => request<{ battle:{ battleId:string } }>(`/api/scenarios/${scenarioId}/clone`, { method:"POST", body:JSON.stringify({}) }),
  create: (input: Record<string, unknown>) => request<{ battle: SessionBattle }>("/api/battles", { method:"POST", body:JSON.stringify(input) }),
  module: (battleId:string, moduleId:string) => request<{ state: unknown }>(`/api/battles/${battleId}/modules/${moduleId}`),
  saveModule: (battleId:string, moduleId:string, state:unknown, consent:unknown = {}) => request<{ state: unknown }>(`/api/battles/${battleId}/modules/${moduleId}`, { method:"PUT", body:JSON.stringify({ state, consent }) }),
  ai: (battleId:string, kind:string, body:Record<string, unknown>) => request<{ job: unknown; usage?: unknown }>(`/api/battles/${battleId}/ai/${kind}`, { method:"POST", body:JSON.stringify(body) }),
};
