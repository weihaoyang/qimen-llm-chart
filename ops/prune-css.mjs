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
const excludedDirectories = new Set([".git", ".next", "node_modules", "outputs"]);
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

const modeOwners = new Map([
  ["bazi.css", "bazi"],
  ["research.css", "research"],
  ["classic.css", "research"],
  ["ziwei.css", "ziwei"],
  ["qimen-workbench.css", "qimen"],
]);
const modeClassPatterns = [
  ["bazi", /\.bazi-[\w-]+/],
  ["research", /\.(?:kline|classic-observatory|combined-agent)-[\w-]+|\.kline-panel\b/],
  ["ziwei", /\.(?:ziwei|iztro|izpalace)[\w-]*/],
  ["qimen", /\.(?:palace-grid|palace-card|summary-strip|summary-chip|qimen-board-layout|palace-grid-shell)(?:[\w-]*)/],
];

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
const exactRuntimeSelectors = new Set([
  ".agent-thread__message--user",
  ".agent-thread__message--assistant",
  ".agent-thread__message--tool",
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
  "recharts-",
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
  if (exactRuntimeSelectors.has(selector)) return true;
  const classes = [...selector.matchAll(/\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g)].map((match) => match[1]);
  return classes.length === 0 || classes.every(isKnownClass);
}

for (const requestedFile of requestedFiles) {
  const absolutePath = path.resolve(projectRoot, requestedFile);
  const root = postcss.parse(fs.readFileSync(absolutePath, "utf8"), { from: absolutePath });
  const owner = modeOwners.get(path.basename(absolutePath));
  const ownershipErrors = [];
  root.walkRules((rule) => {
    for (const selector of rule.selectors) {
      if (owner && !selector.includes(`[data-mode="${owner}"]`)) {
        ownershipErrors.push(`${rule.source.start.line}: missing [data-mode="${owner}"]`);
      }
      for (const [mode, pattern] of modeClassPatterns) {
        if (pattern.test(selector) && mode !== owner) {
          ownershipErrors.push(`${rule.source.start.line}: ${mode} selector outside ${mode} stylesheet`);
        }
      }
    }
  });
  if (ownershipErrors.length) {
    throw new Error(`${requestedFile} violates chart style ownership:\n${ownershipErrors.join("\n")}`);
  }
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
