import React, { useRef, useState } from 'react';
import { 
  Plus, 
  GitBranch, 
  Skull, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Flame, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  X,
  Layers,
  HelpCircle,
  Activity,
  Crosshair,
  Zap,
  Target
} from 'lucide-react';
import { 
  BattlefieldState, 
  StrategyBranch, 
  StrategyType, 
  GravityNode, 
  CardAsset, 
  EPISTEMIC_TAG_CONFIG 
} from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';

interface PathSimulationTabProps {
  battlefield: BattlefieldState;
  battleId: string;
  readOnly?: boolean;
  onUpdateBattlefield: (updater: (prev: BattlefieldState) => BattlefieldState) => void;
  onTriggerBreakthrough: () => void;
}

export const PathSimulationTab: React.FC<PathSimulationTabProps> = ({
  battlefield,
  battleId,
  readOnly = false,
  onUpdateBattlefield,
  onTriggerBreakthrough,
}) => {
  const [selectedNode, setSelectedNode] = useState<GravityNode | null>(null);
  const [activeStrategyTypeModal, setActiveStrategyTypeModal] = useState<StrategyType | null>(null);
  const [strategyName, setStrategyName] = useState('');
  const [strategyDesc, setStrategyDesc] = useState('');
  const [strategyCost, setStrategyCost] = useState('');
  const [strategySignal, setStrategySignal] = useState('');
  const [strategyDay, setStrategyDay] = useState(14);
  const [selectedCardsForNewStrategy, setSelectedCardsForNewStrategy] = useState<string[]>([]);
  const [hoveredStratId, setHoveredStratId] = useState<string | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const [activeCommitmentId, setActiveCommitmentId] = useState<string | null>(null);
  const [commitPending, setCommitPending] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState<string | null>(null);
  const moduleHydratedRef = useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    moduleHydratedRef.current = false;
    void sessionApi.module(battleId, 'path-simulation').then(({ state }) => {
      const envelope = state as { state?: unknown } | null;
      const saved = (envelope?.state && typeof envelope.state === 'object' ? envelope.state : state) as { strategies?: unknown } | null;
      if (!cancelled && Array.isArray(saved?.strategies)) {
        const restored = saved.strategies.filter((item): item is StrategyBranch => Boolean(item && typeof item === 'object' && typeof (item as StrategyBranch).id === 'string'));
        if (restored.length) onUpdateBattlefield((previous) => previous.strategies.length ? previous : { ...previous, strategies: restored });
      }
      moduleHydratedRef.current = true;
    }).catch((error) => {
      if (!cancelled) setPersistenceMessage(error instanceof Error ? error.message : '路径草案读取失败，请重试。');
      moduleHydratedRef.current = true;
    });
    return () => { cancelled = true; };
  }, [battleId, onUpdateBattlefield]);

  React.useEffect(() => {
    if (readOnly || !moduleHydratedRef.current) return;
    const timer = window.setTimeout(() => {
      void sessionApi.saveModule(battleId, 'path-simulation', { strategies: battlefield.strategies }, { source: 'path_simulation' })
        .catch((error) => setPersistenceMessage(error instanceof Error ? error.message : '路径草案保存失败，请重试。'));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [battleId, battlefield.strategies, readOnly]);

  React.useEffect(() => {
    let cancelled = false;
    void sessionApi.analysis(battleId).then(async (result) => {
      // A freshly created battle may not have a generated analysis yet. Ask
      // the canonical battle service to derive its first gravity line and
      // junctions from the persisted facts/constraints before rendering the
      // sandbox; this keeps the UI from silently presenting an empty model.
      const resolved = result.junctions.length ? result : await sessionApi.generateAnalysis(battleId, {
        availableCash: battlefield.financials.availableCash,
        monthlyBurn: battlefield.financials.monthlyBurn,
        monthlyIncomeWithoutClient: battlefield.financials.monthlyIncomeWithoutClient,
      });
      const gravityNodes: GravityNode[] = resolved.junctions.map((junction, index) => {
        const urgency = typeof junction.urgency === 'number' ? junction.urgency : 3;
        const leverage = typeof junction.leverage === 'number' ? junction.leverage : 3;
        const irreversibility = typeof junction.irreversibility === 'number' ? junction.irreversibility : 3;
        const score = Math.max(1, Math.min(100, Math.round((urgency + leverage + irreversibility) / 15 * 100)));
        return {
          id: String(junction.id),
          day: index + 1,
          title: String(junction.title ?? '决策节点'),
          type: score >= 80 ? 'FATAL' : score >= 60 ? 'WARNING' : index === 0 ? 'NOW' : 'MILESTONE',
          description: String(junction.description ?? ''),
          impactScore: score,
          aiDefaultPrediction: String(junction.defaultConsequence ?? '请先验证该节点的事实与约束。'),
        };
      });
      const loaded = resolved.moves.map((move) => {
        const source = move.source && typeof move.source === 'object' ? move.source as Record<string, unknown> : {};
        return {
        id: String(move.id), name: String(move.title ?? '未命名策略'), type: move.kind === 'strong_attack' ? 'AGGRESSIVE' : move.kind === 'hedge' ? 'HEDGE' : 'PROBING', typeLabel: move.kind === 'strong_attack' ? '强攻手' : move.kind === 'hedge' ? '对冲手' : '试局手', description: String(move.rationale ?? ''), targetTimelineDay: typeof source.targetTimelineDay === 'number' ? source.targetTimelineDay : 14, assignedCardIds: Array.isArray(source.assignedCardIds) ? source.assignedCardIds.filter((value): value is string => typeof value === 'string') : [], costDescription: JSON.stringify(move.cost ?? {}), successSignal: JSON.stringify(move.validation ?? {}), estimatedSurvivalProb: typeof source.estimatedSurvivalProb === 'number' ? source.estimatedSurvivalProb : 50, status: move.state === 'selected' ? 'LOCKED' : move.state === 'executing' ? 'EXECUTING' : 'PROPOSED',
      } as StrategyBranch;
      });
      if (!cancelled) onUpdateBattlefield((previous) => ({ ...previous, gravityNodes, ...(loaded.length ? { strategies: loaded } : {}) }));
    }).catch((error) => { if (!cancelled) setPersistenceMessage(error instanceof Error ? error.message : '策略列表读取失败，请重试。'); });
    return () => { cancelled = true; };
  }, [battleId, battlefield.financials.availableCash, battlefield.financials.monthlyBurn, battlefield.financials.monthlyIncomeWithoutClient, onUpdateBattlefield]);

  React.useEffect(() => {
    let cancelled = false;
    void sessionApi.commitment(battleId).then(({ commitment }) => {
      if (!cancelled) setActiveCommitmentId(commitment ? String(commitment.moveId) : null);
    }).catch((error) => { if (!cancelled) setPersistenceMessage(error instanceof Error ? error.message : '当前锁定策略读取失败，请重试。'); });
    return () => { cancelled = true; };
  }, [battleId]);

  const handleOpenAddStrategy = (type: StrategyType) => {
    if (readOnly) return;
    setActiveStrategyTypeModal(type);
    setStrategyName(
      type === 'AGGRESSIVE' ? '核心阵地饱和强攻手' :
      type === 'PROBING' ? '低成本敏捷试局手' : '下行保底对冲手'
    );
    setStrategyDesc('');
    setStrategyCost(type === 'AGGRESSIVE' ? '投入¥40,000及全员70%精力' : '¥5,000试错预算');
    setStrategySignal(type === 'AGGRESSIVE' ? '关键决策人签署排他协议' : '获取竞对核心漏洞情报');
    setStrategyDay(type === 'AGGRESSIVE' ? 14 : type === 'PROBING' ? 7 : 25);
    setSelectedCardsForNewStrategy([]);
    soundManager.playBlip(650, 0.03);
  };

  const handleSaveStrategy = () => {
    if (readOnly) return;
    if (!strategyName.trim() || !activeStrategyTypeModal) return;

    const newStrat: StrategyBranch = {
      id: `strat-${Date.now()}`,
      name: strategyName,
      type: activeStrategyTypeModal,
      typeLabel: activeStrategyTypeModal === 'AGGRESSIVE' ? '强攻手' : activeStrategyTypeModal === 'PROBING' ? '试局手' : '对冲手',
      description: strategyDesc,
      targetTimelineDay: strategyDay,
      assignedCardIds: selectedCardsForNewStrategy,
      costDescription: strategyCost,
      successSignal: strategySignal,
      estimatedSurvivalProb: activeStrategyTypeModal === 'AGGRESSIVE' ? 55 : activeStrategyTypeModal === 'PROBING' ? 40 : 65,
      status: 'PROPOSED',
    };

    onUpdateBattlefield(prev => ({
      ...prev,
      strategies: [...prev.strategies, newStrat],
    }));

    void sessionApi.analysis(battleId).then(async ({ junctions }) => {
      const junctionId = typeof junctions[0]?.id === 'string' ? junctions[0].id : null;
      if (!junctionId) { setPersistenceMessage('策略已保存在当前草稿；创建因果节点后才能写入服务端。'); return; }
      const saved = await sessionApi.saveMoves(battleId, junctionId, [{ kind: activeStrategyTypeModal === 'AGGRESSIVE' ? 'strong_attack' : activeStrategyTypeModal === 'HEDGE' ? 'hedge' : 'probe', title: strategyName, rationale: strategyDesc, cost: { description: strategyCost }, validation: { signal: strategySignal }, actions: [], source: { layer: 'path_simulation', assignedCardIds: selectedCardsForNewStrategy, targetTimelineDay: strategyDay, estimatedSurvivalProb: newStrat.estimatedSurvivalProb } }]);
      const persisted = saved.moves[0] as Record<string, unknown> | undefined;
      if (persisted?.id) onUpdateBattlefield(previous => ({ ...previous, strategies: previous.strategies.map(item => item.id === newStrat.id ? { ...item, id: String(persisted.id) } : item) }));
      setPersistenceMessage('策略草案已写入战局。');
    }).catch((error) => setPersistenceMessage(error instanceof Error ? error.message : '策略保存失败，请重试。'));

    setActiveStrategyTypeModal(null);
    soundManager.playBlip(850, 0.04);
  };

  const handleCommitStrategy = async (strategyId: string) => {
    if (readOnly) return;
    if (!/^[0-9a-f-]{36}$/i.test(strategyId)) {
      setPersistenceMessage('该策略仍在本地草稿状态，请先保存成功后再锁定。');
      return;
    }
    setCommitPending(strategyId);
    try {
      const result = await sessionApi.commitMove(battleId, strategyId);
      setActiveCommitmentId(String(result.commitment.moveId));
      onUpdateBattlefield(previous => ({ ...previous, strategies: previous.strategies.map(item => ({ ...item, status: item.id === strategyId ? 'LOCKED' : item.status })) }));
      setPersistenceMessage('策略已锁定并生成落子令。');
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : '策略锁定失败，请重试。');
    } finally { setCommitPending(null); }
  };

  const handleDeleteStrategy = async (stratId: string) => {
    if (readOnly) return;
    if (deletePending) return;
    setDeletePending(stratId);
    try {
      if (/^[0-9a-f-]{36}$/i.test(stratId)) await sessionApi.deleteMove(battleId, stratId);
      onUpdateBattlefield(prev => ({ ...prev, strategies: prev.strategies.filter(s => s.id !== stratId) }));
      setPersistenceMessage('策略草案已删除。');
      soundManager.playBlip(400, 0.03);
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : '删除策略失败，请重试。');
    } finally { setDeletePending(null); }
  };

  const toggleAssignCard = (strategyId: string, cardId: string) => {
    if (readOnly) return;
    const current = battlefield.strategies.find((strategy) => strategy.id === strategyId);
    const nextAssignedCardIds = current
      ? (current.assignedCardIds.includes(cardId) ? current.assignedCardIds.filter((id) => id !== cardId) : [...current.assignedCardIds, cardId])
      : [];
    onUpdateBattlefield(prev => ({
      ...prev,
      strategies: prev.strategies.map(s => {
        if (s.id === strategyId) {
          const has = s.assignedCardIds.includes(cardId);
          return {
            ...s,
            assignedCardIds: has ? s.assignedCardIds.filter(id => id !== cardId) : [...s.assignedCardIds, cardId],
          };
        }
        return s;
      }),
    }));
    if (/^[0-9a-f-]{36}$/i.test(strategyId) && current?.status === 'PROPOSED') {
      void sessionApi.updateMoveSource(battleId, strategyId, {
        layer: 'path_simulation',
        assignedCardIds: nextAssignedCardIds,
        targetTimelineDay: current.targetTimelineDay,
        estimatedSurvivalProb: current.estimatedSurvivalProb,
      }).catch((error) => setPersistenceMessage(error instanceof Error ? error.message : '策略底牌挂载保存失败，请重试。'));
    }
    soundManager.playBlip(750, 0.02);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Gravity vs Choice Narrative */}
      <div className="surface-obsidian rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <GitBranch className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              路径推演沙盘 · 宿命重力线 vs 主动策略分支
            </h2>
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold uppercase">
              SAND-TABLE ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            红色重力线为“不作为时的自然沉沦死线”。通过布设强攻手、试局手与对冲手，扭转概率重力场。
          </p>
        </div>
        {persistenceMessage ? <div className="text-xs text-cyan-300">{persistenceMessage}</div> : null}

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenAddStrategy('AGGRESSIVE')}
            disabled={readOnly}
            className="px-3.5 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-700/60 hover:border-blue-500 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 强攻手</span>
          </button>
          <button
            onClick={() => handleOpenAddStrategy('PROBING')}
            disabled={readOnly}
            className="px-3.5 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-700/60 hover:border-purple-500 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 试局手</span>
          </button>
          <button
            onClick={() => handleOpenAddStrategy('HEDGE')}
            disabled={readOnly}
            className="px-3.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 hover:border-amber-500 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 对冲手</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Sand-Table Timeline Canvas */}
      <div className="surface-obsidian rounded-2xl p-6 shadow-2xl relative overflow-hidden border border-white/[0.08] hud-corner">
        
        {/* Top Sand-Table Telemetry Readout */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4 text-xs font-mono-code">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300 font-bold">
              <Crosshair className="w-3.5 h-3.5 text-red-400" />
              <span>TIMELINE TELEMETRY</span>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">RANGE: DAY 0 → DAY 67</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-2 h-0.5 bg-red-500 inline-block"></span>
              <span>宿命重力轨迹 (Doom Drift)</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-0.5 bg-emerald-400 inline-block"></span>
              <span>逃逸破局路径 (Escape Vector)</span>
            </span>
          </div>
        </div>

        {/* Tactical SVG Simulation Chart */}
        <div className="relative w-full h-[220px] bg-black/40 rounded-xl border border-white/[0.05] p-2 overflow-hidden mb-6">
          <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
            <defs>
              {/* Gradients */}
              <linearGradient id="doomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="doomArea" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="escapeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#10b981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="0" y1="50" x2="800" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <line x1="0" y1="100" x2="800" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <line x1="0" y1="150" x2="800" y2="150" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

            <line x1="200" y1="0" x2="200" y2="200" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />
            <line x1="400" y1="0" x2="400" y2="200" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />
            <line x1="600" y1="0" x2="600" y2="200" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />

            {/* Doom Area Fill */}
            <path
              d="M 50 40 Q 250 80, 450 140 T 750 185 L 750 200 L 50 200 Z"
              fill="url(#doomArea)"
            />

            {/* Gravity Doom Curve */}
            <path
              d="M 50 40 Q 250 80, 450 140 T 750 185"
              fill="none"
              stroke="url(#doomGradient)"
              strokeWidth="3.5"
              strokeDasharray="6 4"
            />

            {/* Escape Vectors (Strategy Branches) */}
            <path
              d="M 220 75 C 320 60, 480 35, 750 30"
              fill="none"
              stroke="url(#escapeGradient)"
              strokeWidth="3"
              strokeLinecap="round"
            />

            <path
              d="M 120 52 C 240 65, 450 70, 750 65"
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray="4 3"
              opacity="0.85"
            />

            {/* Key Critical Doom Waypoints */}
            <circle cx="50" cy="40" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
            <text x="50" y="28" fill="#93c5fd" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">Day 0 (现状)</text>

            <circle cx="450" cy="140" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
            <text x="450" y="128" fill="#fcd34d" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">Day 30 (决策关门)</text>

            <circle cx="750" cy="185" r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
            <text x="730" y="172" fill="#fca5a5" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">Day 67 (现金归零断崖)</text>

            {/* Escape Target Marker */}
            <circle cx="750" cy="30" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <text x="730" y="22" fill="#6ee7b7" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">反转突破 (+82% 胜算)</text>
          </svg>
        </div>

        {/* Milestone Node Points on the Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {battlefield.gravityNodes.map((node, idx) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <div 
                key={node.id}
                onClick={() => {
                  setSelectedNode(node);
                  soundManager.playBlip(700, 0.04);
                }}
                className={`card-tactical rounded-2xl p-4 border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-blue-950/60 hud-corner'
                    : 'border-white/[0.08] hover:border-white/[0.2]'
                }`}
              >
                <div className="card-tactical-holo absolute inset-0 pointer-events-none opacity-30"></div>

                <div className="flex items-center justify-between mb-2 text-[10px] font-mono-code">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
                    node.type === 'NOW'
                      ? 'bg-blue-950 text-blue-300 border-blue-700'
                      : node.type === 'WARNING'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                  }`}>
                    DAY {node.day} · {node.type === 'NOW' ? '现状基准' : node.type === 'WARNING' ? '决策关门点' : '清算死线'}
                  </span>
                  <span className={`font-bold ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}>
                    {isSelected ? '● 正在推演' : '点击推演'}
                  </span>
                </div>

                <h5 className="text-xs font-bold text-white mb-1">{node.title}</h5>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{node.description}</p>
              </div>
            );
          })}
        </div>

        {/* Selected Gravity Node AI Prediction Drawer */}
        {selectedNode && (
          <div className="p-5 surface-obsidian border border-blue-500/50 rounded-2xl shadow-2xl space-y-3 mb-6 animate-in fade-in duration-200 hud-corner">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white font-mono-code">
                  节点深度推演: Day {selectedNode.day} - {selectedNode.title}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕ 关闭
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.description}</p>
            <div className="bg-blue-950/40 p-3.5 rounded-xl border border-blue-800/60 text-xs text-blue-200 leading-relaxed font-mono-code">
              <strong className="text-amber-300 block mb-1">AI 首席顾问前瞻推演结论:</strong> 
              {selectedNode.aiDefaultPrediction}
            </div>
          </div>
        )}

        {/* Active Strategy Branches Overlay */}
        <div className="space-y-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>当前已布设的主动博弈策略分支 (Active Strategy Tracks)</span>
            </h4>
            <span className="text-[11px] font-mono-code text-slate-400">
              共 {battlefield.strategies.length} 条博弈分支
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {battlefield.strategies.map((strat, index) => {
              const assignedCards = battlefield.assets.filter(a => strat.assignedCardIds.includes(a.id));
              const isAggressive = strat.type === 'AGGRESSIVE';
              const isProbing = strat.type === 'PROBING';
              const stratCode = `STRAT-${isAggressive ? 'ATK' : isProbing ? 'PRB' : 'HDG'}-#0${index + 1}`;

              return (
                <div
                  key={strat.id}
                  className={`card-tactical rounded-2xl p-5 border transition-all duration-300 shadow-2xl flex flex-col justify-between relative overflow-hidden group ${
                    isAggressive
                      ? 'border-blue-600/70 hover:border-blue-400 shadow-blue-950/30'
                      : isProbing
                      ? 'border-purple-600/70 hover:border-purple-400 shadow-purple-950/30'
                      : 'border-amber-600/70 hover:border-amber-400 shadow-amber-950/30'
                  }`}
                >
                  <div className="card-tactical-holo absolute inset-0 pointer-events-none opacity-30"></div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/[0.05] text-[10px] font-mono-code">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold">[{stratCode}]</span>
                        <span className={`px-2 py-0.2 rounded-full font-bold border ${
                          isAggressive
                            ? 'bg-blue-950 text-blue-300 border-blue-700'
                            : isProbing
                            ? 'bg-purple-950 text-purple-300 border-purple-700'
                            : 'bg-amber-950 text-amber-300 border-amber-700'
                        }`}>
                          {strat.typeLabel} · Day {strat.targetTimelineDay}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteStrategy(strat.id)}
                        className="text-slate-400 hover:text-red-400 text-xs p-1 cursor-pointer transition-colors"
                        title="删除此策略"
                      >
                        ✕
                      </button>
                    </div>

                    <h5 className="text-xs font-bold text-white mb-1.5">{strat.name}</h5>
                    <p className="text-xs text-slate-300 mb-3.5 leading-relaxed">{strat.description}</p>

                    <div className="space-y-1.5 text-xs bg-black/60 p-3 rounded-xl border border-white/[0.05] mb-3.5 font-mono-code">
                      <div className="text-slate-400">
                        <strong className="text-slate-300">投入代价:</strong> {strat.costDescription}
                      </div>
                      <div className="text-slate-400">
                        <strong className="text-slate-300">突破信号:</strong> <span className="text-emerald-300 font-bold">{strat.successSignal}</span>
                      </div>
                    </div>

                    {/* Attached Cards */}
                    <div className="mb-3">
                      <span className="text-[10px] text-slate-400 font-mono-code block mb-1.5">
                        挂载底牌资产 ({assignedCards.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedCards.length === 0 ? (
                          <span className="text-[10px] text-slate-500 italic">暂未挂载底牌 (从下方资产池点击挂载)</span>
                        ) : (
                          assignedCards.map(c => (
                            <span key={c.id} className="text-[10px] bg-black/70 text-slate-200 border border-white/[0.1] px-2 py-0.5 rounded-lg flex items-center gap-1 font-mono-code">
                              <span>{c.title}</span>
                              <button 
                                onClick={() => toggleAssignCard(strat.id, c.id)}
                                className="text-slate-400 hover:text-red-300 ml-0.5 cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono-code">
                    <span className="text-slate-400">预估突破存活率:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-400 text-sm">{strat.estimatedSurvivalProb}%</span>
                      {activeCommitmentId === strat.id || strat.status === 'LOCKED' ? <span className="text-[10px] text-emerald-300">已锁定</span> : <button onClick={() => void handleCommitStrategy(strat.id)} disabled={readOnly || commitPending === strat.id} className="rounded bg-blue-700 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50">{commitPending === strat.id ? '锁定中…' : '锁定策略'}</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


      </div>

      {/* Available Assets Pool for Drag/Click Assignment */}
      <div className="surface-obsidian rounded-2xl p-5 shadow-2xl space-y-3.5 border border-white/[0.08] hud-corner">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>底牌资产配置池 (点击资产卡片一键挂载至对应博弈策略)</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-mono-code">将有限筹码压向最有胜算的支点</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {battlefield.assets.map((asset) => {
            const tagMeta = EPISTEMIC_TAG_CONFIG[asset.tag];
            return (
              <div
                key={asset.id}
                className="card-tactical border border-white/[0.08] hover:border-white/[0.25] rounded-xl p-3.5 text-xs transition-all flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] px-2 py-0.2 rounded font-mono-code font-bold border ${tagMeta.bgColor} ${tagMeta.borderColor} ${tagMeta.textColor}`}>
                      {tagMeta.label}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono-code font-bold">{asset.confidence}% 置信</span>
                  </div>
                  <h6 className="font-bold text-white line-clamp-1">{asset.title}</h6>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{asset.description}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono-code">挂载至:</span>
                  <div className="flex gap-1">
                    {battlefield.strategies.map((strat, idx) => {
                      const isAttached = strat.assignedCardIds.includes(asset.id);
                      return (
                        <button
                          key={strat.id}
                          onClick={() => toggleAssignCard(strat.id, asset.id)}
                          className={`text-[10px] px-2.5 py-0.5 rounded font-mono-code font-bold transition-all cursor-pointer ${
                            isAttached
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-black/60 text-slate-400 hover:text-white border border-white/[0.08] hover:border-white/[0.2]'
                          }`}
                          title={`挂载至策略 #${idx + 1}`}
                        >
                          #{idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Add Strategy Modal */}
      {activeStrategyTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e131d] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-400" />
                <span>新建主动策略分支 · {activeStrategyTypeModal === 'AGGRESSIVE' ? '强攻手' : activeStrategyTypeModal === 'PROBING' ? '试局手' : '对冲手'}</span>
              </h3>
              <button onClick={() => setActiveStrategyTypeModal(null)} className="text-slate-400 hover:text-white text-xs p-1">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">策略代号 / 核心主张</label>
                <input
                  type="text"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">策略行动逻辑</label>
                <textarea
                  value={strategyDesc}
                  onChange={(e) => setStrategyDesc(e.target.value)}
                  placeholder="具体如何调动资源，在哪个节点实施饱和打击或低成本试探..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">实施目标时间点 (Day)</label>
                  <input
                    type="number"
                    value={strategyDay}
                    onChange={(e) => setStrategyDay(Number(e.target.value))}
                    min={1}
                    max={60}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono-code"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">投入代价与消耗</label>
                  <input
                    type="text"
                    value={strategyCost}
                    onChange={(e) => setStrategyCost(e.target.value)}
                    placeholder="如 ¥30,000 专项预算"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">判定突破的成功信号 (Success Signal)</label>
                <input
                  type="text"
                  value={strategySignal}
                  onChange={(e) => setStrategySignal(e.target.value)}
                  placeholder="如 关键VP同意重启谈判"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveStrategyTypeModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSaveStrategy}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                布设策略
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
