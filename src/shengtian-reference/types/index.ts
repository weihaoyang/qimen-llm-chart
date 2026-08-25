export type EpistemicTag = 
  | 'FACT'          // 已证实事实 (Solid Emerald)
  | 'USER_CLAIM'    // 用户陈述 (Sky Blue)
  | 'THIRD_PARTY'   // 第三方信息 (Purple)
  | 'HYPOTHESIS'    // 假设 (Amber)
  | 'RISK'          // 风险 (Orange/Red)
  | 'OPPORTUNITY';  // 机会 (Lime/Green)

export interface EpistemicMeta {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
  downgradeTo?: EpistemicTag;
  trustDecayMultiplier: number;
}

export const EPISTEMIC_TAG_CONFIG: Record<EpistemicTag, EpistemicMeta> = {
  FACT: {
    label: '已证实事实',
    shortLabel: '事实',
    color: 'emerald',
    bgColor: 'bg-emerald-950/40',
    borderColor: 'border-emerald-500/60',
    textColor: 'text-emerald-300',
    description: '客观发生且已有书面/客观证据验证的信息。在破局模式中保持100%可信度。',
    trustDecayMultiplier: 1.0,
  },
  USER_CLAIM: {
    label: '用户陈述',
    shortLabel: '陈述',
    color: 'sky',
    bgColor: 'bg-sky-950/40',
    borderColor: 'border-sky-500/60',
    textColor: 'text-sky-300',
    description: '主观感受或口头预期，易受情绪影响。在破局模式中需重新接受压力质询。',
    downgradeTo: 'HYPOTHESIS',
    trustDecayMultiplier: 0.7,
  },
  THIRD_PARTY: {
    label: '第三方信息',
    shortLabel: '情报',
    color: 'purple',
    bgColor: 'bg-purple-950/40',
    borderColor: 'border-purple-500/60',
    textColor: 'text-purple-300',
    description: '来自外部渠道或传闻的情报。高压下可靠性显著衰减。',
    downgradeTo: 'HYPOTHESIS',
    trustDecayMultiplier: 0.5,
  },
  HYPOTHESIS: {
    label: '假设',
    shortLabel: '假设',
    color: 'amber',
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-amber-500/60',
    textColor: 'text-amber-300',
    description: '尚未验证的推论。破局模式中被强制标记为【高危/待验证】。',
    downgradeTo: 'RISK',
    trustDecayMultiplier: 0.3,
  },
  RISK: {
    label: '风险',
    shortLabel: '风险',
    color: 'red',
    bgColor: 'bg-red-950/40',
    borderColor: 'border-red-500/60',
    textColor: 'text-red-300',
    description: '明确的威胁因子。若被触发将直接威胁生存底线。',
    trustDecayMultiplier: 0.2,
  },
  OPPORTUNITY: {
    label: '机会',
    shortLabel: '机会',
    color: 'teal',
    bgColor: 'bg-teal-950/40',
    borderColor: 'border-teal-500/60',
    textColor: 'text-teal-300',
    description: '潜在有利因素。破局模式中需进行“陷阱与虚妄”审查。',
    downgradeTo: 'HYPOTHESIS',
    trustDecayMultiplier: 0.6,
  },
};

export type AssetCategory = 'FINANCIAL' | 'TIME' | 'CHIPS' | 'INFO';

export interface CardAsset {
  id: string;
  category: AssetCategory;
  title: string;
  description: string;
  tag: EpistemicTag;
  confidence: number; // 1 - 100%
  numericValue?: number;
  unit?: string;
  isAutoDowngraded?: boolean;
  downgradeReason?: string;
  isForcedDisabled?: boolean;
  forcedDisabledReason?: string;
  assignedStrategyId?: string;
  createdAt: string;
}

export interface FinancialRunway {
  availableCash: number; // 可用现金
  monthlyBurn: number;   // 每月固定支出
  monthlyIncomeWithoutClient: number; // 不含关键客户的其他月收入
  calculatedDays: number;
  alertLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export type StrategyType = 'AGGRESSIVE' | 'PROBING' | 'HEDGE';

export interface StrategyBranch {
  id: string;
  name: string;
  type: StrategyType;
  typeLabel: string;
  description: string;
  targetTimelineDay: number;
  assignedCardIds: string[];
  costDescription: string;
  successSignal: string;
  estimatedSurvivalProb: number; // 0 - 100
  status: 'PROPOSED' | 'TESTING' | 'EXECUTING' | 'ABORTED' | 'LOCKED';
}

export interface GravityNode {
  id: string;
  day: number;
  title: string;
  type: 'NOW' | 'WARNING' | 'FATAL' | 'MILESTONE';
  description: string;
  impactScore: number;
  aiDefaultPrediction: string;
}

export interface RiskBreaker {
  id: string;
  name: string;
  condition: string;
  isTriggered: boolean;
  triggeredAt?: string;
  impact: string;
  recommendedAction: string;
}

export interface InterviewMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  parameterExtracted?: {
    key: string;
    label: string;
    value: string | number;
  };
  parameterAccepted?: boolean;
  extractedFacts?: Array<{ kind: 'fact'|'assumption'|'unknown'|'goal'|'emotion'; content: string; confidence: number }>;
  extractedConstraints?: Array<{ kind: string; label: string; description: string; hard: boolean; severity: number }>;
  extractedAccepted?: boolean;
}

export interface AsymmetricStrategyPackage {
  id: 'LEVERAGE_STRIKE' | 'FIELD_SHIFT' | 'SCORCHED_EARTH';
  name: string;
  codeName: string;
  coreIdea: string;
  primaryLever: string; // 唯一支点 / 新战场 / 对手核心利益
  resourceList: string[]; // 需all-in资源
  sacrificeList: string[]; // 牺牲清单
  successSignal: string; // 成功信号
  initialFirstStep: string; // 第一步行动
  survivalProbability: number;
  coreAssetProtectionRate: number;
  estimatedCashAt30Days: number;
  estimatedCashAt60Days: number;
  ghostTimeline: {
    day: number;
    cashRunwayDays: number;
    survivalProb: number;
    customerTrust: number;
    eventLabel?: string;
    isPivotalPoint?: boolean;
    pivotalRiskDescription?: string;
  }[];
  criticalWindow: string;
  leadingIndicators: string[];
  abortCriteria: string;
}

export interface DecisionDNARecord {
  id: string;
  battlefieldTitle: string;
  timestamp: string;
  selectedStrategy: string;
  survivalOutcome: 'SURVIVED' | 'PARTIAL_SUCCESS' | 'LESSON_LEARNED';
  fatalQuestion: string;
  userReflection: string;
  extractedDNA: string[]; // e.g. ["【警惕单一客户依赖】", "【人脉信任度衰减预警】"]
}

// 维度一：人与人的连接
export type BoardRole = 'OBSERVER' | 'COMMENTATOR' | 'STRATEGIST';

export interface BoardMember {
  id: string;
  name: string;
  avatar: string;
  role: BoardRole;
  roleTitle: string;
  invitedAt: string;
  status: 'ONLINE' | 'ACTIVE' | 'PENDING';
}

export interface BoardComment {
  id: string;
  authorName: string;
  authorRole: BoardRole;
  avatar: string;
  targetType: 'CARD' | 'STRATEGY' | 'TIMELINE' | 'GENERAL';
  targetTitle: string;
  content: string;
  timestamp: string;
  upvotes: number;
}

export interface GhostStrategyBranch {
  id: string;
  creatorName: string;
  creatorRoleTitle: string;
  strategyName: string;
  coreThesis: string;
  estimatedSurvivalProb: number;
  suggestedAction: string;
  pros: string;
  cons: string;
}

export interface DecisionBoardState {
  roomId: string;
  shareToken: string;
  expiresInHours: number;
  isRedacted: boolean; // 是否启用数据脱敏 (脱敏人名公司名)
  members: BoardMember[];
  comments: BoardComment[];
  ghostStrategies: GhostStrategyBranch[];
}

export interface AnonymousCaseStudy {
  id: string;
  title: string;
  industry: string;
  authorPseudonym: string;
  difficulty: 'EXTREME' | 'HIGH' | 'MEDIUM';
  backgroundSummary: string;
  coreDilemma: string;
  timeRunway: string;
  financialStatus: string;
  choices: {
    id: string;
    name: string;
    typeLabel: string;
    description: string;
    communityChoicePercent: number;
    survivalRate: number;
    isAuthorActualChoice: boolean;
  }[];
  authorActualOutcome: string;
  keyTakeaway: string;
  totalSimulations: number;
  bountyReward: number;
}

// 维度二：人与自我的对话 (DNA图谱与反事实复盘)
export interface DecisionDNARadarMetrics {
  riskAppetite: number;     // 风险偏好 (0 - 100)
  infoRigor: number;        // 信息严谨度 / 事实依赖 (0 - 100)
  decisionSpeed: number;    // 决策果断度 / 速度 (0 - 100)
  adversityTenacity: number;// 逆境韧性 / 破局意愿 (0 - 100)
  counterIntuition: number; // 反直觉对抗力 (0 - 100)
  valueAlignment: number;   // 价值观自洽度 (0 - 100)
}

export interface CognitivePatternInsight {
  id: string;
  type: 'WINNING_FORMULA' | 'POTENTIAL_BLINDSPOT' | 'HABITUAL_BIAS';
  title: string;
  detail: string;
  evidence: string;
  actionableGuidance: string;
  createdAt: string;
}

export interface CounterfactualReviewItem {
  id: string;
  strategyName: string;
  scenarioName: string;
  hypotheticalPremise: string;
  simulatedOutcome: string;
  survivalProbability: number;
  retainedValuation: string;
  aiComparativeHindsight: string;
}

// 维度三：人与系统的共生 (静默观察者 & AI人格)
export type AIPersonaType = 'GUARDIAN' | 'VANGUARD' | 'ANALYST' | 'PHILOSOPHER';

export interface AIPersonaConfig {
  id: AIPersonaType;
  name: string;
  title: string;
  tagline: string;
  accentColor: string;
  avatarIcon: string;
  biasTendency: string;
  interviewGreeting: string;
  breakthroughCritiqueTone: string;
}

export interface SilentObserverAlert {
  id: string;
  source: 'CALENDAR' | 'TRELLO' | 'EMAIL' | 'CODE_REPO';
  sourceTitle: string;
  detectedAnomaly: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
  suggestedBattlefieldDraft: {
    title: string;
    dilemma: string;
    deadlineDays: number;
    initialConfidence: number;
  };
  isDismissed: boolean;
}

// 维度四：价值的流动与转化 (通证经济 & 技能市场)
export interface EquityTransaction {
  id: string;
  type: 'EARN_CASE_SHARED' | 'EARN_ADVISORY' | 'SPEND_WAR_ROOM' | 'SPEND_BOUNTY' | 'SPEND_TEMPLATE';
  amount: number;
  title: string;
  timestamp: string;
}

export interface SkillMarketplaceItem {
  id: string;
  type: 'TEMPLATE' | 'AI_KNOWLEDGE_PACK';
  title: string;
  author: string;
  authorTitle: string;
  price: number; // 消耗权益点数
  rating: number;
  downloads: number;
  tags: string[];
  description: string;
  includes: string[];
  isOwned?: boolean;
}

// 维度五：超越逻辑的维度 (情绪仪表盘 / 价值观校准器 / 术数观天时)
export interface EmotionalTelemetry {
  energy: number;       // 精力值 0 - 100
  stress: number;       // 压力水平 0 - 100
  confidence: number;   // 决策信心 0 - 100
  recentLoggedDate: string;
  historyLogs: {
    date: string;
    energy: number;
    stress: number;
    confidence: number;
    note: string;
  }[];
  aiStressInsight: string;
}

export interface CoreValueItem {
  id: string;
  name: string;
  keyword: string;
  description: string;
  rank: number; // 1 to 5
}

export interface ValueCalibratorState {
  coreValues: CoreValueItem[];
  strategyAlignmentAudit: {
    strategyId: string;
    strategyName: string;
    alignmentScore: number; // 0 - 100%
    clashDescription: string;
    isEthicalConflict: boolean;
  }[];
}

export interface MetaphysicsTimingState {
  isViewed: boolean;
  solarTerm: string;
  lunarDate: string;
  qiMenChart: {
    gong: string;
    door: string;     // 开门、生门、休门、伤门、杜门、景门、死门、惊门
    star: string;     // 天辅、天禽、天任、天冲...
    deity: string;    // 直符、螣蛇、太阴、六合...
    elementEnergy: string;
  };
  symbolicReflection: string;
}

// 全局战局核心数据结构
export interface BattlefieldState {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  currentDay: number;
  targetDeadlineDays: number;
  idealOutcome: string;
  bottomLine: string;
  confidence: number;
  keyActors: string[];
  
  financials: FinancialRunway;
  assets: CardAsset[];
  gravityNodes: GravityNode[];
  strategies: StrategyBranch[];
  riskBreakers: RiskBreaker[];
  interviewHistory: InterviewMessage[];
  
  // Breakthrough mode state
  breakthroughActive: boolean;
  breakthroughPhase: 1 | 2 | 3 | 4;
  forcedWorstCaseActive: boolean;
  breakthroughConfirmedTruths?: Record<string, boolean>;
  lockedAsymmetricStrategyId?: 'LEVERAGE_STRIKE' | 'FIELD_SHIFT' | 'SCORCHED_EARTH';
  cognitiveBiasesDetected: string[];
  redTeamLog: {
    id: string;
    userDraft: string;
    redTeamCritique: string;
    biasWarning?: string;
    failureProbability: number;
    timestamp: string;
  }[];

  // 扩展生态状态
  selectedPersona: AIPersonaType;
  emotionalTelemetry: EmotionalTelemetry;
  valueCalibrator: ValueCalibratorState;
  metaphysicsTiming: MetaphysicsTimingState;
  decisionBoard: DecisionBoardState;
}

// ----------------------------------------------------
// Aethel 核心模块类型规范 (PRD Specification Types)
// ----------------------------------------------------

export interface DeciderSigil {
  id: string;
  name: string; // e.g. 【深潜的利维坦】
  codeName: string;
  archetype: 'LEVIATHAN' | 'ARCHIMEDES' | 'PROMETHEUS' | 'WEAVER' | 'SENTINEL' | 'CHRONOS';
  description: string;
  geometricSeed: number;
  primaryGeometry: 'HEXAGRAM' | 'HYPERCUBE' | 'VECTOR_FIBONACCI' | 'METATRON' | 'VESICA_PISCIS';
  nodesCount: number;
  circuitDensity: number;
  glowColor: string;
  secondaryColor: string;
  forgedAt: string;
  behaviorMetrics: {
    decisionSpeedSec: number;
    riskPreference: 'CONSERVATIVE' | 'ASYMMETRIC_AGGRESSIVE' | 'PROBABILISTIC' | 'ETHICAL_FIRST';
    resourceAllInRatio: number;
    cognitiveRigorScore: number;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  sigil?: DeciderSigil;
  aiPersona: AIPersonaType;
  isCalibrated: boolean;
  totalSimulations: number;
  singularitySuccessRate: number;
  favoriteStrategyType: string;
  equityBalance: number;
  achievements: {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt?: string;
    isSecret?: boolean;
  }[];
}

export interface CalibrationQuestion {
  id: number;
  question: string;
  scenario: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    text: string;
    philosophicalBias: string;
    targetPersona: AIPersonaType;
  }[];
}

export interface CausalGraphNode {
  id: string;
  label: string;
  category: 'FACT' | 'ANCHOR' | 'VARIABLE' | 'SINGULARITY' | 'TRAP';
  probability: number;
  gravityWeight: number; // 宿命收束权重
  x: number;
  y: number;
  z: number;
  description: string;
  status: 'DEFAULT' | 'TARGETED' | 'DISRUPTED' | 'COLLAPSED';
}

export interface CausalGraphEdge {
  source: string;
  target: string;
  strength: number;
  isFatalCollapseLine?: boolean;
}

export interface SingularityDeductionState {
  alphaProbability: number; // 0.0000 - 1.0000 (精确至小数点后4位)
  previousAlpha: number;
  isWarningState: boolean; // 接近 50%
  isHorizonBreached: boolean; // 突破 50% (金色绽放)
  observerFogIntensity: number; // 0 (无雾) - 1.0 (重度观测者迷雾)
  competingObserversCount: number;
  singularityTargetNodeId: string;
  rippleSequence: {
    step: number;
    title: string;
    description: string;
    leverageAction: string;
    status: 'PENDING' | 'EXECUTING' | 'COMPLETED';
    alphaGain: number;
  }[];
}

export interface WorldPulseEvent {
  id: string;
  code: string;
  title: string;
  region: string;
  lat: number;
  lng: number;
  riddleDescription: string;
  severity: 'GLOBAL_CRITICAL' | 'FINANCIAL_SINGULARITY' | 'TECH_COLLAPSE';
  equityCostToIntervene: number;
  activeObservers: number;
  status: 'ACTIVE' | 'RESOLVING' | 'COLLAPSED';
  expiresInMins: number;
}

export interface DeepArchiveItem {
  id: string;
  codeName: string;
  historicEventTitle: string;
  year: string;
  location: string;
  summary: string;
  keyDilemma: string;
  finalRippleSequence: string[];
  historicalSigilName: string;
  historicalAlphaRate: number;
  isUnlocked: boolean;
  unlockCostEquity: number;
}

export interface SubscriptionTier {
  id: 'MONTHLY' | 'ANNUAL' | 'OBSERVER_BLACK';
  name: string;
  price: string;
  period: string;
  equityPerMonth: number;
  features: string[];
  badge?: string;
  isPopular?: boolean;
}

// ----------------------------------------------------
// 四大终极神级拼图类型定义 (Ultimate 4 Masterpiece Puzzles)
// ----------------------------------------------------

// 1. 第一块拼图：后果的重量 - 现实回响 (Reality Echoes)
export interface CausalDustOption {
  id: string;
  action: string;
  outcomeProb: number;
  costEquity: number;
  rewardDesc: string;
  actionExplanation: string;
}

export interface CausalDustEvent {
  id: string;
  title: string;
  sourceSingularity: string;
  description: string;
  collateralType: 'TECH_ABUSE' | 'REPUTATION_FALLOUT' | 'REGULATORY_SCRUTINY' | 'COMPETITOR_BACKLASH' | 'TALENT_POACHING';
  collateralTypeName: string;
  severity: 'HIGH' | 'MEDIUM' | 'MILD';
  options: CausalDustOption[];
  status: 'PENDING' | 'RESOLVED';
  resolvedOptionId?: string;
  resolvedAt?: string;
  resolutionFeedback?: string;
}

export interface RealityEcho {
  id: string;
  battlefieldId: string;
  battlefieldTitle: string;
  singularityStrategyName: string;
  createdAt: string;
  echoPeriodDays: number;
  remainingDays: number;
  equilibriumStatus: 'UNSTABLE_ECHO' | 'EQUILIBRIUM_REACHED';
  equilibriumProgress: number; // 0 - 100%
  causalDustEvents: CausalDustEvent[];
  finalRewardUnlocked: boolean;
  rewardClaimStatus?: 'unrequested' | 'pending_platform' | 'credited' | 'rejected';
  finalRewardEquity: number;
  postDeductionNarrative: string;
}

// 2. 第二块拼图：组织的崛起 - 观测者密会 (Observer Conclaves)
export interface ConclaveMember {
  id: string;
  name: string;
  avatar: string;
  role: 'GRAND_MASTER' | 'STRATEGIST' | 'ACOLYTE';
  roleTitle: string;
  sigilName: string;
  equityContributed: number;
  joinedAt: string;
  isUser?: boolean;
}

export interface CollectiveSimulationSession {
  id: string;
  eventTitle: string;
  eventSeverity: 'GLOBAL_CRITICAL' | 'FINANCIAL_SINGULARITY' | 'TECH_COLLAPSE';
  participantsCount: number;
  pooledEquity: number;
  alphaProbability: number;
  status: 'CONVERGING' | 'RESOLVED' | 'UNDER_FOG';
  targetDeadlineHours: number;
  synchronizedActions: {
    memberRole: string;
    actionName: string;
    impactAlpha: number;
    executedAt: string;
  }[];
}

export interface ObserverConclave {
  id: string;
  name: string;
  codeName: string;
  sigilIcon: string;
  glowColor: string;
  doctrine: string; // 组织信条 / 箴言
  level: number;
  founderName: string;
  membersCount: number;
  maxMembers: number;
  collectiveEquityPool: number;
  intervenedWorldEventsCount: number;
  globalRank: number;
  isUserMember: boolean;
  userRole?: 'GRAND_MASTER' | 'STRATEGIST' | 'ACOLYTE';
  collectiveSigil?: DeciderSigil;
  activeCollectiveSimulations: CollectiveSimulationSession[];
  members: ConclaveMember[];
  recentAnnouncements: {
    id: string;
    title: string;
    content: string;
    timestamp: string;
  }[];
}

// 3. 第三块拼图：终极的向往 - 执政官阶层 (The Archon Tier)
export interface PrecognitionEvent {
  id: string;
  code: string;
  title: string;
  forecastWindowDays: number;
  probabilityToTrigger: number;
  leadingSigns: string[];
  potentialImpact: string;
  precognitionConfidence: number;
  preventativeStrategySuggestion: string;
}

export interface ArchonArchiveAnnotation {
  id: string;
  archiveId: string;
  archiveTitle: string;
  archonLemma: string; // 执政官因果引理
  authorArchonName: string;
  authorSigil: string;
  createdAt: string;
  upvotes: number;
  isVerifiedByAethel: boolean;
}

export interface ArchonRealityProposal {
  id: string;
  title: string;
  crisisType: string;
  industry: string;
  backgroundDilemma: string;
  status: 'SUBMITTED' | 'PEER_REVIEW' | 'BROADCASTED_WORLDWIDE';
  submittedAt: string;
  bountyEquityReward: number;
  observersIntervenedCount: number;
  communitySuccessRate: number;
}

export interface ArchonTierState {
  isUnlocked: boolean;
  archonRankTitle: string;
  archonSealsCount: number;
  promotionRequirements: {
    singularityVictories: { current: number; required: number; met: boolean };
    conclaveGlobalRank: { current: number; required: number; met: boolean };
    unsolvableArchiveSolved: { current: number; required: number; met: boolean };
  };
  privileges: {
    precognition: boolean;
    archiveAnnotation: boolean;
    realityProposal: boolean;
  };
  precognitionEvents: PrecognitionEvent[];
  archiveAnnotations: ArchonArchiveAnnotation[];
  userProposals: ArchonRealityProposal[];
}

// 4. 第四块拼图：情感的纽带 - AI共生体 (The AI Symbiote)
export interface SymbioteLongTermMemory {
  id: string;
  crisisTitle: string;
  userKeyChoice: string;
  outcome: 'VICTORY' | 'SACRIFICE' | 'TRAP_FALL';
  outcomeLabel: string;
  memoryQuote: string;
  lessonLearned: string;
  timestamp: string;
}

export interface AISymbioteState {
  id: string;
  customName: string;
  personaType: AIPersonaType;
  bondLevel: number; // 1 - 10
  bondExp: number;
  maxBondExp: number;
  evolutionStage: 'AWAKENED' | 'RESONATING' | 'SYMBIOTIC' | 'TRANSCENDENT';
  evolutionStageName: string;
  temperament: 'SHARP_AGGRESSIVE' | 'CAUTIOUS_DEEP' | 'METAPHYSICAL_VISIONARY' | 'COLD_CALCULATING';
  temperamentName: string;
  dialogueTendency: string;
  adaptiveToneNotes: string;
  recentQuoteUsed?: string;
  totalBattlesFoughtTogether: number;
  victoriesTogether: number;
  longTermMemories: SymbioteLongTermMemory[];
}
