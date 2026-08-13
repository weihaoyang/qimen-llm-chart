import type { BaziStructureAudit } from "./types";

const AXES = ["ei", "sn", "tf", "jp"] as const;

export const buildResearchFeatureSnapshot = (
  audit: BaziStructureAudit,
  boundaryAudit: { sensitive?: boolean; changedPillars?: unknown[]; windowMinutes?: number },
  axes: Record<string, number>,
  axisEvidence: Record<string, { confidence?: number; evidence?: unknown[]; contradictions?: unknown[] }>,
) => ({
  feature_schema_version: "bazi-research-features-v1",
  chart: {
    day_master_strength: audit.dayMasterStrength,
    follow_structure: audit.followStructure,
    diagnosis_confidence: audit.confidence,
    audit: {
      engineVersion: audit.engineVersion,
      dayMasterElement: audit.dayMasterElement,
      monthCommandElement: audit.monthCommandElement,
      elementWeights: audit.elementWeights,
      supportWeight: audit.supportWeight,
      drainWeight: audit.drainWeight,
      rootCount: audit.rootCount,
      visibleSupportCount: audit.visibleSupportCount,
    },
  },
  boundary: {
    sensitive: Boolean(boundaryAudit.sensitive),
    changed_pillar_count: Array.isArray(boundaryAudit.changedPillars) ? boundaryAudit.changedPillars.length : 0,
    window_minutes: Number(boundaryAudit.windowMinutes ?? 0),
  },
    prediction: {
    base_axes: Object.fromEntries(AXES.map((axis) => [axis, Math.round(axes[axis] ?? 50)])),
    axis_confidence: Object.fromEntries(AXES.map((axis) => [axis, Math.round(axisEvidence[axis]?.confidence ?? 0)])),
    axis_evidence_count: Object.fromEntries(AXES.map((axis) => [axis, Array.isArray(axisEvidence[axis]?.evidence) ? axisEvidence[axis].evidence!.length : 0])),
      axis_contradiction_count: Object.fromEntries(AXES.map((axis) => [axis, Array.isArray(axisEvidence[axis]?.contradictions) ? axisEvidence[axis].contradictions!.length : 0])),
  },
});
