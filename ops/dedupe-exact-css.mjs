import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const files = process.argv.slice(2);
if (!files.length) throw new Error("Pass CSS files.");

for (const file of files) {
  const absolute = path.resolve(file);
  const root = postcss.parse(fs.readFileSync(absolute, "utf8"), { from: absolute });
  const seen = new Set();
  let removed = 0;
  function visit(container) {
    for (const node of [...(container.nodes ?? [])]) {
      if (node.type === "atrule" && node.nodes) {
        visit(node);
        continue;
      }
      if (node.type !== "rule") continue;
      const key = `${node.selector}\n${node.nodes?.map((child) => child.toString()).join("\n") ?? ""}`;
      if (seen.has(key)) {
        node.remove();
        removed += 1;
      } else {
        seen.add(key);
      }
    }
  }
  visit(root);
  fs.writeFileSync(absolute, root.toString(), "utf8");
  console.log(`${file}: ${removed} exact duplicate rules removed`);
}
