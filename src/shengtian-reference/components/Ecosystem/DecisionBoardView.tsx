/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Eye, 
  MessageSquare, 
  GitPullRequest, 
  Share2, 
  Lock, 
  Sparkles, 
  ThumbsUp, 
  Plus, 
  Key, 
  Copy, 
  Check, 
  ExternalLink,
  HelpCircle,
  Clock,
  Radio,
  FileText
} from 'lucide-react';
import { 
  BattlefieldState, 
  DecisionBoardState, 
  BoardMember, 
  BoardComment, 
  GhostStrategyBranch,
  BoardRole
} from '../../types';
import { soundManager } from '../../utils/soundEffects';

interface DecisionBoardViewProps {
  battlefield: BattlefieldState;
  onUpdateBattlefield: (updater: (prev: BattlefieldState) => BattlefieldState) => void;
  onSelectGhostStrategy?: (ghost: GhostStrategyBranch) => void;
}

export const DecisionBoardView: React.FC<DecisionBoardViewProps> = ({
  battlefield,
  onUpdateBattlefield,
}) => {
  const board = battlefield.decisionBoard;
  const [copied, setCopied] = useState(false);
  const [isRedacted, setIsRedacted] = useState(board.isRedacted);
  
  // New comment input
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentTarget, setNewCommentTarget] = useState<'GENERAL' | 'CARD' | 'STRATEGY'>('GENERAL');
  const [newCommentTargetTitle, setNewCommentTargetTitle] = useState('全局战局');
  
  // New ghost strategy modal
  const [isAddingGhost, setIsAddingGhost] = useState(false);
  const [ghostName, setGhostName] = useState('');
  const [ghostThesis, setGhostThesis] = useState('');
  const [ghostAction, setGhostAction] = useState('');
  const [ghostProb, setGhostProb] = useState(70);
  const [ghostPros, setGhostPros] = useState('');
  const [ghostCons, setGhostCons] = useState('');

  const handleCopyInviteLink = () => {
    const link = `https://shengtianbanzi.ai/board/${board.roomId}?token=${board.shareToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    soundManager.playSuccess();
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleRedaction = () => {
    const next = !isRedacted;
    setIsRedacted(next);
    onUpdateBattlefield(prev => ({
      ...prev,
      decisionBoard: {
        ...prev.decisionBoard,
        isRedacted: next,
      }
    }));
    soundManager.playBlip(700, 0.04);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: BoardComment = {
      id: `cmt-${Date.now()}`,
      authorName: '你 (指挥官)',
      authorRole: 'STRATEGIST',
      avatar: '主',
      targetType: newCommentTarget,
      targetTitle: newCommentTargetTitle,
      content: newCommentText.trim(),
      timestamp: '刚刚',
      upvotes: 1,
    };

    onUpdateBattlefield(prev => ({
      ...prev,
      decisionBoard: {
        ...prev.decisionBoard,
        comments: [newComment, ...prev.decisionBoard.comments],
      }
    }));

    setNewCommentText('');
    soundManager.playSuccess();
  };

  const handleUpvoteComment = (commentId: string) => {
    onUpdateBattlefield(prev => ({
      ...prev,
      decisionBoard: {
        ...prev.decisionBoard,
        comments: prev.decisionBoard.comments.map(c => 
          c.id === commentId ? { ...c, upvotes: c.upvotes + 1 } : c
        ),
      }
    }));
    soundManager.playBlip(800, 0.03);
  };

  const handleCreateGhostStrategy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghostName.trim() || !ghostThesis.trim()) return;

    const newGhost: GhostStrategyBranch = {
      id: `ghost-${Date.now()}`,
      creatorName: '外部特邀参谋 (顾问)',
      creatorRoleTitle: '特聘战略顾问',
      strategyName: ghostName.trim(),
      coreThesis: ghostThesis.trim(),
      estimatedSurvivalProb: ghostProb,
      suggestedAction: ghostAction.trim() || '立即制定该平行分支的执行细则并推演',
      pros: ghostPros.trim() || '避开正面绞杀，开辟全新资源通道',
      cons: ghostCons.trim() || '需要让渡部分权益或投入额外协调成本',
    };

    onUpdateBattlefield(prev => ({
      ...prev,
      decisionBoard: {
        ...prev.decisionBoard,
        ghostStrategies: [newGhost, ...prev.decisionBoard.ghostStrategies],
      }
    }));

    setIsAddingGhost(false);
    setGhostName('');
    setGhostThesis('');
    setGhostAction('');
    setGhostPros('');
    setGhostCons('');
    soundManager.playSuccess();
  };

  const displayTitle = isRedacted 
    ? '【脱敏代号：ALPHA-09】核心业务大客户续约与现金流生命线博弈'
    : battlefield.title;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner: Asynchronous Decision Board Controls */}
      <div className="surface-obsidian rounded-2xl p-5 sm:p-6 border border-white/[0.08] shadow-2xl relative overflow-hidden hud-corner">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-serif-sc">
                <span>加密决策委员会 (Asynchronous Decision Board)</span>
                <span className="text-[11px] font-mono-code bg-blue-950 text-blue-300 border border-blue-800 px-2.5 py-0.5 rounded-full">
                  ROOM #{board.roomId}
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              引入外部信任智囊的“第二大脑”。通过有时效的加密链接邀请导师、顾问或战友进行异步推演。外部视角的幽灵策略线与穿透质询，可彻底打破个人认知盲区。
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Privacy Redaction Switch */}
            <button
              onClick={toggleRedaction}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono-code font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                isRedacted
                  ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                  : 'bg-black/60 border-white/[0.1] text-slate-300 hover:text-white'
              }`}
              title="一键开启脱敏模式，隐藏真实公司名与敏感数字"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{isRedacted ? '🛡️ 数据严格脱敏中 (已开启)' : '🔓 原始数据明文 (未脱敏)'}</span>
            </button>

            {/* Copy Tokenized Link Button */}
            <button
              onClick={handleCopyInviteLink}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs font-bold font-mono-code flex items-center gap-2 shadow-lg shadow-blue-950/60 transition-all cursor-pointer border border-blue-400"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? '加密邀请链接已复制' : '复制48小时顾问邀请链接'}</span>
            </button>
          </div>
        </div>

        {/* Access Token Details Bar */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono-code text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-slate-300">当前战局状态: <strong className="text-amber-300">{displayTitle}</strong></span>
            <span className="text-slate-500">|</span>
            <span>有效期: <strong className="text-slate-200">剩余 {board.expiresInHours} 小时</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">{board.members.length} 位特邀委员会成员已接入</span>
          </div>
        </div>
      </div>

      {/* 3-Tier Board Member Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Tier 1: Observer */}
        <div className="card-tactical rounded-2xl p-4 border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 text-xs">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">观察者权限 (Observer)</h4>
                  <span className="text-[10px] text-slate-400 font-mono-code">只读全局推演沙盘</span>
                </div>
              </div>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-white/[0.08]">
                1 人在线
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              受邀人仅可查阅已脱敏的战局状态、底牌配置及推演路径，无法发起评论或创建策略。
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
            <span>李导师 · 特邀观察员</span>
            <span className="text-emerald-400 font-bold">● 活跃</span>
          </div>
        </div>

        {/* Tier 2: Commentator */}
        <div className="card-tactical rounded-2xl p-4 border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-700 flex items-center justify-center text-blue-300 text-xs">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">评论员权限 (Commentator)</h4>
                  <span className="text-[10px] text-blue-400 font-mono-code">卡片与路径深度质询</span>
                </div>
              </div>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700">
                1 人在线
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              可以在任何一张底牌资产卡片或策略分支上发起批注质询，指出主观偏差与致命隐患。
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
            <span>张总 · 天使轮领投</span>
            <span className="text-emerald-400 font-bold">● 活跃</span>
          </div>
        </div>

        {/* Tier 3: Strategist */}
        <div className="card-tactical rounded-2xl p-4 border border-purple-500/40 bg-purple-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-600 flex items-center justify-center text-purple-300 text-xs">
                  <GitPullRequest className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">参谋权限 (Strategist)</h4>
                  <span className="text-[10px] text-purple-400 font-mono-code">创建并行“幽灵策略线”</span>
                </div>
              </div>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-600 font-bold">
                核心智囊
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              可独立为你绘制平行对比策略线（如“合纵连横”），与你的主策略同屏推演胜率。
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
            <span>陈顾问 · 前SaaS商业VP</span>
            <span className="text-purple-300 font-bold">● 正在参谋</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Ghost Strategies Parallel Display & Advisory Discussion Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Cols: Parallel Ghost Strategy Lines (幽灵策略线) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-purple-400" />
              <span>参谋绘制的并行幽灵策略线 (Parallel Ghost Strategies)</span>
            </h3>
            
            <button
              onClick={() => setIsAddingGhost(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-300 bg-purple-950/80 hover:bg-purple-900 border border-purple-700 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>以参谋身份新增幽灵线</span>
            </button>
          </div>

          <div className="space-y-4">
            {board.ghostStrategies.map((ghost) => (
              <div 
                key={ghost.id}
                className="card-tactical rounded-2xl p-5 border border-purple-500/50 bg-gradient-to-b from-purple-950/30 to-slate-950 shadow-2xl relative overflow-hidden"
              >
                <div className="card-tactical-holo absolute inset-0 pointer-events-none opacity-30"></div>

                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.06] text-xs font-mono-code">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 font-bold">
                      GHOST-BRANCH
                    </span>
                    <span className="text-slate-300 font-bold">{ghost.creatorName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">参谋预测胜率:</span>
                    <span className="text-emerald-400 font-bold text-sm">{ghost.estimatedSurvivalProb}%</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white mb-2">{ghost.strategyName}</h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">{ghost.coreThesis}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs font-mono-code">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
                    <span className="text-emerald-300 block mb-1 font-bold">● 战术优势 (Pros):</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{ghost.pros}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40">
                    <span className="text-amber-300 block mb-1 font-bold">● 权衡代价 (Cons):</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{ghost.cons}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] flex items-center justify-between text-xs font-mono-code">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">建议第一步:</span>
                    <span className="text-slate-300">{ghost.suggestedAction}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* User's Original Strategy Preview for Side-by-Side Comparison */}
          <div className="surface-obsidian rounded-2xl p-5 border border-white/[0.08] text-xs space-y-2">
            <span className="text-slate-400 font-mono-code block text-[11px]">
              对比你的当前主导策略：
            </span>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">{battlefield.strategies[0]?.name || '默认战术'}</span>
              <span className="text-emerald-400 font-mono-code font-bold">
                当前胜率预估: {battlefield.strategies[0]?.estimatedSurvivalProb || 55}%
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {battlefield.strategies[0]?.description}
            </p>
          </div>
        </div>

        {/* Right 5 Cols: Asynchronous Discussion Stream */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>决策委员会研判讨论串 ({board.comments.length})</span>
            </h3>
            <span className="text-[11px] font-mono-code text-slate-400">异步更新</span>
          </div>

          {/* Discussion List */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {board.comments.map((comment) => (
              <div 
                key={comment.id}
                className="surface-obsidian rounded-2xl p-4 border border-white/[0.08] shadow-lg text-xs space-y-2.5 transition-all hover:border-white/[0.15]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-900 border border-blue-500/50 flex items-center justify-center text-blue-200 text-[10px] font-bold">
                      {comment.avatar}
                    </div>
                    <div>
                      <span className="text-slate-200 font-bold">{comment.authorName}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-code text-slate-500">{comment.timestamp}</span>
                </div>

                <div className="p-2 rounded-lg bg-black/50 border border-white/[0.04] text-[11px] font-mono-code text-amber-300 flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>批注针对: {comment.targetTitle}</span>
                </div>

                <p className="text-slate-300 leading-relaxed">{comment.content}</p>

                <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono-code">
                  <span className="text-slate-500">外部视角建议</span>
                  <button
                    onClick={() => handleUpvoteComment(comment.id)}
                    className="flex items-center gap-1 text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>认同 ({comment.upvotes})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Post New Comment Box */}
          <form onSubmit={handleAddComment} className="surface-obsidian rounded-2xl p-4 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">发起委员会研判质询</span>
              <select
                value={newCommentTarget}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setNewCommentTarget(val);
                  if (val === 'CARD') setNewCommentTargetTitle('[CHIP-01] 校友VP人脉');
                  else if (val === 'STRATEGY') setNewCommentTargetTitle('改变战场策略');
                  else setNewCommentTargetTitle('全局战局');
                }}
                className="bg-black/60 text-slate-300 border border-white/[0.1] rounded-lg px-2.5 py-1 text-[11px] font-mono-code focus:outline-none"
              >
                <option value="GENERAL">全局战局讨论</option>
                <option value="CARD">针对底牌卡片</option>
                <option value="STRATEGY">针对策略分支</option>
              </select>
            </div>

            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="输入你的困惑、对顾问建议的反馈或需要委员会投票的分歧点..."
              rows={3}
              className="w-full bg-black/60 text-xs text-white border border-white/[0.1] rounded-xl p-3 focus:outline-none focus:border-blue-500 transition-all resize-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                发送至委员会讨论串
              </button>
            </div>
          </form>

        </div>

      </div>

      {/* Modal: Add Ghost Strategy */}
      {isAddingGhost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="surface-obsidian rounded-2xl border border-purple-500/60 p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-purple-400" />
                <span>以参谋角色绘制【并行幽灵策略线】</span>
              </h3>
              <button 
                onClick={() => setIsAddingGhost(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGhostStrategy} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-mono-code mb-1">策略代号与名称:</label>
                <input 
                  type="text"
                  value={ghostName}
                  onChange={(e) => setGhostName(e.target.value)}
                  placeholder="例如：合纵连横 · 引入公有云巨头联合竞标"
                  className="w-full bg-black/60 border border-white/[0.1] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono-code mb-1">核心立论与博弈逻辑 (Thesis):</label>
                <textarea 
                  value={ghostThesis}
                  onChange={(e) => setGhostThesis(e.target.value)}
                  placeholder="为什么你看好这条路径？它如何绕开对手的优势？"
                  rows={3}
                  className="w-full bg-black/60 border border-white/[0.1] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono-code mb-1">战术优势 (Pros):</label>
                  <input 
                    type="text"
                    value={ghostPros}
                    onChange={(e) => setGhostPros(e.target.value)}
                    placeholder="例如：借助大厂背书"
                    className="w-full bg-black/60 border border-white/[0.1] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-mono-code mb-1">妥协代价 (Cons):</label>
                  <input 
                    type="text"
                    value={ghostCons}
                    onChange={(e) => setGhostCons(e.target.value)}
                    placeholder="例如：让渡20%分成"
                    className="w-full bg-black/60 border border-white/[0.1] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-mono-code mb-1">
                  预估胜率评估: <span className="text-emerald-400 font-bold">{ghostProb}%</span>
                </label>
                <input 
                  type="range"
                  min="20"
                  max="95"
                  value={ghostProb}
                  onChange={(e) => setGhostProb(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddingGhost(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-white/[0.08]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg"
                >
                  发布幽灵策略线
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
