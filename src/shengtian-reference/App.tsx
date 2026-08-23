/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  CausalWorkshopView 
} from './components/StandardMode/CausalWorkshopView';
import { 
  SingularityDeductionView 
} from './components/Singularity/SingularityDeductionView';
import { 
  CalibrationFlow 
} from './components/Onboarding/CalibrationFlow';
import { 
  WorldPulseView 
} from './components/Ecosystem/WorldPulseView';
import { 
  DeepArchivesModal 
} from './components/Ecosystem/DeepArchivesModal';
import { 
  EquityStoreModal 
} from './components/Ecosystem/EquityStoreModal';
import { 
  UserProfileModal 
} from './components/Ecosystem/UserProfileModal';
import { 
  CausalLinkModal 
} from './components/StandardMode/CausalLinkModal';
import { 
  WarRoomsModal, 
  WarRoomItem 
} from './components/StandardMode/WarRoomsModal';

// Ecosystem Modals & Auxiliary Views
import { DecisionBoardView } from './components/Ecosystem/DecisionBoardView';
import { CaseStudyLabView } from './components/Ecosystem/CaseStudyLabView';
import { CognitiveDNASandbox } from './components/Ecosystem/CognitiveDNASandbox';
import { SkillMarketplaceView } from './components/Ecosystem/SkillMarketplaceView';
import { ObserverConclavesView } from './components/Ecosystem/ObserverConclavesView';
import { RealityEchoesModal } from './components/Ecosystem/RealityEchoesModal';
import { ArchonSanctumModal } from './components/Ecosystem/ArchonSanctumModal';
import { AISymbioteModal } from './components/Ecosystem/AISymbioteModal';
import { EmotionalTelemetryModal } from './components/Ecosystem/EmotionalTelemetryModal';
import { ValueCalibratorModal } from './components/Ecosystem/ValueCalibratorModal';
import { MetaphysicsTimingModal } from './components/Ecosystem/MetaphysicsTimingModal';
import { SilentObserverModal } from './components/Ecosystem/SilentObserverModal';
import { AIPersonaSelectorModal } from './components/Ecosystem/AIPersonaSelectorModal';
import { BreakthroughActivationModal } from './components/BreakthroughMode/BreakthroughActivationModal';
import { DecisionDNAModal } from './components/DecisionDNAModal';
import { ExportBriefModal } from './components/ExportBriefModal';
import { SystemGuideModal } from './components/Navigation/SystemGuideModal';
import { TacticalSensoryModal } from './components/Navigation/TacticalSensoryModal';

import { 
  BattlefieldState, 
  DecisionDNARecord,
  AIPersonaType,
  SilentObserverAlert,
  UserProfile,
  DeciderSigil,
  WorldPulseEvent,
  RealityEcho,
  CausalDustOption,
  ObserverConclave,
  ArchonTierState,
  ArchonRealityProposal,
  AISymbioteState
} from './types';
import { 
  INITIAL_SAAS_BATTLEFIELD, 
  INITIAL_DECISION_DNA_ARCHIVE,
  INITIAL_REALITY_ECHOES,
  INITIAL_CONCLAVES,
  INITIAL_ARCHON_STATE,
  INITIAL_AI_SYMBIOTE
} from './data/presets';
import { generateDeciderSigil } from './utils/sigilGenerator';
import { soundManager } from './utils/soundEffects';
import { useBattleSession } from './session/useBattleSession';
import type { CatalogScenario } from './session/api';

function ScenarioChooser({ scenarios, error, onClone }: { scenarios: CatalogScenario[]; error: string | null; onClone: (scenarioId: string) => Promise<unknown> }) {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <main className="min-h-screen bg-[#04070d] text-slate-100 tactical-grid px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono-code text-xs tracking-[0.3em] text-cyan-400">SHENGTIAN BANZI / OFFICIAL CATALOG</p>
        <h1 className="mt-4 text-4xl font-black">选择一个现实战局，开始自己的推演</h1>
        <p className="mt-4 max-w-2xl text-slate-400">官方案例只读。点击复制后会创建属于你的战局，后续采访、策略、突破和复盘都只写入你的会话。</p>
        {error ? <div className="mt-6 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-200">{error}。请登录平台账户后复制案例。</div> : null}
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <article key={scenario.id} className="surface-card rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 text-xs text-cyan-300"><span>{scenario.kind === 'battlefield' ? '官方主战局' : '匿名案例'}</span><span>{scenario.industry}</span></div>
              <h2 className="mt-4 text-xl font-bold">{scenario.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{scenario.subtitle}</p>
              <p className="mt-4 min-h-16 text-sm leading-6 text-slate-300">{scenario.description}</p>
              <button className="mt-6 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold hover:bg-cyan-500 disabled:opacity-50" disabled={busy !== null} onClick={async () => { setBusy(scenario.id); try { await onClone(scenario.id); } finally { setBusy(null); } }}>{busy === scenario.id ? '正在创建战局…' : '复制到我的战局'}</button>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const session = useBattleSession();
  if (session.loading) return <div className="min-h-screen bg-[#04070d] text-slate-200 grid place-items-center font-mono-code">正在加载官方案例与战局…</div>;
  if (!session.activeBattle) return <ScenarioChooser scenarios={session.catalog} error={session.error} onClone={session.cloneScenario} />;
  return <BattleWorkspace session={session} />;
}

function BattleWorkspace({ session }: { session: ReturnType<typeof useBattleSession> }) {
  const moduleHydratedRef = React.useRef<Record<string, boolean>>({});
  const [battlefield, setBattlefield] = useState<BattlefieldState>(INITIAL_SAAS_BATTLEFIELD);
  const [activeMainView, setActiveMainView] = useState<'WAR_ROOM' | 'CONCLAVES' | 'DECISION_BOARD' | 'CASE_LAB' | 'COGNITIVE_DNA' | 'MARKETPLACE' | 'WORLD_PULSE'>('WAR_ROOM');
  const [activeStandardTab, setActiveStandardTab] = useState<'interview' | 'cards' | 'simulation' | 'risks'>('interview');
  
  // User Calibration & Sigil State
  const [isCalibrated, setIsCalibrated] = useState<boolean>(() => {
    return false;
  });

  const [showCalibrationFlow, setShowCalibrationFlow] = useState<boolean>(() => {
    return true;
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const defaultSigil = generateDeciderSigil({
      decisionSpeedSec: 12.5,
      riskPreference: 'ASYMMETRIC_AGGRESSIVE',
      resourceAllInRatio: 0.8,
      cognitiveRigorScore: 9.5,
    });

    return {
      id: 'usr-commander-01',
      username: '观测者 · 核心执棋官',
      email: 'commander@aethel.io',
      sigil: defaultSigil,
      aiPersona: 'ANALYST',
      isCalibrated: true,
      totalSimulations: 8,
      singularitySuccessRate: 87.5,
      favoriteStrategyType: '非对称升维突破',
      equityBalance: 650,
      achievements: [
        {
          id: 'ach-first-sigil',
          title: '烙印铸成',
          description: '完成首次世界观校准与咖啡馆危机教学推演',
          icon: 'Sparkles',
          unlockedAt: new Date().toISOString(),
        },
        {
          id: 'ach-fog-breach',
          title: '突破观测者迷雾',
          description: '在多用户干涉的迷雾状态下成功引爆破局奇点',
          icon: 'Eye',
          unlockedAt: new Date().toISOString(),
        },
      ],
    };
  });

  // Masterpiece Puzzles State
  const [realityEchoes, setRealityEchoes] = useState<RealityEcho[]>(INITIAL_REALITY_ECHOES);
  const [conclaves, setConclaves] = useState<ObserverConclave[]>(INITIAL_CONCLAVES);
  const [archonState, setArchonState] = useState<ArchonTierState>(INITIAL_ARCHON_STATE);
  const [symbioteState, setSymbioteState] = useState<AISymbioteState>(INITIAL_AI_SYMBIOTE);

  useEffect(() => {
    const battleId = session.activeBattle?.id;
    if (!battleId) return;
    let cancelled = false;
    const loadModules = async () => {
      for (const [moduleId, apply] of [
        ['reality-echoes', setRealityEchoes],
        ['observer-conclaves', setConclaves],
        ['archon-tier', setArchonState],
        ['ai-symbiote', setSymbioteState],
      ] as const) {
        try {
          const result = await fetch(`/api/battles/${battleId}/modules/${moduleId}`, { credentials: 'include' });
          if (!result.ok) continue;
          const payload = await result.json() as { state?: { state?: unknown } | null };
          const value = payload.state?.state;
          if (!cancelled && value && typeof value === 'object') apply(value as never);
        } catch { /* first run may not have a module snapshot yet */ }
        moduleHydratedRef.current[moduleId] = true;
      }
    };
    void loadModules();
    return () => { cancelled = true; };
  }, [session.activeBattle?.id]);

  useEffect(() => {
    const battleId = session.activeBattle?.id;
    if (!battleId) return;
    const states: Array<[string, unknown]> = [
      ['reality-echoes', realityEchoes],
      ['observer-conclaves', conclaves],
      ['archon-tier', archonState],
      ['ai-symbiote', symbioteState],
    ];
    const timers = states.filter(([moduleId]) => moduleHydratedRef.current[moduleId]).map(([moduleId, state]) => window.setTimeout(() => {
      void fetch(`/api/battles/${battleId}/modules/${moduleId}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state, consent: { source: 'user_session' } }) });
    }, 300));
    return () => timers.forEach(window.clearTimeout);
  }, [session.activeBattle?.id, realityEchoes, conclaves, archonState, symbioteState]);

  // Modals state
  const [isBreakthroughModalOpen, setIsBreakthroughModalOpen] = useState(false);
  const [isDNAModalOpen, setIsDNAModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEmotionalModalOpen, setIsEmotionalModalOpen] = useState(false);
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [isMetaphysicsModalOpen, setIsMetaphysicsModalOpen] = useState(false);
  const [isObserverModalOpen, setIsObserverModalOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isSensoryModalOpen, setIsSensoryModalOpen] = useState(false);
  
  // Aethel Ecosystem Modals
  const [isDeepArchivesModalOpen, setIsDeepArchivesModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCausalLinkModalOpen, setIsCausalLinkModalOpen] = useState(false);
  const [isRealityEchoesModalOpen, setIsRealityEchoesModalOpen] = useState(false);
  const [isArchonSanctumModalOpen, setIsArchonSanctumModalOpen] = useState(false);
  const [isAISymbioteModalOpen, setIsAISymbioteModalOpen] = useState(false);
  const [isWarRoomsModalOpen, setIsWarRoomsModalOpen] = useState(false);
  const [selectedBattlefieldId, setSelectedBattlefieldId] = useState('saas-crisis');

  useEffect(() => {
    const battle = session.activeBattle;
    if (!battle) return;
    const timer = window.setTimeout(() => {
      setSelectedBattlefieldId(battle.id);
      setBattlefield((previous) => ({ ...previous, id:battle.id, title:battle.title, subtitle:battle.objective, objective:battle.objective, minimumOutcome:battle.minimumOutcome, idealOutcome:battle.idealOutcome, targetDeadlineDays:battle.hardDeadline ? Math.max(1, Math.ceil((new Date(battle.hardDeadline).getTime() - Date.now()) / 86400000)) : previous.targetDeadlineDays }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session.activeBattle]);

  // Battlefield List for War Rooms Management
  const [battlefieldList, setBattlefieldList] = useState<WarRoomItem[]>([
    {
      id: 'saas-crisis',
      title: '高科技SaaS企业现金流死线突围',
      subtitle: '头部客户续约受阻 · 跑道仅剩42天生死抉择',
      status: 'CRITICAL',
      updatedAt: '10分钟前',
      isShared: true,
      daysLeft: 42,
      confidence: 70,
      industry: '企业软件 / SaaS',
    },
    {
      id: 'vp-reorg',
      title: '职场高管权力重组与晋升卡位博弈',
      subtitle: '核心BU合并重组 · 关键晋升窗口期30天推演',
      status: 'STABLE',
      updatedAt: '2小时前',
      isShared: false,
      daysLeft: 30,
      confidence: 65,
      industry: '组织治理 / 职场博弈',
    },
    {
      id: 'hard-tech-bridge',
      title: '硬科技初创企业资方撤资与过桥融资',
      subtitle: '领投机构突发毁约 · 现金跑道仅剩28天救赎',
      status: 'CRITICAL',
      updatedAt: '昨天',
      isShared: true,
      daysLeft: 28,
      confidence: 50,
      industry: '硬科技 / 先进制造',
    },
  ]);

  const handleSelectBattlefield = (item: WarRoomItem) => {
    setSelectedBattlefieldId(item.id);
    setBattlefield(prev => ({
      ...prev,
      title: item.title,
      subtitle: item.subtitle,
      targetDeadlineDays: item.daysLeft,
      confidence: item.confidence,
    }));
    soundManager.playBlip(750, 0.03);
  };

  const handleCreateNewBattlefield = () => {
    const newId = `battlefield-${Date.now()}`;
    const newBattlefield: WarRoomItem = {
      id: newId,
      title: '新建因果博弈战局',
      subtitle: '未命名战局 · 等待采访参数萃取',
      status: 'STABLE',
      updatedAt: '刚刚',
      isShared: false,
      daysLeft: 30,
      confidence: 50,
      industry: '未分类',
    };
    setBattlefieldList(prev => [newBattlefield, ...prev]);
    setSelectedBattlefieldId(newId);
    setActiveMainView('WAR_ROOM');
    setActiveStandardTab('interview');
    setBattlefield(prev => ({
      ...prev,
      id: newId,
      title: '新建因果博弈战局',
      subtitle: '未命名战局 · 等待采访参数萃取',
      targetDeadlineDays: 30,
      confidence: 50,
    }));
    soundManager.playSuccess();
  };

  // Decision DNA storage
  const [dnaRecords, setDnaRecords] = useState<DecisionDNARecord[]>(() => {
    return INITIAL_DECISION_DNA_ARCHIVE;
  });

  useEffect(() => {
    const battleId = session.activeBattle?.id;
    if (!battleId) return;
    let cancelled = false;
    void fetch(`/api/battles/${battleId}/modules/decision-dna`, { credentials: 'include' }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { state?: { state?: { records?: DecisionDNARecord[] } } | null };
      if (!cancelled && Array.isArray(payload.state?.state?.records)) setDnaRecords(payload.state.state.records);
      moduleHydratedRef.current['decision-dna'] = true;
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [session.activeBattle?.id]);

  useEffect(() => {
    const battleId = session.activeBattle?.id;
    if (!battleId || !moduleHydratedRef.current['decision-dna']) return;
    const timer = window.setTimeout(() => { void fetch(`/api/battles/${battleId}/modules/decision-dna`, { method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ state:{ records:dnaRecords }, consent:{ source:'user_session' } }) }); }, 300);
    return () => window.clearTimeout(timer);
  }, [session.activeBattle?.id, dnaRecords]);

  const handleSaveDNARecord = (record: DecisionDNARecord) => {
    const updated = [record, ...dnaRecords];
    setDnaRecords(updated);
    // Gain bond EXP with Symbiote on completing deduction
    setSymbioteState(prev => ({
      ...prev,
      bondExp: Math.min(prev.maxBondExp, prev.bondExp + 50),
      totalBattlesFoughtTogether: prev.totalBattlesFoughtTogether + 1,
      victoriesTogether: record.survivalOutcome === 'SURVIVED' ? prev.victoriesTogether + 1 : prev.victoriesTogether,
    }));
  };

  // Equity manipulation
  const handleSpendEquity = (amount: number, reason: string): boolean => {
    if (userProfile.equityBalance < amount) {
      setIsStoreModalOpen(true);
      return false;
    }
    setUserProfile(prev => ({
      ...prev,
      equityBalance: prev.equityBalance - amount,
    }));
    soundManager.playBlip(750, 0.03);
    return true;
  };

  const handleAddEquity = (amount: number, reason: string) => {
    setUserProfile(prev => ({
      ...prev,
      equityBalance: prev.equityBalance + amount,
    }));
  };

  // Calibration completion
  const handleCompleteCalibration = (profile: UserProfile, sigil: DeciderSigil) => {
    setUserProfile(profile);
    setIsCalibrated(true);
    setShowCalibrationFlow(false);
    setBattlefield(prev => ({
      ...prev,
      selectedPersona: profile.aiPersona,
    }));
  };

  const handleLaunchSingularity = () => {
    setIsBreakthroughModalOpen(false);
    setActiveMainView('WAR_ROOM');
    setBattlefield(prev => ({
      ...prev,
      breakthroughActive: true,
      breakthroughPhase: 1,
      forcedWorstCaseActive: true,
    }));
    soundManager.playStrategyLocked();
  };

  const handleExitSingularity = () => {
    setBattlefield(prev => ({
      ...prev,
      breakthroughActive: false,
      breakthroughPhase: 1,
    }));
    soundManager.playBlip(600, 0.04);
  };

  const handleSelectPersona = (persona: AIPersonaType) => {
    setBattlefield(prev => ({
      ...prev,
      selectedPersona: persona,
    }));
    setUserProfile(prev => ({
      ...prev,
      aiPersona: persona,
    }));
  };

  const handleImportObserverDraft = (draft: SilentObserverAlert['suggestedBattlefieldDraft']) => {
    setBattlefield(prev => ({
      ...prev,
      title: draft.title,
      subtitle: `由静默观察者雷达捕获生成 · 关门倒计时 ${draft.deadlineDays} 天`,
      targetDeadlineDays: draft.deadlineDays,
      confidence: draft.initialConfidence,
    }));
    setActiveMainView('WAR_ROOM');
    setActiveStandardTab('cards');
    soundManager.playSuccess();
  };

  const handleInterveneWorldEvent = (event: WorldPulseEvent) => {
    setBattlefield(prev => ({
      ...prev,
      id: `battlefield-${event.id}`,
      title: event.title,
      subtitle: `${event.region} · ${event.code}`,
      targetDeadlineDays: Math.max(1, Math.round(event.expiresInMins / 60)),
    }));
    setActiveMainView('WAR_ROOM');
    handleLaunchSingularity();
  };

  // --- Handlers for 4 Masterpiece Puzzles ---
  
  // 1. Reality Echoes Handlers
  const handleResolveDustEvent = (echoId: string, eventId: string, option: CausalDustOption) => {
    if (option.costEquity > 0) {
      if (!handleSpendEquity(option.costEquity, '平息因果尘埃')) return;
    }

    setRealityEchoes(prev => prev.map(echo => {
      if (echo.id !== echoId) return echo;

      const updatedDust = echo.causalDustEvents.map(d => {
        if (d.id !== eventId) return d;
        return {
          ...d,
          status: 'RESOLVED' as const,
          resolvedOptionId: option.id,
          resolvedAt: '刚刚',
          resolutionFeedback: `你执行了【${option.action}】。${option.rewardDesc}`,
        };
      });

      const newProgress = Math.min(100, echo.equilibriumProgress + 35);
      const isReached = newProgress >= 100;

      return {
        ...echo,
        equilibriumProgress: newProgress,
        equilibriumStatus: isReached ? ('EQUILIBRIUM_REACHED' as const) : echo.equilibriumStatus,
        causalDustEvents: updatedDust,
      };
    }));
  };

  const handleClaimEquilibriumReward = (echoId: string) => {
    const echo = realityEchoes.find(e => e.id === echoId);
    if (!echo || echo.finalRewardUnlocked) return;

    handleAddEquity(echo.finalRewardEquity, '现实回响终局平衡奖励');
    setRealityEchoes(prev => prev.map(e => e.id === echoId ? { ...e, finalRewardUnlocked: true } : e));
    soundManager.playSuccess();
  };

  // 2. Conclaves Handlers
  const handleInjectEquityToConclave = (conclaveId: string, amount: number) => {
    if (!handleSpendEquity(amount, '向密会公共资源池注入')) return;
    setConclaves(prev => prev.map(c => {
      if (c.id !== conclaveId) return c;
      return {
        ...c,
        collectiveEquityPool: c.collectiveEquityPool + amount,
      };
    }));
  };

  const handleCreateConclave = (newConclave: Partial<ObserverConclave>) => {
    if (!handleSpendEquity(100, '铸造专属密会公会')) return;
    const fullConclave: ObserverConclave = {
      id: `conclave-${Date.now()}`,
      name: newConclave.name || '新因果密会',
      codeName: newConclave.codeName || 'NEW_CONCLAVE',
      sigilIcon: 'Shield',
      glowColor: newConclave.glowColor || '#38bdf8',
      doctrine: newConclave.doctrine || '“以第一性原理刺穿宿命。”',
      level: 1,
      founderName: userProfile.username,
      membersCount: 1,
      maxMembers: 10,
      collectiveEquityPool: 100,
      intervenedWorldEventsCount: 0,
      globalRank: conclaves.length + 1,
      isUserMember: true,
      userRole: 'GRAND_MASTER',
      activeCollectiveSimulations: [],
      members: [
        {
          id: userProfile.id,
          name: `${userProfile.username} (你)`,
          avatar: '你',
          role: 'GRAND_MASTER',
          roleTitle: '密会创始人',
          sigilName: userProfile.sigil?.name || '【深潜的利维坦】',
          equityContributed: 100,
          joinedAt: '刚刚',
          isUser: true,
        },
      ],
      recentAnnouncements: [
        {
          id: 'anc-init',
          title: '密会正式建立',
          content: '密会公共因果网络已连通全服。',
          timestamp: '刚刚',
        },
      ],
    };

    setConclaves(prev => [fullConclave, ...prev]);
  };

  const handleJoinCollectiveSimulation = (conclaveId: string, simId: string, actionName: string) => {
    setConclaves(prev => prev.map(c => {
      if (c.id !== conclaveId) return c;
      return {
        ...c,
        activeCollectiveSimulations: c.activeCollectiveSimulations.map(sim => {
          if (sim.id !== simId) return sim;
          return {
            ...sim,
            alphaProbability: Math.min(0.99, sim.alphaProbability + 0.12),
            synchronizedActions: [
              ...sim.synchronizedActions,
              {
                memberRole: '高阶执棋官 (你)',
                actionName,
                impactAlpha: 0.12,
                executedAt: '刚刚',
              },
            ],
          };
        }),
      };
    }));
  };

  // 3. Archon Tier Handlers
  const handleSubmitRealityProposal = (proposal: Partial<ArchonRealityProposal>) => {
    const newProp: ArchonRealityProposal = {
      id: `prop-${Date.now()}`,
      title: proposal.title || '全新现实危机提案',
      crisisType: proposal.crisisType || '产业结构性危机',
      industry: proposal.industry || '硬科技 / 先进制造',
      backgroundDilemma: proposal.backgroundDilemma || '',
      status: 'SUBMITTED',
      submittedAt: '刚刚',
      bountyEquityReward: 50,
      observersIntervenedCount: 0,
      communitySuccessRate: 0,
    };

    setArchonState(prev => ({
      ...prev,
      userProposals: [newProp, ...prev.userProposals],
    }));
  };

  const handleAddArchiveAnnotation = (archiveId: string, lemma: string) => {
    setArchonState(prev => ({
      ...prev,
      archiveAnnotations: [
        {
          id: `ann-${Date.now()}`,
          archiveId,
          archiveTitle: archiveId.includes('ltcm') ? '1998 LTCM 长期资本管理公司奇点' : '1982 强生泰诺投毒公关保卫战',
          archonLemma: `【执政官因果引理】：${lemma}`,
          authorArchonName: userProfile.username,
          authorSigil: userProfile.sigil?.name || '【深潜的利维坦】',
          createdAt: '刚刚',
          upvotes: 1,
          isVerifiedByAethel: true,
        },
        ...prev.archiveAnnotations,
      ],
    }));
  };

  // 4. Symbiote Handlers
  const handleUpdateSymbioteName = (newName: string) => {
    setSymbioteState(prev => ({
      ...prev,
      customName: newName,
    }));
  };

  const isRiskTriggered = battlefield.riskBreakers?.some(r => r.isTriggered) ?? false;
  const pendingDustCount = realityEchoes.reduce((acc, echo) => acc + echo.causalDustEvents.filter(d => d.status === 'PENDING').length, 0);
  const userConclave = conclaves.find(c => c.isUserMember) || conclaves[0];

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-700 ${
      battlefield.breakthroughActive ? 'bg-[#05080D] text-slate-100' : 'bg-[#080B12] text-slate-100'
    } tactical-grid`}>
      
      {/* Top Standard Clean Header */}
      <Header
        activeMainView={activeMainView}
        onChangeMainView={setActiveMainView}
        breakthroughActive={battlefield.breakthroughActive}
        onOpenBreakthroughModal={() => setIsBreakthroughModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        onOpenSensoryModal={() => setIsSensoryModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenStoreModal={() => setIsStoreModalOpen(true)}
        onOpenDeepArchivesModal={() => setIsDeepArchivesModalOpen(true)}
        onOpenWarRoomsModal={() => setIsWarRoomsModalOpen(true)}
        onResetToStandard={handleExitSingularity}
        isRiskTriggered={isRiskTriggered}
        selectedPersona={battlefield.selectedPersona || userProfile.aiPersona || 'ANALYST'}
        observerAlertCount={2}
        stressLevel={battlefield.emotionalTelemetry?.stress || 82}
        userEquity={userProfile.equityBalance}
        sigil={userProfile.sigil}
        currentBattlefieldTitle={battlefield.title}
        currentBattlefieldDays={battlefield.financials?.calculatedDays ?? 42}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* VIEW 1: War Room (Standard 2-Column Workshop with Title Bar OR Ultimate Singularity Deduction) */}
        {activeMainView === 'WAR_ROOM' && (
          battlefield.breakthroughActive ? (
            <SingularityDeductionView
              battlefield={battlefield}
              onUpdateBattlefield={setBattlefield}
              onExitSingularityMode={handleExitSingularity}
              onSaveDNARecord={handleSaveDNARecord}
            />
          ) : (
            <CausalWorkshopView
              battlefield={battlefield}
              onUpdateBattlefield={setBattlefield}
              userProfile={userProfile}
              sigil={userProfile.sigil}
              onLaunchSingularity={() => setIsBreakthroughModalOpen(true)}
              onOpenCausalLinkModal={() => setIsCausalLinkModalOpen(true)}
              onOpenWarRoomsModal={() => setIsWarRoomsModalOpen(true)}
              activeStandardTab={activeStandardTab}
              onSelectStandardTab={setActiveStandardTab}
              onOpenRealityEchoesModal={() => setIsRealityEchoesModalOpen(true)}
              onOpenAISymbioteModal={() => setIsAISymbioteModalOpen(true)}
              onOpenArchonSanctumModal={() => setIsArchonSanctumModalOpen(true)}
              onNavigateToConclaves={() => setActiveMainView('CONCLAVES')}
              activeEchoesCount={realityEchoes.length}
              pendingDustCount={pendingDustCount}
              symbioteState={symbioteState}
              userConclave={userConclave}
            />
          )
        )}

        {/* VIEW 2: Observer Conclaves (组织的崛起 · 第二拼图) */}
        {activeMainView === 'CONCLAVES' && (
          <ObserverConclavesView
            conclaves={conclaves}
            userEquity={userProfile.equityBalance}
            onInjectEquityToConclave={handleInjectEquityToConclave}
            onCreateConclave={handleCreateConclave}
            onJoinCollectiveSimulation={handleJoinCollectiveSimulation}
            onOpenStoreModal={() => setIsStoreModalOpen(true)}
          />
        )}

        {/* VIEW 3: Asynchronous Decision Board */}
        {activeMainView === 'DECISION_BOARD' && (
          <div className="space-y-4">
            <DecisionBoardView
              battlefield={battlefield}
              onUpdateBattlefield={setBattlefield}
            />
          </div>
        )}

        {/* VIEW 4: World's Pulse (Global 3D Earth Event Radar) */}
        {activeMainView === 'WORLD_PULSE' && (
          <WorldPulseView
            userEquity={userProfile.equityBalance}
            onSpendEquity={handleSpendEquity}
            onInterveneEvent={handleInterveneWorldEvent}
          />
        )}

        {/* VIEW 5: Anonymous Case Study Lab */}
        {activeMainView === 'CASE_LAB' && (
          <div className="space-y-4">
            <CaseStudyLabView
              onEarnEquity={handleAddEquity}
            />
          </div>
        )}

        {/* VIEW 6: Cognitive DNA Sandbox */}
        {activeMainView === 'COGNITIVE_DNA' && (
          <div className="space-y-4">
            <CognitiveDNASandbox
              dnaRecords={dnaRecords}
            />
          </div>
        )}

        {/* VIEW 7: Skill Marketplace & Token Economy */}
        {activeMainView === 'MARKETPLACE' && (
          <div className="space-y-4">
            <SkillMarketplaceView
              onLoadTemplate={() => {
                setActiveMainView('WAR_ROOM');
              }}
            />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.06] py-4 mt-12 text-center text-xs text-slate-500 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono-code text-[11px]">
          <span>AETHEL · 商业决策因果推演引擎 (STRATEGIC DECISION ENGINE) - 专为真实商业危机指导构建</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRealityEchoesModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              现实回响 ({realityEchoes.length})
            </button>
            <span>·</span>
            <button
              onClick={() => setIsArchonSanctumModalOpen(true)}
              className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
            >
              执政官圣殿
            </button>
            <span>·</span>
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="text-slate-400 hover:text-white underline cursor-pointer"
            >
              生态全景导引
            </button>
          </div>
        </div>
      </footer>

      {/* ONBOARDING & CALIBRATION FLOW (First visit or re-calibration) */}
      {showCalibrationFlow && (
        <CalibrationFlow
          onCompleteCalibration={handleCompleteCalibration}
          onCancel={() => setShowCalibrationFlow(false)}
        />
      )}

      {/* 1. Reality Echoes Modal (后果的重量 - 现实回响与因果尘埃) */}
      <RealityEchoesModal
        isOpen={isRealityEchoesModalOpen}
        onClose={() => setIsRealityEchoesModalOpen(false)}
        echoes={realityEchoes}
        onResolveDustEvent={handleResolveDustEvent}
        onClaimEquilibriumReward={handleClaimEquilibriumReward}
        userEquity={userProfile.equityBalance}
      />

      {/* 2. Archon Sanctum Modal (终极的向往 - 执政官阶层圣殿) */}
      <ArchonSanctumModal
        isOpen={isArchonSanctumModalOpen}
        onClose={() => setIsArchonSanctumModalOpen(false)}
        archonState={archonState}
        onSubmitRealityProposal={handleSubmitRealityProposal}
        onAddArchiveAnnotation={handleAddArchiveAnnotation}
        userEquity={userProfile.equityBalance}
      />

      {/* 3. AI Symbiote Hub Modal (情感的纽带 - AI共生体中枢) */}
      <AISymbioteModal
        isOpen={isAISymbioteModalOpen}
        onClose={() => setIsAISymbioteModalOpen(false)}
        symbiote={symbioteState}
        onUpdateSymbioteName={handleUpdateSymbioteName}
      />

      {/* Deep Archives Modal (History Snaps & Easter Egg) */}
      <DeepArchivesModal
        isOpen={isDeepArchivesModalOpen}
        onClose={() => setIsDeepArchivesModalOpen(false)}
        userEquity={userProfile.equityBalance}
        onSpendEquity={handleSpendEquity}
      />

      {/* Deduction Equity Store Modal */}
      <EquityStoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        userEquity={userProfile.equityBalance}
        onAddEquity={handleAddEquity}
      />

      {/* User Profile & Sigil Dossier Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        sigil={userProfile.sigil}
        onOpenDeepArchivesEasterEgg={() => setIsDeepArchivesModalOpen(true)}
        onRecalibrate={() => setShowCalibrationFlow(true)}
      />

      {/* Causal Link Collaboration Modal */}
      <CausalLinkModal
        isOpen={isCausalLinkModalOpen}
        onClose={() => setIsCausalLinkModalOpen(false)}
        battlefieldTitle={battlefield.title}
      />

      {/* System Guide Modal */}
      <SystemGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onNavigate={(view, tab) => {
          setActiveMainView(view as any);
          if (tab) setActiveStandardTab(tab);
        }}
        onOpenBreakthroughModal={() => setIsBreakthroughModalOpen(true)}
        onOpenEmotionalModal={() => setIsEmotionalModalOpen(true)}
        onOpenValueModal={() => setIsValueModalOpen(true)}
        onOpenMetaphysicsModal={() => setIsMetaphysicsModalOpen(true)}
        onOpenObserverModal={() => setIsObserverModalOpen(true)}
        onOpenPersonaModal={() => setIsPersonaModalOpen(true)}
      />

      {/* Tactical Sensory & Auxiliary Hub Modal */}
      <TacticalSensoryModal
        isOpen={isSensoryModalOpen}
        onClose={() => setIsSensoryModalOpen(false)}
        battlefield={battlefield}
        onOpenObserverModal={() => setIsObserverModalOpen(true)}
        onOpenPersonaModal={() => setIsPersonaModalOpen(true)}
        onOpenEmotionalModal={() => setIsEmotionalModalOpen(true)}
        onOpenValueModal={() => setIsValueModalOpen(true)}
        onOpenMetaphysicsModal={() => setIsMetaphysicsModalOpen(true)}
      />

      {/* Singularity Breakthrough Activation Modal */}
      <BreakthroughActivationModal
        isOpen={isBreakthroughModalOpen}
        onClose={() => setIsBreakthroughModalOpen(false)}
        onConfirm={handleLaunchSingularity}
        calculatedDays={battlefield.financials?.calculatedDays ?? 42}
      />

      {/* Cognitive DNA Archive Modal */}
      <DecisionDNAModal
        isOpen={isDNAModalOpen}
        onClose={() => setIsDNAModalOpen(false)}
        dnaRecords={dnaRecords}
      />

      {/* Export Tactical Brief Modal */}
      <ExportBriefModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        battlefield={battlefield}
      />

      {/* Emotional Telemetry HUD */}
      <EmotionalTelemetryModal
        isOpen={isEmotionalModalOpen}
        onClose={() => setIsEmotionalModalOpen(false)}
        battlefield={battlefield}
        onUpdateBattlefield={setBattlefield}
      />

      {/* Value Calibrator Modal */}
      <ValueCalibratorModal
        isOpen={isValueModalOpen}
        onClose={() => setIsValueModalOpen(false)}
        battlefield={battlefield}
        onUpdateBattlefield={setBattlefield}
      />

      {/* Metaphysics Timing Modal */}
      <MetaphysicsTimingModal
        isOpen={isMetaphysicsModalOpen}
        onClose={() => setIsMetaphysicsModalOpen(false)}
        battlefield={battlefield}
        onUpdateBattlefield={setBattlefield}
      />

      {/* Silent Observer Alerts Modal */}
      <SilentObserverModal
        isOpen={isObserverModalOpen}
        onClose={() => setIsObserverModalOpen(false)}
        onImportDraftAsBattlefield={handleImportObserverDraft}
      />

      {/* AI Persona Selector Modal */}
      <AIPersonaSelectorModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        selectedPersona={battlefield.selectedPersona || userProfile.aiPersona || 'ANALYST'}
        onSelectPersona={handleSelectPersona}
      />

      {/* Causal War Rooms Management Popup Modal (战局管理中心) */}
      <WarRoomsModal
        isOpen={isWarRoomsModalOpen}
        onClose={() => setIsWarRoomsModalOpen(false)}
        currentBattlefield={battlefield}
        battlefieldList={battlefieldList}
        selectedBattlefieldId={selectedBattlefieldId}
        onSelectBattlefield={handleSelectBattlefield}
        onCreateNewBattlefield={handleCreateNewBattlefield}
        onOpenCausalLinkModal={() => setIsCausalLinkModalOpen(true)}
        onOpenRealityEchoesModal={() => setIsRealityEchoesModalOpen(true)}
        onOpenArchonSanctumModal={() => setIsArchonSanctumModalOpen(true)}
        onNavigateToConclaves={() => setActiveMainView('CONCLAVES')}
        onOpenAISymbioteModal={() => setIsAISymbioteModalOpen(true)}
        activeEchoesCount={realityEchoes.length}
        pendingDustCount={pendingDustCount}
        symbioteState={symbioteState}
      />

    </div>
  );
}
