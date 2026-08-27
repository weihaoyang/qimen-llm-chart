export function validateBattleModuleState(moduleId: string, state: Record<string, unknown>) {
  const serialized = JSON.stringify(state);
  if (serialized.length > 512_000) return "模块状态过大，请精简历史记录后重试。";
  if (moduleId !== "reality-echoes") return null;
  const items = state.items;
  if (!Array.isArray(items)) return null;
  for (const raw of items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const echo = raw as Record<string, unknown>;
    if (echo.finalRewardUnlocked === true) return "终局奖励必须由统一平台核发，不能由客户端直接入账。";
    if (echo.rewardClaimStatus === "pending_platform") {
      const dust = Array.isArray(echo.causalDustEvents) ? echo.causalDustEvents : [];
      if (echo.equilibriumStatus !== "EQUILIBRIUM_REACHED" || dust.some((event) => !event || typeof event !== "object" || (event as Record<string, unknown>).status !== "RESOLVED")) return "只有全部因果尘埃平息并达到新稳态后才能提交终局奖励申请。";
    }
  }
  return null;
}
