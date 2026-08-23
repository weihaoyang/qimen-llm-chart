/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ObserverConclave, 
  ConclaveMember, 
  CollectiveSimulationSession,
  DeciderSigil
} from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { 
  Shield, 
  Users, 
  Flame, 
  Trophy, 
  Zap, 
  Plus, 
  Sparkles, 
  Eye, 
  ChevronRight, 
  CheckCircle2, 
  Lock, 
  Globe, 
  Layers, 
  Share2,
  ArrowUpRight,
  TrendingUp,
  Award
} from 'lucide-react';

interface ObserverConclavesViewProps {
  conclaves: ObserverConclave[];
  userEquity: number;
  onInjectEquityToConclave: (conclaveId: string, amount: number) => void;
  onCreateConclave: (newConclave: Partial<ObserverConclave>) => void;
  onJoinCollectiveSimulation: (conclaveId: string, simulationId: string, actionName: string) => void;
  onOpenStoreModal?: () => void;
}

export const ObserverConclavesView: React.FC<ObserverConclavesViewProps> = ({
  conclaves,
  userEquity,
  onInjectEquityToConclave,
  onCreateConclave,
  onJoinCollectiveSimulation,
  onOpenStoreModal,
}) => {
  const [selectedConclaveId, setSelectedConclaveId] = useState<string>(conclaves[0]?.id || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [equityInput, setEquityInput] = useState<number>(50);
  const [newActionInput, setNewActionInput] = useState<string>('');

  // Form states for creating a Conclave
  const [newName, setNewName] = useState('');
  const [newCodeName, setNewCodeName] = useState('');
  const [newDoctrine, setNewDoctrine] = useState('');
  const [newGlowColor, setNewGlowColor] = useState('#38bdf8');

  const currentConclave = conclaves.find(c => c.id === selectedConclaveId) || conclaves[0];

  const handleInject = () => {
    if (!currentConclave) return;
    if (userEquity < equityInput) {
      soundManager.playBlip(400, 0.08);
      if (onOpenStoreModal) onOpenStoreModal();
      return;
    }
    onInjectEquityToConclave(currentConclave.id, equityInput);
    soundManager.playSuccess();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDoctrine.trim()) return;

    onCreateConclave({
      name: newName,
      codeName: newCodeName.toUpperCase() || 'NEW CONCLAVE',
      doctrine: newDoctrine,
      glowColor: newGlowColor,
      level: 1,
      membersCount: 1,
      maxMembers: 10,
      collectiveEquityPool: 100,
      intervenedWorldEventsCount: 0,
      globalRank: conclaves.length + 1,
      isUserMember: true,
      userRole: 'GRAND_MASTER',
    });

    setShowCreateModal(false);
    setNewName('');
    setNewDoctrine('');
    soundManager.playSuccess();
  };

  const handleAddSynchronizedAction = (simId: string) => {
    if (!newActionInput.trim() || !currentConclave) return;
    onJoinCollectiveSimulation(currentConclave.id, simId, newActionInput);
    setNewActionInput('');
    soundManager.playStrategyLocked();
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner */}
      <div className="surface-obsidian border border-sky-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-950 border border-sky-500/40 text-sky-300">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-serif-sc font-bold text-white tracking-tight">
                观测者密会 (Observer Conclaves)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-sky-950/80 border border-sky-500/60 text-sky-300">
                组织的崛起 · 第二拼图
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono-code">
              跨越个体单打独斗，组建高阶因果博弈公会。注入集体资源池，开启 10+ 人超大规模同步推演。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono-code flex items-center gap-2">
              <span className="text-slate-400">可用权益:</span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {userEquity} 点
              </span>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-mono-code font-bold flex items-center gap-1.5 shadow-lg shadow-sky-950 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>铸造新密会 (消耗 100 权益)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Conclave Leaderboard & Selection (4 cols), Right Detail Hub (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Conclaves List & Global Leaderboard */}
        <div className="lg:col-span-4 space-y-4">
          <div className="surface-obsidian border border-white/[0.08] rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-xs font-mono-code">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                全球密会天梯榜 (TOP CONCLAVES)
              </span>
              <span className="text-slate-400 text-[11px]">全局排序</span>
            </div>

            <div className="space-y-2.5">
              {conclaves.map((conclave) => {
                const isSelected = conclave.id === currentConclave?.id;
                return (
                  <div
                    key={conclave.id}
                    onClick={() => {
                      setSelectedConclaveId(conclave.id);
                      soundManager.playBlip(750, 0.03);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-500/70 shadow-lg shadow-sky-950/30'
                        : 'bg-black/30 border-white/[0.06] hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono-code font-bold ${
                          conclave.globalRank === 1 
                            ? 'bg-amber-400 text-black' 
                            : conclave.globalRank === 2 
                            ? 'bg-slate-300 text-black' 
                            : 'bg-amber-900 text-amber-200'
                        }`}>
                          #{conclave.globalRank}
                        </span>
                        <h3 className="text-xs font-bold text-white">{conclave.name}</h3>
                      </div>
                      {conclave.isUserMember && (
                        <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700">
                          我的密会
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 font-mono-code line-clamp-1 italic mb-2">
                      {conclave.doctrine}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400 pt-2 border-t border-white/[0.04]">
                      <span className="flex items-center gap-1 text-sky-300">
                        <Users className="w-3 h-3" />
                        {conclave.membersCount} / {conclave.maxMembers} 席
                      </span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Zap className="w-3 h-3" />
                        {conclave.collectiveEquityPool} 资源池
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Conclave Dashboard, Resource Pool & Collective Simulation (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {currentConclave ? (
            <>
              {/* Conclave Banner & Doctrine */}
              <div className="surface-obsidian border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono-code px-2 py-0.5 rounded bg-sky-950 border border-sky-600 text-sky-300">
                        LV.{currentConclave.level} 密会公会
                      </span>
                      <span className="text-xs font-mono-code text-slate-500">
                        代号: {currentConclave.codeName}
                      </span>
                    </div>
                    <h2 className="text-xl font-serif-sc font-bold text-white mt-1">
                      {currentConclave.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono-code">
                      <span className="text-[10px] text-slate-500 block">公会公共资源池</span>
                      <span className="text-lg font-bold text-amber-400 flex items-center justify-end gap-1">
                        <Zap className="w-4 h-4 text-amber-400" />
                        {currentConclave.collectiveEquityPool} 点
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] text-xs text-sky-200/90 font-serif-sc leading-relaxed italic">
                  {currentConclave.doctrine}
                </div>

                {/* Inject Equity to Collective Pool */}
                {currentConclave.isUserMember && (
                  <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        向组织资源池注入推演权益
                      </span>
                      <p className="text-[11px] text-slate-400 font-mono-code">
                        公共资源池用于集体启动高维世界脉搏大型事件，并为全体成员带来 +15% α-加成
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="10"
                        max="500"
                        step="10"
                        value={equityInput}
                        onChange={(e) => setEquityInput(Number(e.target.value))}
                        className="w-20 bg-black/60 border border-white/[0.15] rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-mono-code font-bold focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={handleInject}
                        className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono-code font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md"
                      >
                        <span>注入</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 10+ Player Collective Synchronized Simulation Section */}
              <div className="surface-obsidian border border-red-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-red-400" />
                    <h3 className="text-sm font-bold text-white font-mono-code">
                      密会大型协同推演战役 (Collective Sync Simulation)
                    </h3>
                  </div>
                  <span className="text-xs font-mono-code px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 font-bold animate-pulse">
                    多成员实时收敛中
                  </span>
                </div>

                {currentConclave.activeCollectiveSimulations?.map((sim) => (
                  <div 
                    key={sim.id}
                    className="p-5 rounded-2xl bg-black/60 border border-red-900/50 space-y-4 shadow-2xl"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                          {sim.eventSeverity}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1">{sim.eventTitle}</h4>
                      </div>

                      <div className="text-right font-mono-code shrink-0">
                        <span className="text-[10px] text-slate-500 block">协同 α-概率</span>
                        <span className="text-base font-bold text-red-400">
                          {(sim.alphaProbability * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Synchronized Actions Stream */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono-code text-slate-400 block font-bold">
                        成员已注入协同战术动作序列：
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {sim.synchronizedActions.map((act, idx) => (
                          <div 
                            key={idx}
                            className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono-code"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sky-300 font-bold">{act.memberRole}:</span>
                              <span className="text-slate-200">{act.actionName}</span>
                            </div>
                            <span className="text-emerald-400 font-bold">
                              +{(act.impactAlpha * 100).toFixed(1)}% α
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Inject New Synchronized Tactical Action */}
                    {currentConclave.isUserMember && (
                      <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                        <input
                          type="text"
                          value={newActionInput}
                          onChange={(e) => setNewActionInput(e.target.value)}
                          placeholder="以高阶参谋身份注入你的非对称战术动作..."
                          className="flex-1 bg-black/80 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono-code focus:outline-none focus:border-red-500"
                        />
                        <button
                          onClick={() => handleAddSynchronizedAction(sim.id)}
                          className="py-2 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-mono-code font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-950 shrink-0"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>注入战术</span>
                        </button>
                      </div>
                    )}

                  </div>
                ))}
              </div>

              {/* Members Dossier & Recent Announcements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Members List */}
                <div className="surface-obsidian border border-white/[0.08] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono-code">
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      密会席位名单
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {currentConclave.members?.length || 0} 成员
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {currentConclave.members?.map((member) => (
                      <div
                        key={member.id}
                        className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] flex items-center justify-between text-xs font-mono-code"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-sky-950 border border-sky-700/60 flex items-center justify-center text-[10px] text-sky-300 font-bold">
                            {member.avatar}
                          </div>
                          <div>
                            <span className="text-slate-200 font-bold block text-xs">{member.name}</span>
                            <span className="text-[10px] text-slate-500">{member.roleTitle}</span>
                          </div>
                        </div>
                        <span className="text-amber-400 text-[11px]">
                          +{member.equityContributed} 贡献
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Announcements */}
                <div className="surface-obsidian border border-white/[0.08] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono-code">
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      密会因果公报
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {currentConclave.recentAnnouncements?.map((anc) => (
                      <div
                        key={anc.id}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono-code">
                          <span className="text-amber-300 font-bold">{anc.title}</span>
                          <span className="text-slate-500 text-[10px]">{anc.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {anc.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </>
          ) : null}
        </div>

      </div>

      {/* Modal: Create Conclave */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#080B12] border border-sky-500/40 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-serif-sc font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                铸造专属观测者密会 (Create Conclave)
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono-code text-slate-300 mb-1">密会公会名称</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：【因果折跃枢纽】"
                  className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-code text-slate-300 mb-1">全球检索代号 (Code Name)</label>
                <input
                  type="text"
                  required
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value)}
                  placeholder="例如：CAUSAL_WARP_CONCLAVE"
                  className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono-code uppercase focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-code text-slate-300 mb-1">公会信条 / 决策哲学箴言</label>
                <textarea
                  required
                  rows={2}
                  value={newDoctrine}
                  onChange={(e) => setNewDoctrine(e.target.value)}
                  placeholder="例如：“以事实为刃，以因果为盾，刺穿所有虚妄假设。”"
                  className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-serif-sc focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs font-mono-code text-amber-300 flex items-center justify-between">
                <span>铸造扣除权益：</span>
                <span className="font-bold">100 权益点 (注入初始资源池)</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono-code text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 text-white font-mono-code font-bold text-xs shadow-lg"
                >
                  确认铸造
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
