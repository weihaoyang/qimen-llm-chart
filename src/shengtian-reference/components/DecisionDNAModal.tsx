import React from 'react';
import { Dna, X, ShieldCheck, Calendar, CheckCircle2, Sparkles } from 'lucide-react';
import { DecisionDNARecord } from '../types';

interface DecisionDNAModalProps {
  isOpen: boolean;
  onClose: () => void;
  dnaRecords: DecisionDNARecord[];
}

export const DecisionDNAModal: React.FC<DecisionDNAModalProps> = ({
  isOpen,
  onClose,
  dnaRecords,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="surface-obsidian border border-white/[0.1] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col hud-corner">
        
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-500/60 flex items-center justify-center text-amber-400">
              <Dna className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>用户决策DNA档案库 (Decision DNA Archive)</span>
              </h3>
              <p className="text-xs text-slate-400">
                历次破局推演提炼的底层认知防线与心智直觉
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] text-xs transition-colors cursor-pointer"
          >
            ✕ 关闭
          </button>
        </div>

        {/* DNA Records List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {dnaRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-white/[0.08] rounded-2xl">
              暂无已归档的决策DNA。完成一次【破局模式】推演后将自动沉淀。
            </div>
          ) : (
            dnaRecords.map((record) => (
              <div
                key={record.id}
                className="bg-black/50 border border-white/[0.06] rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">{record.battlefieldTitle}</span>
                    <span className="text-[10px] font-mono-code bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full">
                      {record.selectedStrategy}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono-code text-[11px]">{record.timestamp}</span>
                </div>

                <div className="bg-black/40 p-3.5 rounded-xl border border-white/[0.04] text-xs space-y-2">
                  <div className="text-amber-400 font-medium">
                    <strong>AI 致命一问:</strong> “{record.fatalQuestion}”
                  </div>
                  <div className="text-slate-300 text-[11px] leading-relaxed">
                    <strong>深度反思:</strong> {record.userReflection}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-mono-code block mb-1.5">提炼沉淀的决策DNA准则：</span>
                  <div className="flex flex-wrap gap-1.5">
                    {record.extractedDNA.map((dna, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-amber-950/30 text-amber-300 border border-amber-800/60 px-2.5 py-1 rounded-lg font-mono-code font-medium"
                      >
                        {dna}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-white/[0.06] shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            完成查看
          </button>
        </div>

      </div>
    </div>
  );
};
