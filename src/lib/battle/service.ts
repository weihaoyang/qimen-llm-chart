import type { AccountSubject } from "@/lib/agent/account-subject";
import { buildDefaultGravityLine, buildMoveTemplates, detectJunctions } from "./rules";
import { getBattle, getLatestResourceSnapshot, listBattleConstraints, listBattleFacts, listInventory, replaceJunctions, saveGravityLine, saveMoveSet, saveResourceSnapshot } from "./repository";
import type { BattleInput, ResourceSnapshot } from "./types";

export const loadBattleInput = async (subject: AccountSubject, battleId: string): Promise<{ input: BattleInput; battle: NonNullable<Awaited<ReturnType<typeof getBattle>>> } | null> => {
  const battle = await getBattle(subject, battleId);
  if (!battle) return null;
  const [facts, constraints, inventory, resourceSnapshot] = await Promise.all([
    listBattleFacts(subject, battleId),
    listBattleConstraints(subject, battleId),
    listInventory(subject, battleId),
    getLatestResourceSnapshot(subject, battleId),
  ]);
  if (!facts || !constraints || !inventory) return null;
  return { battle, input: { objective: battle.objective, minimumOutcome: battle.minimumOutcome, idealOutcome: battle.idealOutcome, opponentSummary: battle.opponentSummary, hardDeadline: battle.hardDeadline, facts, constraints, inventory, resourceSnapshot: resourceSnapshot ?? undefined } };
};

export const generateBattleAnalysis = async (subject: AccountSubject, battleId: string, resourceSnapshot?: ResourceSnapshot) => {
  const loaded = await loadBattleInput(subject, battleId);
  if (!loaded) return null;
  if (resourceSnapshot) {
    await saveResourceSnapshot(subject, battleId, resourceSnapshot);
    loaded.input.resourceSnapshot = resourceSnapshot;
  }
  const gravity = buildDefaultGravityLine(loaded.input);
  const savedGravity = await saveGravityLine(subject, battleId, gravity);
  const rawJunctions = detectJunctions(loaded.input);
  const junctions = await replaceJunctions(subject, battleId, rawJunctions.map((junction) => ({ ...junction, battleId }))) ?? [];
  const moves = [];
  for (const junction of junctions) {
    const moveSet = await saveMoveSet(subject, battleId, junction.id, buildMoveTemplates(loaded.input, gravity, junction));
    if (moveSet) moves.push(...moveSet);
  }
  return { gravity: savedGravity ?? gravity, junctions, moves };
};
