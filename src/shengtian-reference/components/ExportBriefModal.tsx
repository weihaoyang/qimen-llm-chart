import React, { useState } from 'react';
import { FileText, Copy, Check, X, Printer, ShieldCheck } from 'lucide-react';
import { BattlefieldState } from '../types';
import { ASYMMETRIC_STRATEGY_PACKAGES } from '../data/presets';
import { soundManager } from '../utils/soundEffects';

interface ExportBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  battlefield: BattlefieldState;
}

export const ExportBriefModal: React.FC<ExportBriefModalProps> = ({
  isOpen,
  onClose,
  battlefield,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  if (!isOpen) return null;

  const lockedStrategy = battlefield.lockedAsymmetricStrategyId ? ASYMMETRIC_STRATEGY_PACKAGES[battlefield.lockedAsymmetricStrategyId] : null;
  const strategySection = lockedStrategy ? `* **锁定策略**: ${lockedStrategy.name} (${lockedStrategy.codeName})
* **预估存活率**: ${lockedStrategy.survivalProbability}%
* **核心支点**: ${lockedStrategy.primaryLever}
* **第一步行动**: ${lockedStrategy.initialFirstStep}
* **关键行动窗口**: ${lockedStrategy.criticalWindow}
* **领先监控指标**:
${lockedStrategy.leadingIndicators.map(ind => `  1. ${ind}`).join('\n')}
* **绝对中止红线 (Abort Criteria)**: ${lockedStrategy.abortCriteria}` : '* **锁定策略**: 尚未锁定。请先完成路径推演与用户确认。';

  const briefMarkdown = `# 《胜天半子 · 战局现实推演决策简报》
**战局名称**: ${battlefield.title}
**当前状态**: ${battlefield.breakthroughActive ? '破局模式 · 战情指挥' : '标准模式 · 决策顾问'}
**生成时间**: ${new Date().toLocaleString()}

---

### 一、 战局核心约束
* **理想目标**: ${battlefield.idealOutcome}
* **生存硬红线**: ${battlefield.bottomLine}
* **现金跑道**: ${battlefield.financials.calculatedDays} 天 (可用现金: ¥${battlefield.financials.availableCash.toLocaleString()} / 月净燃烧率: ¥${(battlefield.financials.monthlyBurn - battlefield.financials.monthlyIncomeWithoutClient).toLocaleString()})
* **决策死线**: ${battlefield.targetDeadlineDays} 天

---

### 二、 现实底牌盘点与认知分类
${battlefield.assets.map(a => `- **[${a.tag}]** ${a.title}: ${a.description} (置信度: ${a.confidence}%)`).join('\n')}

---

### 三、 破局非对称策略总纲
${strategySection}

---
*胜天半子系统 · 专业决策推演与认知熔炉*
`;

  const handleCopy = () => {
    setCopyError(null);
    void navigator.clipboard.writeText(briefMarkdown).then(() => {
      setCopied(true);
      soundManager.playBlip(900, 0.04);
      window.setTimeout(() => setCopied(false), 2000);
    }).catch(() => setCopyError('复制失败，请手动选择并复制简报内容。'));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="surface-obsidian border border-white/[0.1] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col hud-corner">
        
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-500/60 flex items-center justify-center text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                战局决策推演简报 (War Room Brief)
              </h3>
              <p className="text-xs text-slate-400">
                结构化导出完整的因果链条、底牌盘点与非对称行动方案
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

        {/* Brief Text Preview */}
        <div className="flex-1 overflow-y-auto bg-black/60 p-4 rounded-xl border border-white/[0.06] text-xs font-mono-code text-slate-300 whitespace-pre-wrap leading-relaxed">
          {briefMarkdown}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>打印战报</span>
          </button>

          <div className="flex items-center gap-2">
            {copyError && <span className="text-xs text-red-300">{copyError}</span>}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xl shadow-blue-950/50 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制 Markdown 战报' : '一键复制完整简报'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
