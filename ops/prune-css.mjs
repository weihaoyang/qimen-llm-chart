import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const projectRoot = path.resolve(import.meta.dirname, "..");
const cssFiles = process.argv.slice(2);
const write = process.argv.includes("--write");
const requestedFiles = cssFiles.filter((item) => item !== "--write");

if (requestedFiles.length === 0) {
  throw new Error("Pass at least one CSS file to inspect.");
}

const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const excludedDirectories = new Set([".git", ".next", "node_modules", "outputs", "vendor"]);
const sourceChunks = [];

function collectSources(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (excludedDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSources(fullPath);
      continue;
    }
    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    sourceChunks.push(fs.readFileSync(fullPath, "utf8"));
  }
}

collectSources(path.join(projectRoot, "src"));
const sourceText = sourceChunks.join("\n");

const exactRuntimeClasses = new Set([
  "basic-info",
  "center-button",
  "center-title",
  "focused-palace",
  "horo-buttons",
  "opposite-palace",
  "solar-horoscope",
  "surrounded-palace",
  "today",
]);
const runtimePrefixes = [
  "agent-thread__message--",
  "ant-",
  "is-",
  "izpalace",
  "iztro",
  "product-",
  "radix-",
  "rc-",
  "react-",
  "semi-",
  "status-",
];

function isKnownClass(className) {
  return (
    exactRuntimeClasses.has(className) ||
    runtimePrefixes.some((prefix) => className.startsWith(prefix)) ||
    sourceText.includes(className)
  );
}

function selectorIsReachable(selector) {
  // Functional selectors are deliberately retained. Correctly splitting and
  // evaluating their nested selector lists requires a selector parser, and a
  // false positive here is more expensive than leaving one rule in place.
  if (/:\s*(?:has|is|not|where)\(/.test(selector)) return true;
  const classes = [...selector.matchAll(/\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g)].map((match) => match[1]);
  return classes.length === 0 || classes.every(isKnownClass);
}

for (const requestedFile of requestedFiles) {
  const absolutePath = path.resolve(projectRoot, requestedFile);
  const root = postcss.parse(fs.readFileSync(absolutePath, "utf8"), { from: absolutePath });
  let removedRules = 0;
  let removedSelectors = 0;

  root.walkRules((rule) => {
    const selectors = rule.selectors;
    const kept = selectors.filter(selectorIsReachable);
    removedSelectors += selectors.length - kept.length;
    if (kept.length === 0) {
      removedRules += 1;
      rule.remove();
      return;
    }
    if (kept.length !== selectors.length) rule.selectors = kept;
  });

  let removedContainers = true;
  while (removedContainers) {
    removedContainers = false;
    root.walkAtRules((atRule) => {
      if (atRule.nodes && atRule.nodes.length === 0) {
        atRule.remove();
        removedContainers = true;
      }
    });
  }

  const output = root.toString();
  if (write) fs.writeFileSync(absolutePath, output, "utf8");
  process.stdout.write(`${requestedFile}: ${removedRules} rules, ${removedSelectors} selectors${write ? " removed" : " removable"}\n`);
}
