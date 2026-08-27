import React, { useEffect, useState } from 'react';
import { 
  Compass, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpDown, 
  Sparkles, 
  Save, 
  Check,
  Scale
} from 'lucide-react';
import { BattlefieldState, CoreValueItem } from '../../types';
import { soundManager } from '../../utils/soundEffects';

interface ValueCalibratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  battlefield: BattlefieldState;
  onUpdateBattlefield: (updater: (prev: BattlefieldState) => BattlefieldState) => void;
  readOnly?: boolean;
}

export const ValueCalibratorModal: React.FC<ValueCalibratorModalProps> = ({
  isOpen,
  onClose,
  battlefield,
  onUpdateBattlefield,
  readOnly = false,
}) => {
  const calibrator = battlefield.valueCalibrator;
  const [values, setValues] = useState<CoreValueItem[]>(calibrator.coreValues);
  const [isSaved, setIsSaved] = useState(false);
  const [newValueKeyword, setNewValueKeyword] = useState('');
  const [newValueDescription, setNewValueDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Rehydrate the editable draft when the modal opens; this is an
      // intentional synchronization from the battle snapshot into local form state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues(calibrator.coreValues);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSaved(false);
    }
  }, [isOpen, calibrator.coreValues]);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (readOnly) return;
    if (index === 0) return;
    const next = [...values];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    // update rank
    next.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    setValues(next);
    soundManager.playBlip(750, 0.03);
  };

  const moveDown = (index: number) => {
    if (readOnly) return;
    if (index === values.length - 1) return;
    const next = [...values];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    // update rank
    next.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    setValues(next);
    soundManager.playBlip(650, 0.03);
  };

  const handleSave = () => {
    if (readOnly) return;
    onUpdateBattlefield(prev => ({
      ...prev,
      valueCalibrator: {
        ...prev.valueCalibrator,
        coreValues: values,
      }
    }));
    setIsSaved(true);
    soundManager.playSuccess();
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  const handleAddValue = () => {
    if (readOnly) return;
    const keyword = newValueKeyword.trim();
    if (!keyword) return;
    setValues((current) => [...current, { id: `value-${Date.now()}`, name: keyword, keyword, description: newValueDescription.trim() || '用户定义的核心价值底线', rank: current.length + 1 }]);
    setNewValueKeyword('');
    setNewValueDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="surface-obsidian rounded-2xl border border-purple-500/50 p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 hud-corner">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-white font-serif-sc">
              价值观校准器与道德底线扫描 (Value Calibrator)
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          决策的最终目的不仅是“怎么赢”，更是确保胜利“符合初心且事后无悔”。排序你最珍视的核心价值观，AI将在策略生成与执行前进行<strong>伦理对齐扫描</strong>。
        </p>

        {/* Core Value Ranking List */}
        <div className="space-y-2.5">
          <span className="text-slate-400 text-xs font-mono-code block">
            调整优先级排序 (点击上下移动，置顶最不可妥协的底线)：
          </span>

          {values.map((val, idx) => (
            <div 
              key={val.id} 
              className="p-3 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-purple-950 text-purple-300 border border-purple-700 flex items-center justify-center font-mono-code font-bold text-xs shrink-0">
                  #{val.rank}
                </span>
                <div>
                  <h4 className="text-white font-bold">{val.keyword}</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">{val.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={readOnly || idx === 0}
                  className="px-2 py-1 rounded bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30 border border-white/[0.06] cursor-pointer text-xs"
                  title="提高优先级"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={readOnly || idx === values.length - 1}
                  className="px-2 py-1 rounded bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30 border border-white/[0.06] cursor-pointer text-xs"
                  title="降低优先级"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-purple-700/60 bg-purple-950/20 p-3 space-y-2">
            <div className="text-[11px] text-purple-200">添加你的真实价值底线</div>
            <div className="flex gap-2">
              <input disabled={readOnly} value={newValueKeyword} onChange={(event) => setNewValueKeyword(event.target.value)} placeholder="例如：团队稳定" className="min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-black/60 px-2.5 py-2 text-xs text-white" />
              <button onClick={handleAddValue} disabled={readOnly || !newValueKeyword.trim()} className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">添加</button>
            </div>
            <input disabled={readOnly} value={newValueDescription} onChange={(event) => setNewValueDescription(event.target.value)} placeholder="描述这条底线在决策中的含义（可选）" className="w-full rounded-lg border border-white/[0.1] bg-black/60 px-2.5 py-2 text-xs text-white" />
          </div>
        </div>

        {/* Strategy Alignment Scan Report */}
        <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/60 space-y-2 text-xs font-mono-code">
          <div className="flex items-center gap-2 text-purple-300 font-bold">
            <Scale className="w-4 h-4" />
            <span>AI 策略价值观对齐扫描结果：</span>
          </div>

          <div className="space-y-2 text-[11px] font-sans">
            {calibrator.strategyAlignmentAudit.map((audit, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-black/50 border border-white/[0.04] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{audit.strategyName}</span>
                  <span className={`font-mono-code font-bold ${audit.alignmentScore > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    自洽契合度: {audit.alignmentScore}%
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">{audit.clashDescription}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
          {!readOnly && <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono-code text-slate-400 hover:text-white bg-slate-900 border border-white/[0.08] cursor-pointer"
          >
            关闭
          </button>}
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-mono-code flex items-center gap-1.5 shadow-lg shadow-purple-950/60 cursor-pointer"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? '已完成校准' : '保存价值观基准'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
