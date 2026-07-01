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
        return {
          key: `${index}-${match?.[1] ?? "overview"}`,
          palace: match ? Number(match[1]) : null,
          text: normalizedBlock,
        };
      });
    }, [structuredText]);

    if (!structuredText) {
      return <div className="empty-panel">等待生成结构化文本。</div>;
    }

    return (
      <div className="structured-output" ref={ref}>
        {blocks.map((block) => (
          <pre
            key={block.key}
            className={cn(
              "structured-block",
              block.palace !== null && block.palace === selectedPalace && "is-active",
            )}
            data-palace-block={block.palace ?? undefined}
          >
            {block.text}
          </pre>
        ))}
      </div>
    );
  },
);
