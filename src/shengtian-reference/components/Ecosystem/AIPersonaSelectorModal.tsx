import React from 'react';
import { 
  Shield, 
  Zap, 
  Cpu, 
  Compass, 
  Check, 
  Sparkles, 
  Bot 
} from 'lucide-react';
import { AIPersonaType, AIPersonaConfig } from '../../types';
import { soundManager } from '../../utils/soundEffects';

interface AIPersonaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPersona: AIPersonaType;
  onSelectPersona: (persona: AIPersonaType) => Promise<void> | void;
}

export const AIPersonaSelectorModal: React.FC<AIPersonaSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedPersona,
  onSelectPersona,
}) => {
  const [personas, setPersonas] = React.useState<AIPersonaConfig[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectingPersona, setSelectingPersona] = React.useState<AIPersonaType | null>(null);
  const [selectError, setSelectError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || personas.length) return;
    let cancelled = false;
    void fetch('/api/catalog/personas', { credentials: 'include' }).then(async (response) => {
      if (!response.ok) throw new Error(`AI 人格目录读取失败（${response.status}）。`);
      const payload = await response.json() as { personas?: AIPersonaConfig[] };
      if (!cancelled) setPersonas(Array.isArray(payload.personas) ? payload.personas : []);
    }).catch((error) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : 'AI 人格目录读取失败，请重试。'); });
    return () => { cancelled = true; };
  }, [isOpen, personas.length]);

  if (!isOpen) return null;

  const getPersonaIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield': return Shield;
      case 'Zap': return Zap;
      case 'Cpu': return Cpu;
      case 'Compass': return Compass;
      default: return Bot;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="surface-obsidian rounded-2xl border border-white/[0.12] p-6 max-w-2xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 hud-corner">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-serif-sc">
                个性化 AI 决策顾问人格 (AI Partner Personas)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono-code">
                适配不同阶段与决策偏好的智囊搭档
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          AI 顾问不再是千篇一律的机械应答。你可以随时根据当期战局的性质（极度求生、绝地反击、严谨核算或价值观锚定），切换最契合你的<strong>决策搭档型格</strong>。
        </p>

        {selectError && <div className="rounded-xl border border-red-700/60 bg-red-950/30 px-3 py-2 text-xs text-red-200">{selectError}</div>}

        {/* 4 Persona Cards Grid */}
        {loadError && <div className="rounded-xl border border-red-700/60 bg-red-950/30 px-3 py-2 text-xs text-red-200">{loadError}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!personas.length && !loadError ? <div className="col-span-full rounded-xl border border-white/[0.08] px-4 py-6 text-center text-xs text-slate-400">正在读取官方 AI 人格目录…</div> : personas.map((persona) => {
            const isSelected = selectedPersona === persona.id;
            const Icon = getPersonaIcon(persona.avatarIcon);

            return (
              <div
                key={persona.id}
                onClick={() => {
                  if (selectingPersona) return;
                  setSelectingPersona(persona.id);
                  setSelectError(null);
                  void Promise.resolve(onSelectPersona(persona.id)).then(() => {
                    soundManager.playBlip(750, 0.04);
                  }).catch((error) => {
                    setSelectError(error instanceof Error ? error.message : 'AI 人格保存失败，请重试。');
                  }).finally(() => setSelectingPersona(null));
                }}
                className={`card-tactical rounded-2xl p-4.5 border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-blue-950/60 hud-corner'
                    : 'border-white/[0.08] hover:border-white/[0.2]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-black/60 border border-white/[0.1] flex items-center justify-center text-amber-300">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-white">{persona.name}</h4>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>已激活</span>
                      </span>
                    )}
                    {selectingPersona === persona.id && <span className="text-[10px] text-cyan-300">保存中…</span>}
                  </div>

                  <span className="text-[11px] text-amber-300 font-mono-code block mb-1.5">{persona.title}</span>
                  <p className="text-[11px] text-slate-400 italic mb-3">{persona.tagline}</p>

                  <div className="p-2.5 rounded-xl bg-black/50 border border-white/[0.05] text-[11px] font-mono-code text-slate-300 space-y-1">
                    <span className="text-slate-500 text-[10px] block">● 顾问偏好特质：</span>
                    <p className="leading-snug">{persona.biasTendency}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.04] text-[11px] font-mono-code text-slate-400">
                  <span className="text-slate-500 block text-[10px]">对话与质询语气：</span>
                  <p className="text-slate-300 line-clamp-2 leading-relaxed mt-0.5 font-sans">
                    {persona.interviewGreeting}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-mono-code font-bold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer shadow-lg"
          >
            确认搭档并返回
          </button>
        </div>

      </div>
    </div>
  );
};
