import type { WorkbenchMode } from "@/lib/workbench/types";

/** 出处登记册支持的体系键：工作台模式 + 大六壬经典盘（非模式）+ 通用条目。 */
export type ProvenanceSystem = WorkbenchMode | "daliuren" | "shared";

/**
 * 核对状态——这是本登记册最重要的字段，用来说明「这条依据有多硬」：
 * - `已核`：有一手出处，且本仓已逐字/逐值核对过；
 * - `异说`：古籍或实现之间存在互不相同的说法，本仓并列，不择一为真理；
 * - `未核`：本仓采用了某个来源，但尚未（或无法）取得一手核对；
 * - `本仓自撰`：没有外部出处，是本仓自撰的启发式/近似（不得当古典依据）。
 */
export type ProvenanceStatus = "已核" | "异说" | "未核" | "本仓自撰";

export type ProvenanceKind = "古籍原文" | "开源实现" | "计算口径" | "许可" | "异说" | "未核项" | "自撰/近似";

export type ProvenanceEntry = {
  id: string;
  system: ProvenanceSystem;
  kind: ProvenanceKind;
  status: ProvenanceStatus;
  /** 条目标题，例如「和数（上和/次和/下和）」「八虚星光行差项」。 */
  title: string;
  /** 精确出处：书名·篇目，或 仓库/文件:行。 */
  citation: string;
  license?: string;
  url?: string;
  /** 逐字引文（尽量原文，不做现代化改写）。 */
  quote?: string;
  /** 需要展开的结构化资料（表、清单、代码摘句）。 */
  details?: readonly string[];
  /** 本仓如何处理、以及读者需要注意什么。 */
  note?: string;
};

export const PROVENANCE_STATUS_ORDER: readonly ProvenanceStatus[] = ["已核", "异说", "未核", "本仓自撰"];
