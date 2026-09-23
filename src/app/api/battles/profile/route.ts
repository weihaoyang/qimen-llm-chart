import { errorResponse } from "@/lib/api-error";
import { noStore } from "@/lib/http";
import { requireAccountSubject } from "@/lib/agent/account-subject";
import { asRecord } from "@/lib/battle/input";
import { detectAllocationConflicts, getAccountBattleStats, getArchonProgress, getStrategyProfile, listCalibration, listDecisionDna, listPlaybook, saveStrategyProfile } from "@/lib/battle/extended-repository";

export async function GET(request: Request) {
  try {
    const subject = await requireAccountSubject(request);
    const [profile, calibration, conflicts, playbook, archonProgress, decisionDna, battleStats] = await Promise.all([
      getStrategyProfile(subject),
      listCalibration(subject),
      detectAllocationConflicts(subject),
      listPlaybook(subject),
      getArchonProgress(subject),
      listDecisionDna(subject),
      getAccountBattleStats(subject),
    ]);
    const byDimension = Object.groupBy(calibration, (item) => item.dimension);
    const calibrationSummary = Object.fromEntries(Object.entries(byDimension).map(([key, items]) => [key, { count:items.length, meanAbsoluteError:items.length ? items.reduce((sum,item) => sum + Math.abs(item.error ?? 0), 0) / items.length : null }]));
    return noStore({ profile, calibrationSummary, allocationConflicts:conflicts, privatePlaybook:playbook, archonProgress, decisionDna, battleStats });
  } catch (error) {
    return errorResponse(error, "读取战略档案失败。");
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { profile?:unknown } | null;
    const profile = asRecord(body?.profile);
    if (!profile) return noStore({ error:"战略档案无效。" }, { status:400 });
    return noStore({ profile:await saveStrategyProfile(await requireAccountSubject(request), profile) });
  } catch (error) {
    return errorResponse(error, "保存战略档案失败。");
  }
}
