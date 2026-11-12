import { BAZI_CLASSIC_SUMMARIES } from "@/lib/agent/bazi-classics";
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "bazi-sources": BAZI_CLASSIC_SUMMARIES.map((entry) => ({
    title: `${entry.sourceBook} · ${entry.section}`,
    lines: [
      entry.summary,
      ...(entry.editorial ? [`本站编者按：${entry.editorial}`] : []),
    ],
    note: `本站主题概述。原书参见 ${entry.sourceUrl}`,
  })),
};
