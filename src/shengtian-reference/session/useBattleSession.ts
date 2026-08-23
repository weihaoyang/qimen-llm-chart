"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { sessionApi, type CatalogScenario, type SessionBattle } from "./api";

export function useBattleSession() {
  const [catalog, setCatalog] = useState<CatalogScenario[]>([]);
  const [battles, setBattles] = useState<SessionBattle[]>([]);
  const [activeBattle, setActiveBattle] = useState<SessionBattle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const catalogResult = await sessionApi.catalog();
      setCatalog(catalogResult.scenarios ?? []);
      try {
        const battleResult = await sessionApi.battles();
        const nextBattles = battleResult.battles ?? [];
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

  return useMemo(() => ({ catalog, battles, activeBattle, loading, error, refresh, selectBattle, cloneScenario }), [catalog, battles, activeBattle, loading, error, refresh, selectBattle, cloneScenario]);
}
