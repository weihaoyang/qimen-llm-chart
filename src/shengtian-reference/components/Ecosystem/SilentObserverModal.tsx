import React, { useEffect, useState } from 'react';
import { 
  Radio, 
  Calendar, 
  LayoutDashboard,
  Mail, 
  AlertOctagon, 
  ArrowRight, 
  Sparkles, 
  Check, 
  X,
  Clock,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { SilentObserverAlert, BattlefieldState } from '../../types';
import { soundManager } from '../../utils/soundEffects';
import { sessionApi } from '../../session/api';

interface SilentObserverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDraftAsBattlefield: (draft: SilentObserverAlert['suggestedBattlefieldDraft']) => void | Promise<void>;
}
type ConnectorItem = { provider: 'calendar'|'email'|'project_board'; status: 'not_connected'|'pending_authorization'|'authorized'|'revoked' };

export const SilentObserverModal: React.FC<SilentObserverModalProps> = ({
  isOpen,
  onClose,
  onImportDraftAsBattlefield,
}) => {
  // External calendar/mail/board connectors are intentionally fail-closed until
  // an account has explicitly authorized a provider. Never show preset signals
  // as if they were live user telemetry.
  const [alerts, setAlerts] = useState<SilentObserverAlert[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [connectorBusy, setConnectorBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadError(null);
    void Promise.all([sessionApi.connectors(), sessionApi.connectorAlerts()]).then(([connectorValue, alertValue]) => {
      setConnectors(connectorValue.connectors);
      setAlerts(alertValue.alerts as SilentObserverAlert[]);
    }).catch((error) => setLoadError(error instanceof Error ? error.message : '读取观察者状态失败。'));
  }, [isOpen]);
  const providerLabel = (provider: string) => provider === 'calendar' ? '日历' : provider === 'email' ? '邮件' : '项目看板';
  const updateConnector = async (provider: 'calendar'|'email'|'project_board', action: 'authorize'|'revoke') => { setConnectorBusy(provider); setLoadError(null); try { await sessionApi.updateConnector(provider, action); const value = await sessionApi.connectors(); setConnectors(value.connectors); } catch (error) { setLoadError(error instanceof Error ? error.message : '更新连接状态失败。'); } finally { setConnectorBusy(null); } };

  if (!isOpen) return null;

  const handleDismiss = async (id: string) => {
    try {
      await sessionApi.dismissConnectorAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      soundManager.playBlip(600, 0.03);
    } catch (error) { setLoadError(error instanceof Error ? error.message : '忽略信号失败，请重试。'); }
  };

  const handleLoadDraft = async (draft: SilentObserverAlert['suggestedBattlefieldDraft'], alertId: string) => {
    setLoadError(null);
    try {
      await onImportDraftAsBattlefield(draft);
      await handleDismiss(alertId);
      onClose();
      soundManager.playSuccess();
    } catch (error) { setLoadError(error instanceof Error ? error.message : '创建战局失败，请重试。'); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="surface-obsidian rounded-2xl border border-white/[0.12] p-6 max-w-2xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 hud-corner">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-serif-sc">
                静默观察者雷达 (Silent Observer Telemetry)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono-code">
                工作流异常模式识别与自动战局草稿
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
          静默观察者在后台以只读方式关联你的日历会议、项目管理看板与关键邮件流。当检测到会议突发骤降、关键里程碑延期或合同节点逼近等<strong>异常信号</strong>时，主动生成推演战局草稿，防患于未然。
        </p>
        {loadError && <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">{loadError}</div>}

        {/* Alerts List */}
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono-code text-slate-400 bg-black/40 rounded-xl border border-white/[0.06] space-y-3">
              <p className="text-slate-200 font-bold">外部连接器尚未授权</p>
              <p>日历、邮件和项目看板目前没有可读取的 qmdj 内部同步记录。授权完成并产生同步记录后，异常信号才会显示在这里。</p>
              <a href="/gods-eye-view" className="inline-flex items-center justify-center rounded-lg border border-cyan-700/60 bg-cyan-950/40 px-3 py-2 text-[11px] font-bold text-cyan-200 hover:bg-cyan-900/60">
                打开上帝视角观测地图
              </a>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-left">
                {(connectors.length ? connectors : [{ provider: 'calendar', status: 'not_connected' }, { provider: 'email', status: 'not_connected' }, { provider: 'project_board', status: 'not_connected' }] as ConnectorItem[]).map((connector) => <span key={connector.provider} className="rounded-lg border border-white/[0.08] bg-slate-950/60 px-3 py-2 flex items-center justify-between gap-2"><span>{providerLabel(connector.provider)} · {connector.status === 'pending_authorization' ? '待授权确认' : connector.status === 'authorized' ? '已授权' : connector.status === 'revoked' ? '已撤销' : '未连接'}</span><button disabled={connectorBusy === connector.provider} onClick={() => void updateConnector(connector.provider, connector.status === 'authorized' || connector.status === 'pending_authorization' ? 'revoke' : 'authorize')} className="text-blue-300 hover:text-blue-200 disabled:opacity-50">{connector.status === 'authorized' || connector.status === 'pending_authorization' ? '撤销' : '登记授权'}</button></span>)}
              </div>
              <p className="text-slate-500">当前不会伪造外部实时信号，也不会读取浏览器本地数据。</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isCritical = alert.severity === 'CRITICAL';
              return (
                <div
                  key={alert.id}
                  className={`card-tactical rounded-2xl p-5 border shadow-xl space-y-3.5 relative ${
                    isCritical
                      ? 'border-red-600/70 bg-red-950/20 hud-corner-red'
                      : 'border-amber-600/70 bg-amber-950/20 hud-corner'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 text-[10px] font-mono-code">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${
                        isCritical ? 'bg-red-950 text-red-300 border-red-700' : 'bg-amber-950 text-amber-300 border-amber-700'
                      }`}>
                        {alert.sourceTitle}
                      </span>
                      <span className="text-slate-400">{alert.timestamp}</span>
                    </div>

                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="text-slate-400 hover:text-red-300 cursor-pointer"
                      title="忽略此信号"
                    >
                      ✕ 忽略
                    </button>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="text-slate-400 font-mono-code text-[11px] block">● 检测到的异常特征：</span>
                    <p className="text-white leading-relaxed">{alert.detectedAnomaly}</p>
                  </div>

                  {/* AI Suggested Battlefield Draft */}
                  <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] text-xs font-mono-code space-y-1.5">
                    <div className="flex items-center justify-between text-amber-300">
                      <span className="font-bold">🎯 AI 自动草拟推演战局：{alert.suggestedBattlefieldDraft.title}</span>
                      <span>关门窗口: {alert.suggestedBattlefieldDraft.deadlineDays} 天</span>
                    </div>
                    <p className="text-slate-300 text-[11px] font-sans leading-snug">
                      {alert.suggestedBattlefieldDraft.dilemma}
                    </p>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => handleLoadDraft(alert.suggestedBattlefieldDraft, alert.id)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono-code flex items-center gap-1.5 shadow-lg shadow-blue-950/60 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>一键载入为主推演战局</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono-code text-slate-400 hover:text-white bg-slate-900 border border-white/[0.08] cursor-pointer"
          >
            关闭雷达面板
          </button>
        </div>

      </div>
    </div>
  );
};
