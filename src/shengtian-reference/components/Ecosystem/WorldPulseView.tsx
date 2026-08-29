import React from 'react';

/**
 * 世界脉搏的产品主体是 God's Eye View 开源观测应用。
 * qmdj 只负责提供产品壳层和导航；观测地图、图层控制、位置检索、
 * 分享链接及数据加载均由已审核的静态构建负责。这里不再复制一份
 * 事件面板，避免两套 UI 对同一“世界脉搏”概念产生不同语义。
 */
type WorldPulseViewProps = {
  battleId?: string;
  readOnly?: boolean;
};

export const WorldPulseView: React.FC<WorldPulseViewProps> = ({ battleId, readOnly = false }) => {
  const params = new URLSearchParams();
  if (battleId) params.set('battleId', battleId);
  if (readOnly) params.set('readOnly', '1');
  const src = `/gods-eye-view/index.html${params.size ? `?${params.toString()}` : ''}`;

  return (
  <section
    aria-label="世界脉搏"
    className="relative h-[calc(100vh-9rem)] min-h-[680px] w-full overflow-hidden rounded-2xl border border-white/[0.12] bg-black shadow-2xl"
  >
    <iframe
      title="God's Eye View 世界脉搏观测"
      src={src}
      loading="eager"
      allow="fullscreen; microphone"
      className="absolute inset-0 h-full w-full border-0"
    />
  </section>
  );
};
