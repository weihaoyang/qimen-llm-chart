import type { ReactNode } from "react";

const inlinePattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*[^*]+\*)/g;

function renderInline(value: string): ReactNode[] {
  return value.split(inlinePattern).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return <span key={index}>{part}</span>;
  });
}

type Block = { kind: "paragraph" | "heading" | "quote" | "ul" | "ol" | "code"; lines: string[]; level?: number };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) { index += 1; continue; }
    const fence = line.match(/^\s*```/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index] ?? "")) { code.push(lines[index] ?? ""); index += 1; }
      if (index < lines.length) index += 1;
      blocks.push({ kind: "code", lines: code });
      continue;
    }
    const heading = line.match(/^\s*(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (heading) { blocks.push({ kind: "heading", level: heading[1].length, lines: [heading[2]] }); index += 1; continue; }
    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index] ?? "")) { quote.push((lines[index] ?? "").replace(/^\s*>\s?/, "")); index += 1; }
      blocks.push({ kind: "quote", lines: quote });
      continue;
    }
    const list = line.match(/^\s*([-*+]\s+|\d+[.)]\s+)(.+)$/);
    if (list) {
      const kind = /^\d/.test(list[1]) ? "ol" : "ul";
      const items: string[] = [];
      while (index < lines.length) {
        const item = (lines[index] ?? "").match(/^\s*([-*+]\s+|\d+[.)]\s+)(.+)$/);
        if (!item || (kind === "ol") !== /^\d/.test(item[1])) break;
        items.push(item[2]); index += 1;
      }
      blocks.push({ kind, lines: items });
      continue;
    }
    const paragraph: string[] = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index]?.trim() && !/^\s*(#{1,4})\s+/.test(lines[index] ?? "") && !/^\s*([-*+]\s+|\d+[.)]\s+|>|```)/.test(lines[index] ?? "")) {
      paragraph.push((lines[index] ?? "").trim()); index += 1;
    }
    blocks.push({ kind: "paragraph", lines: paragraph });
  }
  return blocks;
}

export function AgentMarkdown({ content }: { content: string }) {
  if (!content.trim()) return null;
  return <div className="agent-markdown">
    {parseBlocks(content).map((block, index) => {
      if (block.kind === "heading") {
        const Heading = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
        return <Heading key={index}>{renderInline(block.lines[0] ?? "")}</Heading>;
      }
      if (block.kind === "code") return <pre className="agent-markdown__code" key={index}><code>{block.lines.join("\n")}</code></pre>;
      if (block.kind === "quote") return <blockquote key={index}>{block.lines.map((line, lineIndex) => <p key={lineIndex}>{renderInline(line)}</p>)}</blockquote>;
      if (block.kind === "ul" || block.kind === "ol") {
        const List = block.kind;
        return <List key={index}>{block.lines.map((line, itemIndex) => <li key={itemIndex}>{renderInline(line)}</li>)}</List>;
      }
      return <p key={index}>{block.lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 ? <br /> : null}{renderInline(line)}</span>)}</p>;
    })}
  </div>;
}
