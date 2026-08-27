export const BATTLE_STATUSES = ["intake", "active", "committed", "monitoring", "review", "closed", "archived"] as const;
export type BattleStatus = (typeof BATTLE_STATUSES)[number];

export const FACT_KINDS = ["fact", "assumption", "unknown", "goal", "emotion"] as const;
export type BattleFactKind = (typeof FACT_KINDS)[number];
export type FactSource = "user" | "attachment" | "system" | "ai";

export const CONSTRAINT_KINDS = ["cash", "time", "energy", "legal", "contract", "health", "relationship", "reputation", "privacy", "other"] as const;
export type ConstraintKind = (typeof CONSTRAINT_KINDS)[number];

export const INVENTORY_CATEGORIES = ["cash", "time", "skill", "asset", "information", "relationship", "credential", "channel", "other"] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];
export type InventoryAvailability = "available" | "limited" | "blocked" | "expired";

export const JUNCTION_KINDS = ["fact", "decision", "resource", "relationship", "rule_change", "opportunity", "risk", "junction", "action", "result"] as const;
export type TimelineNodeKind = (typeof JUNCTION_KINDS)[number];
export type TruthStatus = "observed" | "assumed" | "projected" | "verified" | "rejected";

export const MOVE_KINDS = ["strong_attack", "probe", "hedge"] as const;
export type MoveKind = (typeof MOVE_KINDS)[number];
export type MoveState = "draft" | "selected" | "executing" | "verified" | "stopped" | "rejected";

export type Battle = {
  id: string;
  title: string;
  objective: string;
  minimumOutcome: string;
  idealOutcome: string;
  opponentSummary: string;
  status: BattleStatus;
  hardDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  scenarioId?: string | null;
  scenarioVersion?: number | null;
  sourceType?: "user_created" | "official_catalog" | "legacy_import";
  accessRole?: "owner" | "viewer" | "contributor" | "advisor";
};

export type BattleFact = {
  id: string;
  battleId: string;
  kind: BattleFactKind;
  content: string;
  source: FactSource;
  confidence: number;
  occurredAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

export type BattleConstraint = {
  id: string;
  battleId: string;
  kind: ConstraintKind;
  label: string;
  description: string;
  hard: boolean;
  severity: number;
  threshold: Record<string, unknown>;
  source: Record<string, unknown>;
};

export type InventoryItem = {
  id: string;
  battleId: string;
  category: InventoryCategory;
  label: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  availability: InventoryAvailability;
  expiresAt: string | null;
  cost: Record<string, unknown>;
  evidence: Record<string, unknown>;
};

export type GravityLine = {
  version: number;
  summary: string;
  assumptions: string[];
  expectedOutcome: string;
  resourceCost: Record<string, unknown>;
  failureReasons: string[];
  confidence: number;
  source: Record<string, unknown>;
};

export type OppositionScan = {
  pressurePoints: string[];
  leverageOpenings: string[];
  unknowns: string[];
  ethicalBoundary: string;
  confidence: number;
};

export type TimelineNode = {
  id: string;
  battleId: string;
  kind: TimelineNodeKind;
  title: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  truthStatus: TruthStatus;
  importance: number;
  source: Record<string, unknown>;
};

export type TimelineEdge = {
  id: string;
  battleId: string;
  fromNodeId: string;
  toNodeId: string;
  relation: TimelineRelation;
  confidence: number;
  evidence: Record<string, unknown>;
};
export const TIMELINE_RELATIONS = ["causes", "accelerates", "blocks", "depends_on", "conflicts", "repeats", "verifies", "inherits", "transmits", "counterfactual"] as const;
export type TimelineRelation = (typeof TIMELINE_RELATIONS)[number];

export type Opportunity = {
  id: string;
  battleId: string;
  title: string;
  description: string;
  source: Record<string, unknown>;
  opensAt: string | null;
  bestActionAt: string | null;
  closesAt: string | null;
  decay: Record<string, unknown>;
  status: "open" | "watching" | "acted" | "missed" | "closed";
};

export type BattleReview = {
  id: string;
  battleId: string;
  commitmentId: string | null;
  outcome: string;
  facts: string;
  whatChanged: string;
  diagnosis: Record<string, unknown>;
  nextAdjustment: string;
  reviewedAt: string;
};

export type StrategyProfile = {
  version: number;
  profile: Record<string, unknown>;
  updatedAt: string;
};

export const COLLABORATOR_ROLES = ["viewer", "contributor", "advisor", "owner"] as const;
export type CollaboratorRole = (typeof COLLABORATOR_ROLES)[number];
export type Collaborator = { id:string; battleId:string; subjectType:string; subjectId:string; role:CollaboratorRole; status:"invited"|"active"|"revoked"; permissions:Record<string,unknown>; expiresAt:string|null; createdAt:string; updatedAt:string };
export type ResourceAllocation = { id:string; battleId:string|null; label:string; resourceKind:"cash"|"hours"|"energy"|"credit"; amount:number; unit:string; startsAt:string|null; endsAt:string|null; priority:number; status:"planned"|"committed"|"released"|"cancelled"; source:Record<string,unknown> };
export type PlaybookEntry = { id:string; battleId:string|null; visibility:"private"|"anonymous_pool"; category:string; pattern:string; adjustment:string; evidenceCount:number; source:Record<string,unknown>; createdAt:string };
export type CalibrationEvent = { id:string; battleId:string|null; commitmentId:string|null; dimension:"information"|"reasoning"|"resource"|"time"|"risk"|"execution"|"relationship"; expected:number|null; actual:number|null; error:number|null; note:string; createdAt:string };

export const ADVICE_STATUSES = ["proposed","accepted","rejected","withdrawn"] as const;
export type AdviceStatus = (typeof ADVICE_STATUSES)[number];
export const ADVICE_ADOPTIONS = ["fact","action","reference"] as const;
export type AdviceAdoption = (typeof ADVICE_ADOPTIONS)[number];
export type BattleAdvice = {
  id:string;
  battleId:string;
  authorSubjectType:string;
  authorSubjectId:string;
  targetType:"battle"|"fact"|"junction"|"move"|"commitment"|"review";
  targetId:string|null;
  opinion:string;
  rationale:string;
  uncertainty:string;
  source:Record<string,unknown>;
  status:AdviceStatus;
  adoptedAs:AdviceAdoption|null;
  adoptedRecordId:string|null;
  adoptedAt:string|null;
  createdAt:string;
  updatedAt:string;
};

export type BattleAttachment = {
  id:string;
  battleId:string;
  targetType:"battle"|"fact"|"node"|"move"|"action"|"review";
  targetId:string|null;
  filename:string;
  mediaType:string;
  storageKey:string;
  byteSize:number;
  checksum:string|null;
  source:Record<string,unknown>;
  createdAt:string;
};

export type Junction = {
  id: string;
  battleId: string;
  title: string;
  description: string;
  windowStart: string | null;
  windowEnd: string | null;
  halfLifeAt: string | null;
  coreVariable: string;
  defaultConsequence: string;
  urgency: number;
  leverage: number;
  irreversibility: number;
  status: "open" | "selected" | "expired" | "resolved";
  source: Record<string, unknown>;
};

export type Move = {
  id: string;
  battleId: string;
  junctionId: string | null;
  version: number;
  kind: MoveKind;
  title: string;
  keyVariable: string;
  rationale: string;
  actions: Array<{ title: string; description: string; owner: string; dueAt: string | null }>;
  cost: Record<string, unknown>;
  upside: Record<string, unknown>;
  failureCost: Record<string, unknown>;
  validation: Record<string, unknown>;
  stop: Record<string, unknown>;
  assumptions: string[];
  source: Record<string, unknown>;
  state: MoveState;
};

export type Breaker = {
  id: string;
  moveId: string;
  kind: "cash" | "time" | "relationship" | "energy" | "legal" | "assumption" | "opportunity";
  label: string;
  threshold: Record<string, unknown>;
  actionOnTrigger: string;
  enabled: boolean;
  triggeredAt: string | null;
};

export type ResourceSnapshot = {
  cashAvailable?: number;
  monthlyFixedCost?: number;
  monthlyNetCashflow?: number;
  weeklyHoursAvailable?: number;
  weeklyHoursCommitted?: number;
  consecutiveHighPressureDays?: number;
  maxHighPressureDays?: number;
};

export type BattleInput = {
  objective: string;
  minimumOutcome?: string;
  idealOutcome?: string;
  opponentSummary?: string;
  hardDeadline?: string | null;
  facts?: BattleFact[];
  constraints?: BattleConstraint[];
  inventory?: InventoryItem[];
  resourceSnapshot?: ResourceSnapshot;
};
