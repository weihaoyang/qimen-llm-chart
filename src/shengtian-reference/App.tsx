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
  DecisionBoardState,
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
  , CardAsset
} from './types';
import { generateDeciderSigil } from './utils/sigilGenerator';
import { soundManager } from './utils/soundEffects';
import { useBattleSession } from './session/useBattleSession';
import { sessionApi } from './session/api';
import type { CatalogScenario } from './session/api';

function ScenarioChooser({ scenarios, error, onClone }: { scenarios: CatalogScenario[]; error: string | null; onClone: (scenarioId: string) => Promise<unknown> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  return (
    <main className="min-h-screen bg-[#04070d] text-slate-100 tactical-grid px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono-code text-xs tracking-[0.3em] text-cyan-400">SHENGTIAN BANZI / OFFICIAL CATALOG</p>
        <h1 className="mt-4 text-4xl font-black">选择一个现实战局，开始自己的推演</h1>
        <p className="mt-4 max-w-2xl text-slate-400">官方案例只读。点击复制后会创建属于你的战局，后续采访、策略、突破和复盘都只写入你的会话。</p>
        {error || actionError ? <div className="mt-6 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-200">{actionError ?? error}。请登录平台账户后复制案例。</div> : null}
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <article key={scenario.id} className="surface-card rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 text-xs text-cyan-300"><span>{scenario.kind === 'battlefield' ? '官方主战局' : '匿名案例'}</span><span>{scenario.industry}</span></div>
              <h2 className="mt-4 text-xl font-bold">{scenario.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{scenario.subtitle}</p>
              <p className="mt-4 min-h-16 text-sm leading-6 text-slate-300">{scenario.description}</p>
              <button className="mt-6 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold hover:bg-cyan-500 disabled:opacity-50" disabled={busy !== null} onClick={async () => { setBusy(scenario.id); setActionError(null); try { await onClone(scenario.id); } catch (cloneError) { setActionError(cloneError instanceof Error ? cloneError.message : '复制案例失败，请稍后重试。'); } finally { setBusy(null); } }}>{busy === scenario.id ? '正在创建战局…' : '复制到我的战局'}</button>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function createBattlefieldShell(activeBattle: NonNullable<ReturnType<typeof useBattleSession>['activeBattle']>, decisionBoard: DecisionBoardState): BattlefieldState {
  const deadline = activeBattle.hardDeadline ? new Date(activeBattle.hardDeadline).getTime() : Date.now();
  return {
    id: activeBattle.id,
    title: activeBattle.title,
    subtitle: activeBattle.objective,
    createdAt: activeBattle.updatedAt,
    currentDay: 0,
    targetDeadlineDays: Math.max(0, Math.ceil((deadline - Date.now()) / 86400000)),
    idealOutcome: activeBattle.idealOutcome,
    bottomLine: activeBattle.minimumOutcome,
    confidence: 0,
    keyActors: [],
    financials: { availableCash: 0, monthlyBurn: 0, monthlyIncomeWithoutClient: 0, calculatedDays: 0, alertLevel: 'SAFE' },
    assets: [],
    gravityNodes: [],
    strategies: [],
    riskBreakers: [],
    interviewHistory: [],
    breakthroughActive: false,
    breakthroughPhase: 1,
    forcedWorstCaseActive: false,
    breakthroughConfirmedTruths: {},
    cognitiveBiasesDetected: [],
    redTeamLog: [],
    selectedPersona: 'ANALYST',
    emotionalTelemetry: { energy: 0, stress: 0, confidence: 0, recentLoggedDate: '', historyLogs: [], aiStressInsight: '' },
    valueCalibrator: { coreValues: [], strategyAlignmentAudit: [] },
    metaphysicsTiming: { isViewed: false, solarTerm: '', lunarDate: '', qiMenChart: { gong: '', door: '', star: '', deity: '', elementEnergy: '' }, symbolicReflection: '' },
    decisionBoard,
  };
}

export default function App() {
  const session = useBattleSession();
  if (session.loading) return <div className="min-h-screen bg-[#04070d] text-slate-200 grid place-items-center font-mono-code">正在加载官方案例与战局…</div>;
  if (!session.activeBattle) return <ScenarioChooser scenarios={session.catalog} error={session.error} onClone={session.cloneScenario} />;
  return <BattleWorkspace key={session.activeBattle.id} session={session} />;
}

function BattleWorkspace({ session }: { session: ReturnType<typeof useBattleSession> }) {
  const moduleHydratedRef = React.useRef<Record<string, boolean>>({});
  const inviteHandledRef = React.useRef<string | null>(null);
  const emptyDecisionBoard: DecisionBoardState = {
    roomId: '',
    shareToken: '',
    expiresInHours: 0,
    isRedacted: true,
    members: [],
    comments: [],
    ghostStrategies: [],
  };
  const [battlefield, setBattlefield] = useState<BattlefieldState>(() => createBattlefieldShell(session.activeBattle!, emptyDecisionBoard));
  const [activeMainView, setActiveMainView] = useState<'WAR_ROOM' | 'CONCLAVES' | 'DECISION_BOARD' | 'CASE_LAB' | 'COGNITIVE_DNA' | 'MARKETPLACE' | 'WORLD_PULSE'>('WAR_ROOM');
  const [activeStandardTab, setActiveStandardTab] = useState<'interview' | 'cards' | 'simulation' | 'risks'>('interview');

  useEffect(() => {
    const battleId = session.activeBattle?.id;
    if (!battleId || typeof window === 'undefined') return;
    const inviteId = new URLSearchParams(window.location.search).get('invite');
    if (!inviteId || inviteHandledRef.current === inviteId) return;
    inviteHandledRef.current = inviteId;
    void sessionApi.updateCollaborator(battleId, inviteId, { action: 'accept' }).then(() => {
      window.history.replaceState({}, '', `/?battle=${encodeURIComponent(battleId)}`);
    }).catch(() => {
      inviteHandledRef.current = null;
    });
  }, [session.activeBattle?.id]);
  
  // User Calibration & Sigil State
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [showCalibrationFlow, setShowCalibrationFlow] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const defaultSigil = generateDeciderSigil({
      decisionSpeedSec: 12.5,
      riskPreference: 'ASYMMETRIC_AGGRESSIVE',
      resourceAllInRatio: 0.8,
      cognitiveRigorScore: 9.5,
    });

    return {
      id: 'current-account',
      username: '当前执棋官',
      email: '',
      sigil: defaultSigil,
      aiPersona: 'ANALYST',
      isCalibrated: false,
      totalSimulations: 0,
      singularitySuccessRate: 0,
      favoriteStrategyType: '',
      // Entitlements are owned by the unified platform; qmdj starts fail-closed
      // until the account/profile endpoint supplies the current value.
      equityBalance: 0,
      achievements: [],
    };
  });
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const profileHydratedRef = React.useRef(false);
  const saveBattleModule = React.useCallback(async (battleId: string, moduleId: string, state: unknown, consent: Record<string, unknown> = {}) => {
    const response = await fetch(`/api/battles/${battleId}/modules/${moduleId}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, consent }),
    });
    if (!response.ok) throw new Error(`模块 ${moduleId} 保存失败（${response.status}）。`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void sessionApi.profile().then(({ profile }) => {
      const saved = profile?.profile?.uiProfile;
      if (cancelled) return;
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        const persisted = saved as Partial<UserProfile>;
        setUserProfile((previous) => ({ ...previous, ...persisted, equityBalance: previous.equityBalance }));
        const calibrated = persisted.isCalibrated === true;
        setIsCalibrated(calibrated);
        setShowCalibrationFlow(!calibrated);
      } else {
        setShowCalibrationFlow(true);
      }
      profileHydratedRef.current = true;
      setProfileHydrated(true);
    }).catch(() => {
      if (cancelled) return;
      profileHydratedRef.current = true;
      setProfileHydrated(true);
      setShowCalibrationFlow(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!profileHydratedRef.current) return;
    const timer = window.setTimeout(() => {
      const { equityBalance: _equityBalance, ...persisted } = userProfile;
      void sessionApi.saveProfile({ uiProfile: persisted }).catch((error) => setPersistenceError(error instanceof Error ? error.message : '用户档案保存失败，请重试。'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [userProfile]);

  // Masterpiece Puzzles State
  // Ecosystem state is battle-scoped. Official preset objects are catalog examples,
  // never a user's initial progress; an absent snapshot starts empty/locked.
  const [realityEchoes, setRealityEchoes] = useState<RealityEcho[]>([]);
  const [conclaves, setConclaves] = useState<ObserverConclave[]>([]);
  const [archonState, setArchonState] = useState<ArchonTierState>({
    isUnlocked: false,
    archonRankTitle: '见习观测者',
    archonSealsCount: 0,
    promotionRequirements: {
      singularityVictories: { current: 0, required: 3, met: false },
      conclaveGlobalRank: { current: 0, required: 10, met: false },
      unsolvableArchiveSolved: { current: 0, required: 1, met: false },
    },
    privileges: { precognition: false, archiveAnnotation: false, realityProposal: false },
    precognitionEvents: [],
    archiveAnnotations: [],
    userProposals: [],
  });
  const [symbioteState, setSymbioteState] = useState<AISymbioteState>({
    id: 'battle-scoped-symbiote',
    customName: '未命名共生体',
    personaType: 'ANALYST',
    bondLevel: 1,
    bondExp: 0,
    maxBondExp: 100,
    evolutionStage: 'AWAKENED',
    evolutionStageName: '初醒',
    temperament: 'COLD_CALCULATING',
    temperamentName: '冷静计算',
    dialogueTendency: '等待用户授权后开始学习。',
    adaptiveToneNotes: '',
    totalBattlesFoughtTogether: 0,
    victoriesTogether: 0,
    longTermMemories: [],
  });

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
    void sessionApi.module(battleId, 'battlefield-aux').then(({ state }) => {
      const snapshot = state && typeof state === 'object' ? state as { state?: unknown } : null;
      const value = snapshot?.state;
      if (!cancelled && value && typeof value === 'object') {
        setBattlefield((previous) => ({ ...previous, ...(value as Partial<BattlefieldState>) }));
      }
      moduleHydratedRef.current['battlefield-aux'] = true;
    }).catch(() => { moduleHydratedRef.current['battlefield-aux'] = true; });
    return () => { cancelled = true; };
  }, [session.activeBattle?.id]);

  useEffect(() => {
    const battleId = session.activeBattle?.id;
    if (!battleId) return;
    let cancelled = false;
    void fetch(`/api/battles/${battleId}/inventory`, { credentials:'include' }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { inventory?: Array<Record<string, unknown>> };
      if (cancelled || !Array.isArray(payload.inventory)) return;
      const categoryMap: Record<string, CardAsset['category']> = { cash:'FINANCIAL', time:'TIME', information:'INFO', skill:'CHIPS', asset:'CHIPS', relationship:'CHIPS', credential:'CHIPS', channel:'CHIPS', energy:'CHIPS', other:'CHIPS' };
      const assets: CardAsset[] = payload.inventory.map((item, index) => ({ id:String(item.id ?? `inventory-${index}`), category:categoryMap[String(item.category)] ?? 'CHIPS', title:String(item.label ?? '未命名底牌'), description:String(item.description ?? ''), tag:'FACT', confidence:80, numericValue:typeof item.quantity === 'number' ? item.quantity : undefined, unit:typeof item.unit === 'string' ? item.unit : undefined, createdAt:String(item.createdAt ?? new Date().toISOString()) }));
      setBattlefield((previous) => ({ ...previous, assets }));
      moduleHydratedRef.current['inventory'] = true;
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [session.activeBattle?.id]);

  useEffect(() => {
    const battleId = session.activeBattle?.id;
    if (!battleId || !moduleHydratedRef.current['inventory']) return;
    const categoryMap: Record<CardAsset['category'], string> = { FINANCIAL:'cash', TIME:'time', CHIPS:'asset', INFO:'information' };
    const timer = window.setTimeout(() => {
      void fetch(`/api/battles/${battleId}/inventory`, { method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ inventory:battlefield.assets.map((asset) => ({ label:asset.title, description:asset.description, category:categoryMap[asset.category], quantity:asset.numericValue ?? null, unit:asset.unit ?? null, availability:'available', expiresAt:null, cost:{}, evidence:{ tag:asset.tag, confidence:asset.confidence } })) }) })
        .then((response) => { if (!response.ok) throw new Error(`底牌保存失败（${response.status}）。`); })
        .catch((error) => setPersistenceError(error instanceof Error ? error.message : '底牌保存失败，请重试。'));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [session.activeBattle?.id, battlefield.assets]);

  useEffect(() => {
    const battleId = session.activeBattle?.id;
    if (!battleId) return;
    const states: Array<[string, unknown]> = [
      ['reality-echoes', realityEchoes],
      ['observer-conclaves', conclaves],
      ['archon-tier', archonState],
      ['ai-symbiote', symbioteState],
      ['battlefield-aux', {
        emotionalTelemetry: battlefield.emotionalTelemetry,
        valueCalibrator: battlefield.valueCalibrator,
        metaphysicsTiming: battlefield.metaphysicsTiming,
        selectedPersona: battlefield.selectedPersona,
        interviewHistory: battlefield.interviewHistory,
        breakthroughActive: battlefield.breakthroughActive,
        breakthroughPhase: battlefield.breakthroughPhase,
        forcedWorstCaseActive: battlefield.forcedWorstCaseActive,
        breakthroughConfirmedTruths: battlefield.breakthroughConfirmedTruths,
        lockedAsymmetricStrategyId: battlefield.lockedAsymmetricStrategyId,
        cognitiveBiasesDetected: battlefield.cognitiveBiasesDetected,
        redTeamLog: battlefield.redTeamLog,
      }],
    ];
    const timers = states.filter(([moduleId]) => moduleHydratedRef.current[moduleId]).map(([moduleId, state]) => window.setTimeout(() => {
      void saveBattleModule(battleId, moduleId, state, { source: 'user_session' })
        .catch((error) => setPersistenceError(error instanceof Error ? error.message : '战局模块保存失败，请重试。'));
    }, 300));
    return () => timers.forEach(window.clearTimeout);
  }, [session.activeBattle?.id, realityEchoes, conclaves, archonState, symbioteState, battlefield.emotionalTelemetry, battlefield.valueCalibrator, battlefield.metaphysicsTiming, battlefield.selectedPersona, battlefield.interviewHistory, battlefield.breakthroughActive, battlefield.breakthroughPhase, battlefield.forcedWorstCaseActive, battlefield.breakthroughConfirmedTruths, battlefield.lockedAsymmetricStrategyId, battlefield.cognitiveBiasesDetected, battlefield.redTeamLog, saveBattleModule]);

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
  const [selectedBattlefieldId, setSelectedBattlefieldId] = useState('');

  const updateBattlefield = React.useCallback((updater: React.SetStateAction<BattlefieldState>) => {
    setBattlefield(updater);
  }, []);

  useEffect(() => {
    const battleId = session.activeBattle?.id;
    if (!battleId) return;
    const timer = window.setTimeout(() => {
      void fetch(`/api/battles/${battleId}`, { method:'PATCH', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title:battlefield.title, objective:battlefield.subtitle, idealOutcome:battlefield.idealOutcome ?? session.activeBattle?.idealOutcome ?? undefined }) })
        .then((response) => { if (!response.ok) throw new Error(`战局元数据保存失败（${response.status}）。`); })
        .catch((error) => setPersistenceError(error instanceof Error ? error.message : '战局元数据保存失败，请重试。'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [session.activeBattle?.id, battlefield.title, battlefield.subtitle, battlefield.idealOutcome, battlefield.targetDeadlineDays]);

  useEffect(() => {
    const battle = session.activeBattle;
    if (!battle) return;
    moduleHydratedRef.current = {};
    const timer = window.setTimeout(() => {
      setSelectedBattlefieldId(battle.id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session.activeBattle]);

  // Battlefield List for War Rooms Management
  const [battlefieldList, setBattlefieldList] = useState<WarRoomItem[]>([]);

  useEffect(() => {
    if (!session.battles.length) return;
    const timer = window.setTimeout(() => setBattlefieldList(session.battles.map((battle) => ({ id:battle.id, title:battle.title, subtitle:battle.objective, status:battle.status === 'archived' ? 'ARCHIVED' : battle.status === 'closed' ? 'STABLE' : 'CRITICAL', updatedAt:new Date(battle.updatedAt).toLocaleString(), isShared:false, daysLeft:battle.hardDeadline ? Math.max(0, Math.ceil((new Date(battle.hardDeadline).getTime() - Date.now()) / 86400000)) : 0, confidence:0, industry:'现实决策推演' }))), 0);
    return () => window.clearTimeout(timer);
  }, [session.battles]);

  const handleSelectBattlefield = (item: WarRoomItem) => {
    const persisted = session.battles.find((battle) => battle.id === item.id);
    if (persisted) session.selectBattle(persisted);
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

  const handleArchiveBattlefield = async (item: WarRoomItem) => {
    try {
      await sessionApi.updateBattle(item.id, { status: item.status === 'ARCHIVED' ? 'active' : 'archived' });
      await session.refresh();
    } catch (error) { setPersistenceError(error instanceof Error ? error.message : '归档战局失败，请重试。'); }
  };

  const handleDeleteBattlefield = async (item: WarRoomItem) => {
    if (!window.confirm(`确认永久删除战局“${item.title}”？该操作不可恢复。`)) return;
    try {
      await sessionApi.deleteBattle(item.id);
      await session.refresh();
    } catch (error) { setPersistenceError(error instanceof Error ? error.message : '删除战局失败，请重试。'); }
  };

  const handleCreateNewBattlefield = async () => {
    try {
      const result = await sessionApi.create({ title:'新建现实决策战局', objective:'描述需要解决的现实问题', minimumOutcome:'', idealOutcome:'', opponentSummary:'', hardDeadline:new Date(Date.now() + 30 * 86400000).toISOString() });
      await session.refresh();
      setSelectedBattlefieldId(result.battle.id);
      setActiveMainView('WAR_ROOM');
      setActiveStandardTab('interview');
      soundManager.playSuccess();
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : '创建战局失败，请重试。');
    }
  };

  // Decision DNA storage
  const [dnaRecords, setDnaRecords] = useState<DecisionDNARecord[]>([]);

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
    const timer = window.setTimeout(() => {
      void saveBattleModule(battleId, 'decision-dna', { records: dnaRecords }, { source: 'user_session' })
        .catch((error) => setPersistenceError(error instanceof Error ? error.message : '决策 DNA 保存失败，请重试。'));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [session.activeBattle?.id, dnaRecords, saveBattleModule]);

  const handleSaveDNARecord = async (record: DecisionDNARecord) => {
    const battleId = session.activeBattle?.id;
    if (battleId) {
      const memory = await sessionApi.saveMemory({ battleId, title: record.battlefieldTitle, memory: { userKeyChoice: record.selectedStrategy, outcome: record.survivalOutcome, outcomeLabel: record.survivalOutcome, memoryQuote: record.userReflection, lessonLearned: record.extractedDNA.join('；'), timestamp: record.timestamp }, source: { type: 'decision_dna', recordId: record.id } });
      if (!memory) throw new Error('决策记忆保存失败，请重试。');
    }
    const updated = [record, ...dnaRecords];
    setDnaRecords(updated);
    // Gain bond EXP with Symbiote only after the server-side memory is saved.
    setSymbioteState(prev => ({
      ...prev,
      bondExp: Math.min(prev.maxBondExp, prev.bondExp + 50),
      totalBattlesFoughtTogether: prev.totalBattlesFoughtTogether + 1,
      victoriesTogether: record.survivalOutcome === 'SURVIVED' ? prev.victoriesTogether + 1 : prev.victoriesTogether,
    }));
  };

  // Equity manipulation
  const handleSpendEquity = (_amount: number, _reason: string): boolean => {
    // Never mutate a browser-side equity balance. Paid actions must go through
    // the platform gate/checkout flow and return an authoritative entitlement.
    setIsStoreModalOpen(true);
    return false;
  };

  const handleAddEquity = (_amount: number, _reason: string) => {
    // Rewards are credited by the platform ledger after server verification.
    setPersistenceError('权益奖励需由统一平台确认，当前不会在浏览器本地增加。');
  };

  // Calibration completion
  const handleCompleteCalibration = (profile: UserProfile, sigil: DeciderSigil, answers: AIPersonaType[]) => {
    setUserProfile((previous) => ({ ...profile, equityBalance: previous.equityBalance }));
    setIsCalibrated(true);
    setShowCalibrationFlow(false);
    setBattlefield(prev => ({
      ...prev,
      selectedPersona: profile.aiPersona,
    }));
    const dimensions: Array<'information' | 'reasoning' | 'resource' | 'time' | 'risk' | 'execution' | 'relationship'> = ['information', 'reasoning', 'resource'];
    void Promise.all(dimensions.map((dimension, index) => fetch('/api/battles/calibration', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimension,
        expected: null,
        actual: answers[index] ? 1 : 0,
        note: `首次认知校准：${answers[index] ?? profile.aiPersona}`,
      }),
    }))).then((responses) => {
      const failed = responses.find((response) => !response.ok);
      if (failed) throw new Error(`校准记录保存失败（${failed.status}）。`);
    }).catch((error) => setPersistenceError(error instanceof Error ? error.message : '校准记录保存失败，请重试。'));
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

  const handleImportObserverDraft = async (draft: SilentObserverAlert['suggestedBattlefieldDraft']) => {
    const result = await sessionApi.create({
      title: draft.title,
      objective: draft.dilemma,
      minimumOutcome: '',
      idealOutcome: '',
      opponentSummary: '由静默观察者工作流异常信号生成',
      hardDeadline: new Date(Date.now() + Math.max(1, draft.deadlineDays) * 86400000).toISOString(),
    });
    await session.refresh();
    session.selectBattle(result.battle);
    setActiveMainView('WAR_ROOM');
    setActiveStandardTab('cards');
  };

  const handleInterveneWorldEvent = (event: WorldPulseEvent) => {
    setBattlefield(prev => ({
      ...prev,
      subtitle: `${prev.subtitle} · 已介入世界脉冲：${event.code}`,
      targetDeadlineDays: Math.max(1, Math.round(event.expiresInMins / 60)),
    }));
    setActiveMainView('WAR_ROOM');
    handleLaunchSingularity();
  };

  // --- Handlers for 4 Masterpiece Puzzles ---
  
  // 1. Reality Echoes Handlers
  const handleResolveDustEvent = (echoId: string, eventId: string, option: CausalDustOption) => {
    if (option.costEquity > 0 && !session.activeBattle?.id) {
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
          resolvedAt: new Date().toISOString(),
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
    if (!echo || echo.finalRewardUnlocked || echo.rewardClaimStatus === 'pending_platform') return;

    // The reward is recorded as a completed module state; entitlement crediting is
    // performed by the platform ledger and must not be fabricated in the browser.
    setRealityEchoes(prev => prev.map(e => e.id === echoId ? { ...e, rewardClaimStatus: 'pending_platform' } : e));
    setPersistenceError('终局奖励申请已记录，等待统一平台权益核发；浏览器不会伪造入账。');
    soundManager.playSuccess();
  };

  // 2. Conclaves Handlers
  const handleInjectEquityToConclave = (conclaveId: string, amount: number) => {
    if (!session.activeBattle?.id && !handleSpendEquity(amount, '向密会公共资源池注入')) return;
    setConclaves(prev => prev.map(c => {
      if (c.id !== conclaveId) return c;
      return {
        ...c,
        collectiveEquityPool: c.collectiveEquityPool + amount,
      };
    }));
  };

  const handleCreateConclave = (newConclave: Partial<ObserverConclave>) => {
    if (!session.activeBattle?.id && !handleSpendEquity(100, '铸造专属密会公会')) return;
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
          joinedAt: new Date().toISOString(),
          isUser: true,
        },
      ],
      recentAnnouncements: [
        {
          id: 'anc-init',
          title: '密会正式建立',
          content: '密会公共因果网络已连通全服。',
            timestamp: new Date().toISOString(),
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
                executedAt: new Date().toISOString(),
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
      submittedAt: new Date().toISOString(),
      bountyEquityReward: 0,
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
          createdAt: new Date().toISOString(),
          upvotes: 0,
          isVerifiedByAethel: false,
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
      {persistenceError && <div className="fixed top-3 right-3 z-[100] max-w-sm rounded-xl border border-red-500/50 bg-red-950/90 px-4 py-3 text-xs text-red-100 shadow-xl">{persistenceError}<button className="ml-3 text-red-300 underline" onClick={() => setPersistenceError(null)}>关闭</button></div>}
      
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
        onOpenExportBrief={() => setIsExportModalOpen(true)}
        onOpenDNAArchive={() => setIsDNAModalOpen(true)}
        onResetToStandard={handleExitSingularity}
        isRiskTriggered={isRiskTriggered}
        selectedPersona={battlefield.selectedPersona || userProfile.aiPersona || 'ANALYST'}
        observerAlertCount={pendingDustCount + (battlefield.riskBreakers?.filter((breaker) => breaker.isTriggered).length ?? 0)}
        stressLevel={battlefield.emotionalTelemetry?.stress ?? 0}
        userEquity={userProfile.equityBalance}
        sigil={userProfile.sigil}
        currentBattlefieldTitle={battlefield.title}
        currentBattlefieldDays={battlefield.financials?.calculatedDays}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* VIEW 1: War Room (Standard 2-Column Workshop with Title Bar OR Ultimate Singularity Deduction) */}
        {activeMainView === 'WAR_ROOM' && (
          battlefield.breakthroughActive ? (
            <SingularityDeductionView
              battlefield={battlefield}
              battleId={session.activeBattle?.id ?? battlefield.id}
              onUpdateBattlefield={updateBattlefield}
              onExitSingularityMode={handleExitSingularity}
              onSaveDNARecord={handleSaveDNARecord}
            />
          ) : (
        <CausalWorkshopView
          battlefield={battlefield}
          battleId={session.activeBattle?.id ?? battlefield.id}
              onUpdateBattlefield={updateBattlefield}
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
            battleId={session.activeBattle?.id ?? battlefield.id}
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
              battleId={session.activeBattle?.id}
              battlefield={battlefield}
              onUpdateBattlefield={updateBattlefield}
            />
          </div>
        )}

        {/* VIEW 4: World's Pulse (Global 3D Earth Event Radar) */}
        {activeMainView === 'WORLD_PULSE' && (
          <WorldPulseView
            battleId={session.activeBattle?.id}
            userEquity={userProfile.equityBalance}
            onSpendEquity={handleSpendEquity}
            onInterveneEvent={handleInterveneWorldEvent}
          />
        )}

        {/* VIEW 5: Anonymous Case Study Lab */}
        {activeMainView === 'CASE_LAB' && (
          <div className="space-y-4">
            <CaseStudyLabView
              battleId={session.activeBattle?.id}
            />
          </div>
        )}

        {/* VIEW 6: Cognitive DNA Sandbox */}
        {activeMainView === 'COGNITIVE_DNA' && (
          <div className="space-y-4">
            <CognitiveDNASandbox
              dnaRecords={dnaRecords}
              battleId={session.activeBattle?.id}
            />
          </div>
        )}

        {/* VIEW 7: Skill Marketplace & Token Economy */}
        {activeMainView === 'MARKETPLACE' && (
          <div className="space-y-4">
            <SkillMarketplaceView
              battleId={session.activeBattle?.id}
              userEquity={userProfile.equityBalance}
              onRequestPurchase={() => setIsStoreModalOpen(true)}
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
      {profileHydrated && showCalibrationFlow && (
        <CalibrationFlow
          onCompleteCalibration={handleCompleteCalibration}
          onCancel={() => setShowCalibrationFlow(false)}
        />
      )}

      {/* 1. Reality Echoes Modal (后果的重量 - 现实回响与因果尘埃) */}
      <RealityEchoesModal
        isOpen={isRealityEchoesModalOpen}
        onClose={() => setIsRealityEchoesModalOpen(false)}
        battleId={session.activeBattle?.id}
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
        battleId={session.activeBattle?.id}
      />

      {/* 3. AI Symbiote Hub Modal (情感的纽带 - AI共生体中枢) */}
      <AISymbioteModal
        isOpen={isAISymbioteModalOpen}
        onClose={() => setIsAISymbioteModalOpen(false)}
        battleId={session.activeBattle?.id}
        symbiote={symbioteState}
        onUpdateSymbioteName={handleUpdateSymbioteName}
      />

      {/* Deep Archives Modal (History Snaps & Easter Egg) */}
      <DeepArchivesModal
        isOpen={isDeepArchivesModalOpen}
        onClose={() => setIsDeepArchivesModalOpen(false)}
        battleId={session.activeBattle?.id}
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
        battleId={session.activeBattle?.id ?? battlefield.id}
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
        calculatedDays={battlefield.financials?.calculatedDays ?? 0}
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
        battleId={session.activeBattle?.id}
      />

      {/* Emotional Telemetry HUD */}
      <EmotionalTelemetryModal
        isOpen={isEmotionalModalOpen}
        onClose={() => setIsEmotionalModalOpen(false)}
        battlefield={battlefield}
        onUpdateBattlefield={updateBattlefield}
      />

      {/* Value Calibrator Modal */}
      <ValueCalibratorModal
        isOpen={isValueModalOpen}
        onClose={() => setIsValueModalOpen(false)}
        battlefield={battlefield}
        onUpdateBattlefield={updateBattlefield}
      />

      {/* Metaphysics Timing Modal */}
      <MetaphysicsTimingModal
        isOpen={isMetaphysicsModalOpen}
        onClose={() => setIsMetaphysicsModalOpen(false)}
        battlefield={battlefield}
        onUpdateBattlefield={updateBattlefield}
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
            onArchiveBattlefield={handleArchiveBattlefield}
            onDeleteBattlefield={handleDeleteBattlefield}
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
