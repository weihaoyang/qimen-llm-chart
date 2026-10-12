"use client";

import { useMemo, useState } from "react";
import { PROVENANCE, PROVENANCE_SYSTEM_LABELS } from "@/lib/provenance/registry";
import { PROVENANCE_STATUS_ORDER, type ProvenanceStatus, type ProvenanceSystem } from "@/lib/provenance/types";
import { ProvenanceEntryList, provenanceSearchText } from "./provenance-block";

const ALL = "all" as const;

/**
 * 资料库：把全部体系的**出处与材料本体**（逐字原文、整表数值、源码行、异说与未核项）
 * 集中在一处，支持全文检索与按「体系 / 核对状态」筛选。
 *
 * 与各体系面板底部的「出处与原文」区块读的是同一份登记册（`src/lib/provenance/registry.ts`），
 * 因此不会出现两处内容不一致的情况。
 */
export const ProvenanceLibrary = () => {
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState<ProvenanceSystem | typeof ALL>(ALL);
  const [status, setStatus] = useState<ProvenanceStatus | typeof ALL>(ALL);

  const systems = useMemo(() => Object.keys(PROVENANCE_SYSTEM_LABELS) as ProvenanceSystem[], []);
  const corpus = useMemo(() => new Map(PROVENANCE.map((entry) => [entry.id, provenanceSearchText(entry)])), []);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return PROVENANCE.filter((entry) => {
      if (system !== ALL && entry.system !== system) return false;
      if (status !== ALL && entry.status !== status) return false;
      if (!needle) return true;
      return (corpus.get(entry.id) ?? "").includes(needle);
    });
  }, [corpus, query, status, system]);

  return (
    <div className="provenance-library">
      <label className="provenance-library__search">
        <span>全文检索</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="书名·篇目 / 原文片段 / 仓库 文件:行 / 关键词"
          aria-label="检索出处与原文"
        />
      </label>

      <div className="provenance-library__filters">
        <div className="provenance-library__chips" role="group" aria-label="按体系筛选">
          <button type="button" className={system === ALL ? "is-active" : undefined} aria-pressed={system === ALL} onClick={() => setSystem(ALL)}>
            全部体系
          </button>
          {systems.map((key) => (
            <button
              key={key}
              type="button"
              className={system === key ? "is-active" : undefined}
              aria-pressed={system === key}
              onClick={() => setSystem(key)}
            >
              {PROVENANCE_SYSTEM_LABELS[key]}
            </button>
          ))}
        </div>
        <div className="provenance-library__chips" role="group" aria-label="按核对状态筛选">
          <button type="button" className={status === ALL ? "is-active" : undefined} aria-pressed={status === ALL} onClick={() => setStatus(ALL)}>
            全部状态
          </button>
          {PROVENANCE_STATUS_ORDER.map((value) => (
            <button
              key={value}
              type="button"
              className={status === value ? "is-active" : undefined}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <p className="provenance-library__count" aria-live="polite">
        命中 {results.length} / {PROVENANCE.length} 条
      </p>

      <ProvenanceEntryList
        entries={results}
        showSystem
        empty="没有匹配的资料。换个关键词，或把筛选改回「全部体系 / 全部状态」。"
      />
    </div>
  );
};

export default ProvenanceLibrary;
