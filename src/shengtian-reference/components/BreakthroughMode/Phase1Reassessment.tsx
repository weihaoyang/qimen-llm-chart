import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle2, 
  Flame, 
  ArrowRight,
  RefreshCcw,
  Zap,
  Lock
} from 'lucide-react';
import { BattlefieldState, CardAsset, EPISTEMIC_TAG_CONFIG } from '../../types';
import { soundManager } from '../../utils/soundEffects';

interface Phase1ReassessmentProps {
  battlefield: BattlefieldState;
  onUpdateBattlefield: (updater: (prev: BattlefieldState) => BattlefieldState) => void;
  onProceedToPhase2: () => Promise<void> | void;
  onPersistBattlefield?: (patch: Partial<BattlefieldState>) => Promise<void>;
  readOnly?: boolean;
}

export const Phase1Reassessment: React.FC<Phase1ReassessmentProps> = ({
  battlefield,
  onUpdateBattlefield,
  onProceedToPhase2,
  onPersistBattlefield,
  readOnly = false,
}) => {
  const [confirmedTruths, setConfirmedTruths] = useState<Record<string, boolean>>(() =>
    battlefield.breakthroughConfirmedTruths ?? Object.fromEntries(battlefield.assets.map((asset) => [asset.id, asset.tag === 'FACT'])),
  );
  const [pendingAssetId, setPendingAssetId] = useState<string | null>(null);
  const [isProceeding, setIsProceeding] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleToggleConfirm = async (assetId: string) => {
    if (readOnly || pendingAssetId || isProceeding) return;
    const next = { ...confirmedTruths, [assetId]: !confirmedTruths[assetId] };
    setPendingAssetId(assetId);
    setSaveError(null);
    try {
      await onPersistBattlefield?.({ breakthroughConfirmedTruths: next });
      setConfirmedTruths(next);
      onUpdateBattlefield((previous) => ({ ...previous, breakthroughConfirmedTruths: next }));
      soundManager.playBlip(750, 0.02);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '约束确认保存失败，请重试。');
    } finally {
      setPendingAssetId(null);
    }
  };

  const handleNext = async () => {
    if (readOnly || pendingAssetId || isProceeding) return;
    setIsProceeding(true);
    setSaveError(null);
    try {
      await onProceedToPhase2();
      soundManager.playBlip(900, 0.04);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '阶段切换保存失败，请重试。');
    } finally {
      setIsProceeding(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner: War Room Reassessment Title */}
      <div className="surface-obsidian border border-red-900/60 rounded-2xl p-5 shadow-2xl hud-corner-red">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-950/80 border border-red-500/80 flex items-center justify-center text-red-300 font-mono-code font-black text-sm shrink-0 shadow-lg shadow-red-950/50">
              <span>01</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>第一阶段：战局重构 (Battlefield Reassessment)</span>
                <span className="text-[10px] font-mono-code px-2.5 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 tracking-wider">
                  从“我有什么”到“我只剩什么”
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                剥离所有虚胖优势与主观期望，自动降级非事实资产，进入绝对逆境沙盘。
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-slate-400 font-mono-code block">硬性收缩跑道</span>
            <span className="text-2xl font-black font-mono-code text-red-400 tracking-tight">
              {Math.max(0, battlefield.financials.calculatedDays)} 天 <span className="text-xs text-red-500 font-normal">（当前可验证现金跑道）</span>
            </span>
          </div>
        </div>
      </div>

      {/* Forced Worst-Case Scenario Callout (Red Alert Box) */}
      <div className="bg-gradient-to-b from-red-950/70 to-red-950/40 border border-red-600/80 rounded-2xl p-5 shadow-2xl relative overflow-hidden space-y-3 pulse-glow-red hud-corner-red">
        <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
          <Flame className="w-4 h-4 text-yellow-300 animate-spin" />
          <span className="tracking-wide">系统强制性“最差情景”预设 (Forced Worst-Case Scenario)：</span>
        </div>

        <p className="text-xs text-red-100 leading-relaxed font-medium bg-black/60 p-4 rounded-xl border border-red-800/80">
          系统会将未被验证的资产按风险折损，并要求你在当前可验证事实与约束下重新推演。该状态不会自动把推测写入事实，确认结果仅在你提交后进入战局记录。
        </p>

        <div className="flex items-center justify-between text-[11px] text-red-300/80 pt-1 font-mono-code">
          <span>● 目的：瞬间击碎侥幸心理，强迫在绝对无退路的前提下发掘非对称生机</span>
          <span className="text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50">状态: 强制生效中</span>
        </div>
      </div>

      {/* Asset Auto-Downgrade Audit Table */}
      <div className="surface-obsidian border border-white/[0.08] rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-400" />
            <span>底牌资产自动降级与压力审查表 (Asset Downgrade & Trust Decay)</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono-code">
            按破局准则：假设降为高危，人脉打0.6折
          </span>
        </div>

        <div className="space-y-3">
          {battlefield.assets.map((asset) => {
            const isRelationalAsset = asset.category === 'CHIPS' && asset.tag === 'OPPORTUNITY';
            const isFact = asset.tag === 'FACT';

            return (
              <div
                key={asset.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isRelationalAsset
                    ? 'bg-red-950/30 border-red-700/80 ring-1 ring-red-500/30'
                    : isFact
                    ? 'bg-black/50 border-white/[0.06]'
                    : 'bg-amber-950/20 border-amber-800/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{asset.title}</span>
                      {isFact ? (
                        <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.2 rounded font-mono-code font-bold">
                          硬性事实 (100%保留)
                        </span>
                      ) : (
                        <span className="text-[10px] bg-red-950 text-red-300 border border-red-700 px-2 py-0.2 rounded font-mono-code font-bold animate-pulse">
                          已自动降级 / 风险锁定
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{asset.description}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-[11px]">
                      <span className="text-slate-500 block font-mono-code">修正可信度:</span>
                      <span className="font-mono-code font-bold text-slate-200">
                        {isRelationalAsset ? (
                          <span className="text-red-400 line-through mr-1">{asset.confidence}%</span>
                        ) : null}
                        <span className={isFact ? 'text-emerald-400' : 'text-amber-400'}>
                          {isRelationalAsset ? `${Math.round(asset.confidence * 0.6)}% (关系折损)` : isFact ? '100%' : `${Math.round(asset.confidence * 0.6)}%`}
                        </span>
                      </span>
                    </div>

                    <button
                      onClick={() => void handleToggleConfirm(asset.id)}
                      disabled={readOnly || pendingAssetId !== null || isProceeding}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors cursor-pointer ${
                        confirmedTruths[asset.id] ?? isFact
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-amber-950 text-amber-300 border-amber-700'
                      }`}
                    >
                        {pendingAssetId === asset.id ? '正在保存…' : (confirmedTruths[asset.id] ?? isFact) ? '已确认此残酷约束' : '标记复核'}
                    </button>
                  </div>
                </div>

                {isRelationalAsset && (
                  <div className="mt-2.5 pt-2 border-t border-red-900/60 text-[11px] text-red-300 flex items-center gap-1.5 font-mono-code">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>关系型机会不是硬性事实；在高压场景中，必须按可验证兑现概率折损。</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action to Phase 2 */}
      <div className="flex items-center justify-between p-4 surface-obsidian border border-white/[0.08] rounded-2xl shadow-xl">
        <div className="text-xs text-slate-400">
          已完成战局净化。已剔除所有侥幸泡沫，保留最硬核的约束边界。
        </div>
        {saveError && <div role="alert" className="text-xs text-amber-300 max-w-sm">{saveError}</div>}
        <button
          onClick={() => void handleNext()}
          disabled={readOnly || pendingAssetId !== null || isProceeding}
          className="py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-red-950/60 transition-all cursor-pointer"
        >
          <span>{isProceeding ? '正在保存并进入第二阶段…' : '进入第二阶段：认知对抗 (AI红队首席指挥官)'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
