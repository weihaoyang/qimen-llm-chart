/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  ArchonTierState, 
  PrecognitionEvent, 
  ArchonArchiveAnnotation, 
  ArchonRealityProposal 
} from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';
import { 
  X, 
  Crown, 
  Eye, 
  BookOpen, 
  PlusCircle, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  Flame, 
  TrendingUp, 
  Share2, 
  Award,
  Zap,
  Globe,
  Radio,
  FileText
} from 'lucide-react';

interface ArchonSanctumModalProps {
  isOpen: boolean;
  onClose: () => void;
  archonState: ArchonTierState;
  onSubmitRealityProposal: (proposal: Partial<ArchonRealityProposal>) => void | Promise<void>;
  onAddArchiveAnnotation: (archiveId: string, lemma: string, annotation?: ArchonArchiveAnnotation) => void | Promise<void>;
  userEquity: number;
  battleId?: string;
  currentUserName?: string;
  currentUserSigil?: string;
  readOnly?: boolean;
}

export const ArchonSanctumModal: React.FC<ArchonSanctumModalProps> = ({
  isOpen,
  onClose,
  archonState,
  onSubmitRealityProposal,
  onAddArchiveAnnotation,
  userEquity,
  battleId,
  currentUserName = '当前执棋官',
  currentUserSigil = '已验证执政官印记',
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'PRECOGNITION' | 'ANNOTATIONS' | 'PROPOSALS'>('PRECOGNITION');
  
  // Proposal submission form
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [propTitle, setPropTitle] = useState('');
  const [propType, setPropType] = useState('');
  const [propIndustry, setPropIndustry] = useState('');
  const [propDilemma, setPropDilemma] = useState('');

  // Annotation form
  const [newLemma, setNewLemma] = useState('');
  const [selectedArchiveId, setSelectedArchiveId] = useState('arch-ltcm-1998');
  const [archives, setArchives] = useState<Array<{ id: string; historicEventTitle: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || archives.length > 0) return;
    let cancelled = false;
    void fetch('/api/catalog/deep-archives', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('历史档案目录读取失败。');
        const payload = await response.json() as { archives?: unknown };
        const next = Array.isArray(payload.archives)
          ? payload.archives.flatMap((item) => {
              if (!item || typeof item !== 'object') return [];
              const value = item as Record<string, unknown>;
              return typeof value.id === 'string' && typeof value.historicEventTitle === 'string'
                ? [{ id: value.id, historicEventTitle: value.historicEventTitle }]
                : [];
            })
          : [];
        if (!cancelled) {
          setArchives(next);
          if (next.length > 0 && !next.some((archive) => archive.id === selectedArchiveId)) setSelectedArchiveId(next[0].id);
        }
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : '历史档案目录读取失败。'); });
    return () => { cancelled = true; };
  }, [archives.length, isOpen, selectedArchiveId]);

  const archivesLoading = isOpen && archives.length === 0 && !error;

  if (!isOpen) return null;

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!archonState.privileges.realityProposal) { setError('尚未达到现实提案所需的执政官位阶。'); return; }
    if (!propTitle.trim() || !propDilemma.trim() || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const proposal: ArchonRealityProposal = { id:`prop-${crypto.randomUUID()}`,title:propTitle,crisisType:propType||'产业结构性危机',industry:propIndustry||'高科技 / 互联网',backgroundDilemma:propDilemma,status:'SUBMITTED',submittedAt:new Date().toISOString(),bountyEquityReward:0,observersIntervenedCount:0,communitySuccessRate:0 };
      if (battleId) await sessionApi.consumeUsageAndSaveModule(battleId, 'archon_proposal', `archon-proposal:${battleId}:${propTitle.trim()}:${propDilemma.trim()}`, 'archon-tier', { ...archonState,userProposals:[proposal,...archonState.userProposals] });
      await onSubmitRealityProposal(proposal);

      setShowProposalForm(false);
      setPropTitle('');
      setPropDilemma('');
      soundManager.playSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '提案提交失败，请重试。');
    } finally { setSubmitting(false); }
  };

  const handleAnnotationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!archonState.privileges.archiveAnnotation) { setError('尚未达到档案批注所需的执政官位阶。'); return; }
    if (!newLemma.trim() || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const archiveTitle = archives.find((archive) => archive.id === selectedArchiveId)?.historicEventTitle;
      if (!archiveTitle) throw new Error('请选择一个有效的官方历史档案。');
      const annotation: ArchonArchiveAnnotation = { id:`ann-${crypto.randomUUID()}`,archiveId:selectedArchiveId,archiveTitle,archonLemma:`【执政官因果引理】：${newLemma.trim()}`,authorArchonName:currentUserName,authorSigil:currentUserSigil,createdAt:new Date().toISOString(),upvotes:0,isVerifiedByAethel:false };
      if (battleId) await sessionApi.consumeUsageAndSaveModule(battleId, 'archon_annotation', `archon-annotation:${battleId}:${selectedArchiveId}:${newLemma.trim()}`, 'archon-tier', { ...archonState,archiveAnnotations:[annotation,...archonState.archiveAnnotations] });
      await onAddArchiveAnnotation(selectedArchiveId, newLemma, annotation);
      setNewLemma('');
      soundManager.playStrategyLocked();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '引理铭刻失败，请重试。');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl bg-[#07090F] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-6 border-b border-white/[0.08] bg-gradient-to-r from-amber-950/60 via-purple-950/30 to-black flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black shadow-lg shadow-amber-950/80">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif-sc font-bold text-white tracking-tight">
                  执政官圣殿 (The Archon Sanctum)
                </h2>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono-code font-bold bg-amber-400 text-black shadow-sm">
                  终极向往 · 第三拼图
                </span>
              </div>
              <p className="text-xs text-amber-300/80 font-mono-code mt-0.5">
                当前位阶：{archonState.archonRankTitle} · 持有 {archonState.archonSealsCount} 枚因果仲裁金印
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Promotion Requirements HUD */}
        <div className="bg-black/60 border-b border-white/[0.06] px-6 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-code">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-400">奇点推演胜场:</span>
            <span className="text-amber-300 font-bold">
              {archonState.promotionRequirements.singularityVictories.current} / {archonState.promotionRequirements.singularityVictories.required} ({archonState.promotionRequirements.singularityVictories.met ? '已达标' : '未达标'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-400">有效协作战局:</span>
            <span className="text-amber-300 font-bold">
              {archonState.promotionRequirements.conclaveGlobalRank.current} / {archonState.promotionRequirements.conclaveGlobalRank.required} 场 ({archonState.promotionRequirements.conclaveGlobalRank.met ? '已达标' : '未达标'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-400">深网无解历史难题:</span>
            <span className="text-amber-300 font-bold">
              {archonState.promotionRequirements.unsolvableArchiveSolved.current} / {archonState.promotionRequirements.unsolvableArchiveSolved.required} 案 ({archonState.promotionRequirements.unsolvableArchiveSolved.met ? '已达标' : '未达标'})
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-white/[0.06] bg-black/30 text-xs font-mono-code">
          <button
            onClick={() => {
              setActiveTab('PRECOGNITION');
              soundManager.playBlip(750, 0.03);
            }}
            className={`pb-3 px-3 font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'PRECOGNITION'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>01 未来先知雷达 (Precognition)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ANNOTATIONS');
              soundManager.playBlip(750, 0.03);
            }}
            className={`pb-3 px-3 font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ANNOTATIONS'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>02 历史档案引理注释 (Archive Lemmas)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('PROPOSALS');
              soundManager.playBlip(750, 0.03);
            }}
            className={`pb-3 px-3 font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'PROPOSALS'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>03 现实提案权 (UGC Proposals)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {error && <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">{error}</div>}
          
          {/* TAB 1: PRECOGNITION RADAR */}
          {activeTab === 'PRECOGNITION' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3">
                <Radio className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-300 font-mono-code">
                    高阶特权：未来时间视界延伸 (Precognitive Horizon)
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    凡人仅能在危机公开爆发后介入，执政官阶层则能于事件爆发前 7–30 天捕获微观前兆，提前布局非对称对冲。
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {archonState.precognitionEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-5 rounded-2xl bg-black/50 border border-white/[0.08] hover:border-amber-500/50 space-y-3 transition-all shadow-xl"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-bold">
                          {evt.code}
                        </span>
                        <span className="text-[10px] font-mono-code text-slate-400">
                          预兆爆发窗口: {evt.forecastWindowDays} 天后
                        </span>
                      </div>
                      <span className="text-xs font-mono-code font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                        触发概率 {evt.probabilityToTrigger}% · 先知置信度 {evt.precognitionConfidence}%
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{evt.title}</h3>
                    
                    <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] font-mono-code text-slate-400 font-bold block">
                        已捕获的微观先行信号 (Leading Signs):
                      </span>
                      <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                        {evt.leadingSigns.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs font-mono-code text-amber-200">
                      <span className="font-bold text-amber-400 block mb-0.5">执政官预防性对冲方案建议：</span>
                      {evt.preventativeStrategySuggestion}
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ARCHIVE ANNOTATIONS */}
          {activeTab === 'ANNOTATIONS' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono-code">
                    历史档案 · 本人待审引理注记
                  </h3>
                  <p className="text-xs text-slate-400">
                    你的引理会保存到当前战局，供你后续复盘；提交后保持待审核状态，不会自动公开或广播。
                  </p>
                </div>
              </div>

              {/* Add Annotation Box */}
              <form onSubmit={handleAnnotationSubmit} className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono-code">
                  <span className="text-amber-300 font-bold">铭刻新引理</span>
                  <select
                    value={selectedArchiveId}
                    disabled={readOnly}
                    onChange={(e) => setSelectedArchiveId(e.target.value)}
                    className="bg-black border border-white/[0.15] rounded-lg px-2.5 py-1 text-xs text-slate-200"
                  >
                    {archivesLoading && <option value="">正在读取官方档案…</option>}
                    {!archivesLoading && archives.length === 0 && <option value="">暂无可用档案</option>}
                    {archives.map((archive) => <option key={archive.id} value={archive.id}>{archive.historicEventTitle}</option>)}
                  </select>
                </div>

                <textarea
                  rows={2}
                  required
                  value={newLemma}
                  disabled={readOnly}
                  onChange={(e) => setNewLemma(e.target.value)}
                  placeholder="输入你的执政官因果引理（例如：‘所有基于正态分布的杠杆套利模型，在黑天鹅面前本质上都是在压路机前捡硬币...’）"
                  className="w-full bg-black/80 border border-white/[0.1] rounded-xl p-3 text-xs text-white font-serif-sc focus:outline-none focus:border-amber-500"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={readOnly || !archonState.privileges.archiveAnnotation || submitting}
                    className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 disabled:opacity-40 text-black font-mono-code font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md"
                  >
                    <Crown className="w-3.5 h-3.5" />
                  <span>保存引理至本人战局</span>
                  </button>
                </div>
              </form>

              {/* Existing Annotations */}
              <div className="space-y-3">
                {archonState.archiveAnnotations.map((ann, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-mono-code">
                      <span className="text-amber-400 font-bold">{ann.archiveTitle}</span>
                      <span className="text-slate-500">{ann.createdAt} · 赞同 {ann.upvotes}</span>
                    </div>

                    <p className="text-xs text-slate-200 font-serif-sc leading-relaxed p-3 rounded-xl bg-black/40 border border-white/[0.04]">
                      {ann.archonLemma}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400">
                      <span>执笔：{ann.authorArchonName} ({ann.authorSigil})</span>
                      <span className="text-slate-400">待审核 · 仅对本人战局可见</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: REALITY UGC PROPOSALS */}
          {activeTab === 'PROPOSALS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono-code">
                    现实提案权 (Reality UGC Proposal)
                  </h3>
                  <p className="text-xs text-slate-400">
                    提交你观察到的危机战局，作为当前账户的私有待审提案。审核、公开、奖励或分润均不在此页面自动发生。
                  </p>
                </div>

                <button
                  onClick={() => archonState.privileges.realityProposal ? setShowProposalForm(true) : setError('尚未达到现实提案所需的执政官位阶。')}
                  disabled={readOnly || !archonState.privileges.realityProposal}
                  className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 disabled:opacity-40 text-black text-xs font-mono-code font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>提交本人待审提案</span>
                </button>
              </div>

              {/* Proposals List */}
              <div className="space-y-3">
                {archonState.userProposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-5 rounded-2xl bg-black/50 border border-white/[0.08] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                          {prop.status}
                        </span>
                        <span className="text-xs font-mono-code text-slate-400">{prop.industry}</span>
                      </div>
                      <span className="text-xs font-mono-code text-amber-400 font-bold flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        目录标注奖励: +{prop.bountyEquityReward} 权益（待平台规则核发）
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{prop.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      {prop.backgroundDilemma}
                    </p>

                    <div className="flex items-center justify-between text-xs font-mono-code text-slate-400 pt-2 border-t border-white/[0.04]">
                      <span>当前提案记录参与数: {prop.observersIntervenedCount}（目录快照）</span>
                      <span className="text-sky-300">目录结局标签: {prop.communitySuccessRate}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Modal */}
              {showProposalForm && (
                <div className="p-5 rounded-2xl bg-black/90 border border-amber-500/50 space-y-3 shadow-2xl">
                  <h4 className="text-xs font-bold font-mono-code text-amber-300">填写新战局提案</h4>
                  <form onSubmit={handleProposalSubmit} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={propTitle}
                      disabled={readOnly}
                      onChange={(e) => setPropTitle(e.target.value)}
                      placeholder="战局标题 (如：全球半导体光刻胶断供生死72小时)"
                      className="w-full bg-black border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-amber-500"
                    />
                    <textarea
                      rows={3}
                      required
                      value={propDilemma}
                      disabled={readOnly}
                      onChange={(e) => setPropDilemma(e.target.value)}
                      placeholder="核心博弈困境与不可逆死线描述..."
                      className="w-full bg-black border border-white/[0.1] rounded-xl p-3 text-xs text-white font-serif-sc focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowProposalForm(false)}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-xs text-slate-400"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={readOnly || submitting}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 text-black font-bold font-mono-code text-xs"
                      >
                        {submitting ? '提交中…' : '正式提交审查'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
