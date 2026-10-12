import { provenanceBySystem, PROVENANCE_SYSTEM_LABELS } from "@/lib/provenance/registry";
import type { ProvenanceEntry, ProvenanceSystem } from "@/lib/provenance/types";

const STATUS_CLASS: Record<ProvenanceEntry["status"], string> = {
  已核: "is-verified",
  异说: "is-variant",
  未核: "is-unchecked",
  本仓自撰: "is-own",
};

/** 每条目的可搜文本（资料库全文检索用；也是"材料本体"的拼装处）。 */
export const provenanceSearchText = (entry: ProvenanceEntry) =>
  [
    entry.title,
    entry.citation,
    entry.license ?? "",
    entry.kind,
    entry.status,
    entry.quote ?? "",
    entry.note ?? "",
    ...(entry.details ?? []),
    ...(entry.documents ?? []).flatMap((doc) => [doc.title, doc.note ?? "", ...doc.lines]),
  ]
    .join("\n")
    .toLocaleLowerCase();

/**
 * 条目列表（出处区块与资料库共用）。
 *
 * 把「逐字引文 / 资料本体（整段原文、整表数值、源码行）/ 细节 / 链接」渲染成一致的结构，
 * 因此面板内的区块与全局资料库不会出现两种长相。
 */
export const ProvenanceEntryList = ({
  entries,
  showSystem = false,
  empty = "没有匹配的资料。",
}: {
  entries: readonly ProvenanceEntry[];
  showSystem?: boolean;
  empty?: string;
}) => {
  if (!entries.length) return <p className="provenance__intro">{empty}</p>;

  return (
    <ol className="provenance__list">
      {entries.map((entry) => (
        <li className="provenance__item" key={entry.id}>
          <div className="provenance__head">
            {showSystem ? <span className="provenance__system">{PROVENANCE_SYSTEM_LABELS[entry.system]}</span> : null}
            <b className="provenance__title">{entry.title}</b>
            <span className={`provenance__status ${STATUS_CLASS[entry.status]}`}>{entry.status}</span>
            <span className="provenance__kind">{entry.kind}</span>
          </div>
          <div className="provenance__citation">
            {entry.citation}
            {entry.license ? ` · 许可：${entry.license}` : ""}
          </div>
          {entry.quote ? <blockquote className="provenance__quote">{entry.quote}</blockquote> : null}
          {entry.documents?.length ? (
            <div className="provenance__documents">
              {entry.documents.map((doc) => (
                <details className="provenance__document" key={doc.title}>
                  <summary className="provenance__document-summary">
                    <span className="provenance__document-title">{doc.title}</span>
                    <span className="provenance__document-count">{doc.lines.length} 行原文</span>
                  </summary>
                  <div className="provenance__document-body">
                    {doc.lines.map((line, index) => (
                      <p className="provenance__document-line" key={`${doc.title}-${index}`}>
                        {line}
                      </p>
                    ))}
                    {doc.note ? <p className="provenance__document-note">{doc.note}</p> : null}
                  </div>
                </details>
              ))}
            </div>
          ) : null}
          {entry.details?.length ? (
            <ul className="provenance__details">
              {entry.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {entry.note ? <p className="provenance__note">{entry.note}</p> : null}
          {entry.url ? (
            <a className="provenance__link" href={entry.url} target="_blank" rel="noreferrer noopener">
              {entry.url}
            </a>
          ) : null}
        </li>
      ))}
    </ol>
  );
};

/**
 * 「出处与原文（供查阅）」区块：把该体系所据的**逐字引文、来源链接、许可、
 * 异说与未核项**直接呈现在界面上，供读者自行核对，而不只写在代码注释里。
 *
 * 纯展示组件（`<details>`），无状态、无请求，可安全用于任何面板。
 */
export const ProvenanceBlock = ({ system, title = "出处与原文 · 供查阅" }: { system: ProvenanceSystem; title?: string }) => {
  const entries = provenanceBySystem(system);
  if (!entries.length) return null;

  return (
    <details className="provenance">
      <summary className="provenance__summary">
        {title}
        <span className="provenance__count">{entries.length} 条</span>
      </summary>
      <p className="provenance__intro">
        下列为该体系在本站所据的逐字出处与处理方式。「已核」＝已有一手出处并逐字/逐值核对；「异说」＝文献之间互异，本仓并列不择一；
        「未核」＝已采用但尚未取得一手核对；「本仓自撰」＝无外部出处，仅供研究参照。条目内的「原文 / 源码」区块为**逐字资料本体**（整段原文、整表数值、源码行），可逐层展开查阅。
      </p>
      <ProvenanceEntryList entries={entries} />
    </details>
  );
};

export default ProvenanceBlock;
