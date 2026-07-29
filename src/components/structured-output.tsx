import { forwardRef, useMemo } from "react";
import type { Position } from "3meta";
import { cn } from "@/lib/utils";

type StructuredOutputProps = {
  structuredText: string;
  selectedPalace: Position | null;
};

export const StructuredOutput = forwardRef<HTMLDivElement, StructuredOutputProps>(
  function StructuredOutput({ structuredText, selectedPalace }, ref) {
    const blocks = useMemo(() => {
      if (!structuredText) {
        return [];
      }

      return structuredText.split("\n\n### ").map((block, index) => {
        const normalizedBlock = index === 0 ? block : `### ${block}`;
        const match = normalizedBlock.match(/^### 宫位 (\d+)/m);
        const [titleLine = "", ...bodyLines] = normalizedBlock.split("\n");
        const title = titleLine.replace(/^###\s*/, "").trim();
        const rows = bodyLines
          .filter((line) => line.trim().length > 0)
          .map((line, rowIndex) => {
            const pairMatch = line.match(/^([^:：]+)[:：]\s*(.*)$/);

            if (pairMatch) {
              return {
                key: `${index}-${rowIndex}`,
                kind: "pair" as const,
                label: pairMatch[1].trim(),
                value: pairMatch[2].trim() || "无",
              };
            }

            return {
              key: `${index}-${rowIndex}`,
              kind: "text" as const,
              text: line.trim(),
            };
          });

        return {
          key: `${index}-${match?.[1] ?? "overview"}`,
          palace: match ? Number(match[1]) : null,
          title,
          rows,
        };
      });
    }, [structuredText]);

    if (!structuredText) {
      return <div className="empty-panel">等待生成结构化文本。</div>;
    }

    return (
      <div className="structured-output" ref={ref}>
        {blocks.map((block) => (
          <section
            key={block.key}
            className={cn(
              "structured-block",
              block.palace !== null && block.palace === selectedPalace && "is-active",
            )}
            data-palace-block={block.palace ?? undefined}
          >
            <div className="structured-block__header">
              <strong>{block.title}</strong>
              {block.palace !== null ? <span>{block.palace}宫</span> : null}
            </div>

            <div className="structured-block__rows">
              {block.rows.map((row) =>
                row.kind === "pair" ? (
                  <div className="structured-row" key={row.key}>
                    <span className="structured-row__label">{row.label}</span>
                    <strong className="structured-row__value">{row.value}</strong>
                  </div>
                ) : (
                  <div className="structured-row structured-row--text" key={row.key}>
                    <strong className="structured-row__value">{row.text}</strong>
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    );
  },
);
