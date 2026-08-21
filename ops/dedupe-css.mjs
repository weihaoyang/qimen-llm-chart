import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const projectRoot = path.resolve(import.meta.dirname, "..");
const write = process.argv.includes("--write");
const requestedFiles = process.argv.slice(2).filter((item) => item !== "--write");

if (requestedFiles.length === 0) throw new Error("Pass at least one CSS file to inspect.");

function removeOverriddenDeclarations(container) {
  const laterBySelector = new Map();
  let removedDeclarations = 0;
  let removedRules = 0;

  for (const node of [...(container.nodes ?? [])].reverse()) {
    if (node.type === "atrule" && node.nodes) {
      const nested = removeOverriddenDeclarations(node);
      removedDeclarations += nested.removedDeclarations;
      removedRules += nested.removedRules;
      if (node.nodes.length === 0) node.remove();
      continue;
    }
    if (node.type !== "rule") continue;

    for (const child of [...(node.nodes ?? [])].reverse()) {
      if (child.type !== "decl") continue;
      const laterValues = node.selectors.map((selector) => laterBySelector.get(selector)?.get(child.prop));
      const overriddenForEverySelector = laterValues.every(
        (later) => later && (!child.important || later.important),
      );

      if (overriddenForEverySelector) {
        child.remove();
        removedDeclarations += 1;
        continue;
      }

      for (const selector of node.selectors) {
        let properties = laterBySelector.get(selector);
        if (!properties) {
          properties = new Map();
          laterBySelector.set(selector, properties);
        }
        const existing = properties.get(child.prop);
        if (!existing || child.important) properties.set(child.prop, { important: child.important });
      }
    }

    if (!node.nodes?.some((child) => child.type === "decl" || child.type === "atrule")) {
      node.remove();
      removedRules += 1;
    }
  }

  return { removedDeclarations, removedRules };
}

for (const requestedFile of requestedFiles) {
  const absolutePath = path.resolve(projectRoot, requestedFile);
  const root = postcss.parse(fs.readFileSync(absolutePath, "utf8"), { from: absolutePath });
  const result = removeOverriddenDeclarations(root);
  if (write) fs.writeFileSync(absolutePath, root.toString(), "utf8");
  process.stdout.write(
    `${requestedFile}: ${result.removedDeclarations} overridden declarations, ${result.removedRules} empty rules${write ? " removed" : " removable"}\n`,
  );
}
