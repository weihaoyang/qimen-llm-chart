import type { BattleConstraint, BattleFact, BattleInput, GravityLine, InventoryItem, Junction, Move, MoveKind, OppositionScan, ResourceSnapshot } from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const daysBetween = (from: Date, to: Date) => Math.max(0, (to.getTime() - from.getTime()) / 86_400_000);

export const classifyRealityInput = (value: string, source: BattleFact["source"] = "user"): BattleFact["kind"] => {
  const normalized = value.trim();
  if (!normalized) return "unknown";
  if (source === "ai") return "assumption";
  if (/我希望|目标是|想要|最好|至少|最低/.test(normalized)) return "goal";
  if (/担心|害怕|焦虑|不甘|愤怒|希望/.test(normalized)) return "emotion";
  if (/可能|大概|猜测|应该|也许|如果/.test(normalized)) return "assumption";
  return "fact";
};

export const calculateRunwayDays = (snapshot: ResourceSnapshot = {}): number | null => {
  const cash = snapshot.cashAvailable;
  const monthlyCost = snapshot.monthlyFixedCost;
  if (!Number.isFinite(cash) || !Number.isFinite(monthlyCost) || (monthlyCost ?? 0) <= 0) return null;
  return Math.max(0, Math.round((cash! / monthlyCost!) * 30));
};

const summarizeResources = (snapshot: ResourceSnapshot, inventory: InventoryItem[]) => {
  const runway = calculateRunwayDays(snapshot);
  const hours = Number.isFinite(snapshot.weeklyHoursAvailable) && Number.isFinite(snapshot.weeklyHoursCommitted)
    ? `${Math.max(0, (snapshot.weeklyHoursAvailable ?? 0) - (snapshot.weeklyHoursCommitted ?? 0))} 小时/周可投入`
    : "时间预算未量化";
  const available = inventory.filter((item) => item.availability === "available").map((item) => item.label).slice(0, 5);
  return [runway === null ? "现金跑道未量化" : `现金跑道约 ${runway} 天`, hours, available.length ? `可调用筹码：${available.join("、")}` : "可调用筹码尚未登记"];
};

export const buildOppositionScan = (input: BattleInput): OppositionScan => {
  const pressurePoints: string[] = [];
  const leverageOpenings: string[] = [];
  const unknowns: string[] = [];
  const opponent = input.opponentSummary?.trim();
  if (opponent) pressurePoints.push(`外部重力来源：${opponent}`);
  else unknowns.push("对手/规则来源尚未结构化，无法判断真正的决策权与激励");
  const hardConstraints = (input.constraints ?? []).filter((item) => item.hard);
  if (hardConstraints.length) pressurePoints.push(`不可绕过边界：${hardConstraints.map((item) => item.label).slice(0, 4).join("、")}`);
  const available = (input.inventory ?? []).filter((item) => item.availability === "available");
  if (available.some((item) => ["information", "channel", "relationship", "skill"].includes(item.category))) leverageOpenings.push(`可用非对称筹码：${available.filter((item) => ["information", "channel", "relationship", "skill"].includes(item.category)).map((item) => item.label).slice(0, 5).join("、")}`);
  if (input.hardDeadline) leverageOpenings.push("硬期限本身是筛选器：优先做能在期限前产生独立反馈的低成本动作");
  else unknowns.push("硬期限未量化，等待的代价无法计算");
  const factUnknowns = (input.facts ?? []).filter((item) => item.kind === "unknown" || item.kind === "assumption").map((item) => item.content).slice(0, 5);
  unknowns.push(...factUnknowns);
  if (!leverageOpenings.length) leverageOpenings.push("尚未发现可验证的局部杠杆，先补齐信息或筹码，不建议正面消耗");
  return {
    pressurePoints,
    leverageOpenings,
    unknowns: [...new Set(unknowns)],
    ethicalBoundary: "只分析公开、合法、职业伦理范围内的激励、流程和信息差；不生成欺骗、胁迫、非法取证或规避监管建议。",
    confidence: clamp(35 + (opponent ? 20 : 0) + hardConstraints.length * 8 + available.length * 4 - unknowns.length * 4),
  };
};

export const buildDefaultGravityLine = (input: BattleInput, now = new Date()): GravityLine => {
  const facts = (input.facts ?? []).filter((fact) => fact.kind === "fact" && fact.source !== "ai").map((fact) => fact.content).slice(-5);
  const hardConstraints = (input.constraints ?? []).filter((constraint) => constraint.hard).map((constraint) => constraint.label).slice(0, 5);
  const resourceSummary = summarizeResources(input.resourceSnapshot ?? {}, input.inventory ?? []);
  const runway = calculateRunwayDays(input.resourceSnapshot);
  const deadlineDays = input.hardDeadline ? daysBetween(now, new Date(input.hardDeadline)) : null;
  const assumptions = [
    "不新增关键资源，不改变外部规则",
    "继续采用当前主路径和现有执行节奏",
    ...facts.map((fact) => `已知事实保持不变：${fact}`),
  ];
  if (hardConstraints.length) assumptions.push(`硬约束持续存在：${hardConstraints.join("、")}`);
  const pressure = [
    runway !== null && runway <= 30 ? "现金跑道短，常规长期打法会先耗尽生存资源" : "现有资源不足以支持无限期试错",
    deadlineDays !== null && deadlineDays <= 14 ? "硬期限临近，等待会直接压缩可选路径" : "时间窗口尚未量化，不能把等待当成免费选项",
    hardConstraints.length ? `硬约束会把部分常规路径直接排除：${hardConstraints.join("、")}` : "尚未建立完整硬约束清单",
  ];
  const oppositionScan = buildOppositionScan(input);
  return {
    version: 1,
    summary: `如果不改变关键变量，继续常规路径：${pressure.join("；")}。结果只能作为基准情景，不能当作预言。`,
    assumptions,
    expectedOutcome: input.minimumOutcome ? `至少需要守住：${input.minimumOutcome}` : "大概率只能维持现状或进入资源进一步收缩的状态。",
    resourceCost: { runwayDays: runway, summary: resourceSummary },
    failureReasons: pressure,
    confidence: clamp(45 + facts.length * 7 + hardConstraints.length * 6 - (deadlineDays === null ? 10 : 0)),
    source: { type: "deterministic", facts: facts.length, constraints: hardConstraints.length, generatedAt: now.toISOString(), oppositionScan },
  };
};

const hasConstraint = (constraints: BattleConstraint[], kinds: BattleConstraint["kind"][]) => constraints.some((constraint) => constraint.hard && kinds.includes(constraint.kind));

export const detectJunctions = (input: BattleInput, now = new Date()): Junction[] => {
  const constraints = input.constraints ?? [];
  const inventory = input.inventory ?? [];
  const deadline = input.hardDeadline ? new Date(input.hardDeadline) : null;
  const runway = calculateRunwayDays(input.resourceSnapshot);
  const result: Junction[] = [];
  if (deadline && Number.isFinite(deadline.getTime())) {
    const days = daysBetween(now, deadline);
    if (days <= 30) {
      result.push({ id: "deadline", battleId: "", title: "硬期限交叉点", description: `距离必须决策只剩 ${Math.ceil(days)} 天。等待会直接减少可行路径。`, windowStart: now.toISOString(), windowEnd: deadline.toISOString(), halfLifeAt: new Date(now.getTime() + Math.max(0, days * 0.35) * 86_400_000).toISOString(), coreVariable: "在期限前完成一次能改变信息或资源的动作", defaultConsequence: "继续观望将进入更窄的默认路径", urgency: days <= 7 ? 5 : 4, leverage: 4, irreversibility: 4, status: "open", source: { type: "deadline", days } });
    }
  }
  if (runway !== null && runway <= 45) {
    result.push({ id: "cash-runway", battleId: "", title: "现金跑道交叉点", description: `当前现金跑道约 ${runway} 天，长期常规打法会把生存资源消耗在等待上。`, windowStart: now.toISOString(), windowEnd: new Date(now.getTime() + runway * 86_400_000).toISOString(), halfLifeAt: new Date(now.getTime() + Math.max(1, runway * 0.25) * 86_400_000).toISOString(), coreVariable: "在现金断裂前换取收入、信息或可复用筹码", defaultConsequence: "现金跑道耗尽后，被迫接受更差的选择", urgency: runway <= 14 ? 5 : 4, leverage: 5, irreversibility: 5, status: "open", source: { type: "cash-runway", runwayDays: runway } });
  }
  if (hasConstraint(constraints, ["legal", "contract", "health"])) {
    result.push({ id: "hard-boundary", battleId: "", title: "不可逆边界交叉点", description: "法律、合同或健康边界正在限制可接受的打法，不能用更大投入掩盖边界问题。", windowStart: now.toISOString(), windowEnd: null, halfLifeAt: null, coreVariable: "先确认边界，再决定是否继续投入", defaultConsequence: "越过边界会把可逆问题变成不可逆损失", urgency: 5, leverage: 4, irreversibility: 5, status: "open", source: { type: "hard-constraint" } });
  }
  if (inventory.some((item) => item.availability === "limited" && item.expiresAt)) {
    const expiring = inventory.find((item) => item.availability === "limited" && item.expiresAt)?.expiresAt ?? null;
    result.push({ id: "scarce-asset", battleId: "", title: "稀缺筹码交叉点", description: "至少一项有限筹码即将失效，必须决定是立即试局还是保留。", windowStart: now.toISOString(), windowEnd: expiring, halfLifeAt: null, coreVariable: "把稀缺筹码用在能产生新选择权的位置", defaultConsequence: "筹码失效后只能回到常规路径", urgency: 4, leverage: 5, irreversibility: 3, status: "open", source: { type: "scarce-inventory" } });
  }
  return result;
};

const baseMove = (kind: MoveKind, title: string, keyVariable: string, rationale: string, assumptions: string[]): Omit<Move, "id" | "battleId" | "junctionId" | "version" | "state"> => ({ kind, title, keyVariable, rationale, actions: [], cost: {}, upside: {}, failureCost: {}, validation: {}, stop: {}, assumptions, source: { type: "deterministic-template" } });

export const buildMoveTemplates = (input: BattleInput, gravity: GravityLine, junction: Junction): Array<Omit<Move, "id" | "battleId" | "junctionId" | "version" | "state">> => {
  const runway = calculateRunwayDays(input.resourceSnapshot);
  const common = [`交叉点核心变量：${junction.coreVariable}`, `默认重力线：${gravity.summary}`];
  const dueAt = junction.halfLifeAt ?? junction.windowEnd;
  const action = (title: string, description: string) => [{ title, description, owner: "执行人待定", dueAt }];
  return [
    { ...baseMove("strong_attack", "强攻手 · 单点击穿", junction.coreVariable, "集中有限筹码，只打一个能改变局面且有明确反馈的缺口；主动放弃次要战线。", common), actions: action("完成单点压强动作", `围绕“${junction.coreVariable}”集中投入，放弃次要战线，并在期限前记录可核验反馈。`,), cost: { resourceConcentration: "high", opportunityCost: "放弃至少两条次要战线" }, upside: { controlDelta: "high", choiceExpansion: "high", choiceDeltaIndex: 0.5 }, failureCost: { maxLoss: runway !== null ? `不得超过 ${Math.max(1, Math.floor(runway * 0.25))} 天跑道` : "必须预先限定最大投入" }, validation: { deadline: junction.halfLifeAt, successSignal: "关键变量出现可验证的积极变化" }, stop: { condition: "关键变量在两次检查中未改善", action: "立即切换对冲手" }, assumptions: common },
    { ...baseMove("probe", "试局手 · 低成本探针", junction.coreVariable, "先做一个可逆的小动作，验证最关键的假设，不把全部筹码押在叙事上。", common), actions: action("发出低成本验证探针", `用可承受且可回收的最小成本测试“${junction.coreVariable}”，记录对方或环境的独立反馈。`,), cost: { resourceConcentration: "low", opportunityCost: "延后部分主行动" }, upside: { controlDelta: "medium", choiceExpansion: "high", choiceDeltaIndex: 0.35 }, failureCost: { maxLoss: "探针成本必须可承受且可回收" }, validation: { deadline: junction.halfLifeAt, successSignal: "获得独立、可重复核验的信号" }, stop: { condition: "探针结果证伪核心假设", action: "停止扩大投入并更新重力线" }, assumptions: common },
    { ...baseMove("hedge", "对冲手 · 锁定底线", junction.coreVariable, "承认当前主战场不确定或不可承受，先保住现金、健康、合同与下一次选择权。", common), actions: action("锁定底线与替代路径", `先保护现金、健康、合同和下一次选择权，明确在何种条件下重新进入试局。`,), cost: { resourceConcentration: "low", opportunityCost: "放弃部分即时上行" }, upside: { controlDelta: "low", choiceExpansion: "medium", downsideProtection: "high", choiceDeltaIndex: 0.2 }, failureCost: { maxLoss: "不允许突破硬约束" }, validation: { deadline: junction.windowEnd, successSignal: "底线资源得到保护且替代路径可用" }, stop: { condition: "保护成本超过底线或外部条件改善", action: "重新进入试局" }, assumptions: common },
  ];
};

export const evaluateBreaker = (breaker: { kind: string; threshold: Record<string, unknown>; enabled: boolean }, context: { runwayDays?: number | null; daysToDeadline?: number | null; hardConstraintBreached?: boolean; assumptionDisproved?: boolean; highPressureDays?: number }): { triggered: boolean; reason: string } => {
  if (!breaker.enabled) return { triggered: false, reason: "断路器已禁用" };
  if (breaker.kind === "cash" && typeof breaker.threshold.maxRunwayDays === "number" && context.runwayDays !== null && context.runwayDays !== undefined && context.runwayDays <= breaker.threshold.maxRunwayDays) return { triggered: true, reason: `现金跑道已低于 ${breaker.threshold.maxRunwayDays} 天` };
  if (breaker.kind === "time" && typeof breaker.threshold.minDaysToDeadline === "number" && context.daysToDeadline !== null && context.daysToDeadline !== undefined && context.daysToDeadline <= breaker.threshold.minDaysToDeadline) return { triggered: true, reason: `距离硬期限不足 ${breaker.threshold.minDaysToDeadline} 天` };
  if (breaker.kind === "legal" && context.hardConstraintBreached) return { triggered: true, reason: "检测到不可越过的法律/合同/健康边界" };
  if (breaker.kind === "assumption" && context.assumptionDisproved) return { triggered: true, reason: "核心假设已被事实证伪" };
  if (breaker.kind === "energy" && typeof breaker.threshold.maxHighPressureDays === "number" && (context.highPressureDays ?? 0) >= breaker.threshold.maxHighPressureDays) return { triggered: true, reason: `高压连续天数已达到 ${breaker.threshold.maxHighPressureDays} 天` };
  return { triggered: false, reason: "断路条件尚未满足" };
};
