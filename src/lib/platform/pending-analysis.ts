import type { WorkbenchMode } from "@/lib/workbench/types";

const PENDING_KEY = "qmdj.pending-paid-analysis.v1";
const COMPLETED_KEY = "qmdj.completed-paid-analysis.v1";

export type PendingPaidAnalysis = {
  orderId: string;
  checkoutToken: string;
  mode: WorkbenchMode;
  question: string;
  structuredText: string;
  jsonPayload: string;
  createdAt: number;
};

export type CompletedPaidAnalysis = {
  mode: WorkbenchMode;
  content: string;
  model: string | null;
};

const storage = () => (typeof window === "undefined" ? null : window.sessionStorage);

export const savePendingPaidAnalysis = (value: PendingPaidAnalysis) =>
  storage()?.setItem(PENDING_KEY, JSON.stringify(value));

export const loadPendingPaidAnalysis = (): PendingPaidAnalysis | null => {
  try {
    const raw = storage()?.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingPaidAnalysis) : null;
  } catch {
    return null;
  }
};

export const clearPendingPaidAnalysis = () => storage()?.removeItem(PENDING_KEY);

export const saveCompletedPaidAnalysis = (value: CompletedPaidAnalysis) =>
  storage()?.setItem(COMPLETED_KEY, JSON.stringify(value));

export const popCompletedPaidAnalysis = (): CompletedPaidAnalysis | null => {
  try {
    const raw = storage()?.getItem(COMPLETED_KEY);
    storage()?.removeItem(COMPLETED_KEY);
    return raw ? (JSON.parse(raw) as CompletedPaidAnalysis) : null;
  } catch {
    return null;
  }
};
