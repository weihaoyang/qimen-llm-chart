"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { sessionApi, type BattleInvitation, type CatalogScenario, type SessionBattle } from "./api";

export function useBattleSession() {
  const [catalog, setCatalog] = useState<CatalogScenario[]>([]);
  const [battles, setBattles] = useState<SessionBattle[]>([]);
  const [activeBattle, setActiveBattle] = useState<SessionBattle | null>(null);
  const [invitations, setInvitations] = useState<BattleInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const catalogResult = await sessionApi.catalog();
      setCatalog(catalogResult.scenarios ?? []);
      try {
        const [battleResult, invitationResult] = await Promise.all([sessionApi.battles(), sessionApi.invitations()]);
        const nextBattles = battleResult.battles ?? [];
        setInvitations(invitationResult.invitations ?? []);
        setBattles(nextBattles);
        const queryBattle = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("battle") : null;
        const selected = nextBattles.find((item) => item.id === queryBattle) ?? nextBattles[0] ?? null;
        setActiveBattle(selected);
      } catch (battleError) {
        setError(battleError instanceof Error ? battleError.message : "登录后可保存自己的战局。");
      }
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "官方案例暂时不可用。");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  // A collaboration link carries only the expiring invitation capability.
  // Accept it before selecting a battle; invited users are intentionally not
  // returned by GET /api/battles until the invitation becomes active.
  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const inviteId = new URLSearchParams(window.location.search).get("invite");
    if (!inviteId) return;
    const invitation = invitations.find((item) => item.id === inviteId);
    if (!invitation) {
      window.setTimeout(() => setError("协作邀请不存在、已过期或不属于当前账户。"), 0);
      return;
    }
    let cancelled = false;
    void sessionApi.respondInvitation(inviteId, "accept").then(async ({ invitation: accepted }) => {
      if (cancelled) return;
      const next = await sessionApi.battle(accepted.battleId);
      if (cancelled) return;
      setActiveBattle(next.battle);
      setBattles((current) => [next.battle, ...current.filter((item) => item.id !== next.battle.id)]);
      setInvitations((current) => current.filter((item) => item.id !== inviteId));
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      url.searchParams.set("battle", next.battle.id);
      window.history.replaceState({}, "", url);
    }).catch((inviteError) => {
      if (!cancelled) setError(inviteError instanceof Error ? inviteError.message : "接受协作邀请失败。");
    });
    return () => { cancelled = true; };
  }, [loading, invitations]);

  const selectBattle = useCallback((battle: SessionBattle) => {
    setActiveBattle(battle);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("battle", battle.id);
      window.history.replaceState({}, "", url);
    }
  }, []);

  const cloneScenario = useCallback(async (scenarioId:string) => {
    const result = await sessionApi.clone(scenarioId);
    await refresh();
    const next = await sessionApi.battle(result.battle.battleId);
    selectBattle(next.battle);
    return next.battle;
  }, [refresh, selectBattle]);

  const respondInvitation = useCallback(async (invitationId:string, action:"accept"|"decline") => {
    const result = await sessionApi.respondInvitation(invitationId, action);
    if (action === "accept") {
      const next = await sessionApi.battle(result.invitation.battleId);
      await refresh();
      selectBattle(next.battle);
    } else {
      setInvitations((current) => current.filter((item) => item.id !== invitationId));
    }
  }, [refresh, selectBattle]);

  return useMemo(() => ({ catalog, battles, activeBattle, invitations, loading, error, refresh, selectBattle, cloneScenario, respondInvitation }), [catalog, battles, activeBattle, invitations, loading, error, refresh, selectBattle, cloneScenario, respondInvitation]);
}
