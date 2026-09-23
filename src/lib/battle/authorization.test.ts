import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

/**
 * Every battle-scoped repository function must be authorisable.
 *
 * The two ways a function can fail that are visible from its signature:
 *  - it touches a `battle_*` table but takes no authenticated subject, so there
 *    is nothing to authorise *against*;
 *  - it takes a subject and ignores it, so the filter cannot have been applied.
 *
 * The routes were checked by hand in the same pass and came out clean: no route
 * under `src/app/api` imports the database pool except the health probe, so no
 * route runs its own SQL and none can bypass these functions.
 *
 * This file parses with the TypeScript compiler rather than matching text. That
 * is not a stylistic preference — a text scanner produced three false positives
 * in a row on this codebase (a `{` inside a generic argument, inside a return
 * type annotation, and inside an object type each truncated the "body" it saw),
 * and an earlier regex-based census silently missed a whole nesting level. The
 * parser removes that entire class of error.
 *
 * It does *not* remove the need for a population check: the first version of this
 * scan found **28 of 115** functions, because `export const f = async () => …`
 * puts the `export` modifier on the enclosing statement rather than on the arrow
 * function. A census that silently sees a quarter of the code is worse than no
 * census. Hence the assertions at the bottom.
 *
 * ---
 *
 * A signature check is necessary but not sufficient, and the gap is the one this
 * audit keeps finding: **a function can take a subject and still run an
 * unauthorised query inside.** So the third and fourth checks below read the SQL.
 *
 * Both have to *resolve interpolations*. The access predicate is not written
 * inline at every site — it is a file-scope constant (`writableCollaborator`,
 * `contributorBattlePredicate`, `activeCollaborator`) pasted into the statement
 * as `${…}`. A scanner that matches raw statement text sees no
 * `role='contributor'` at those sites and would report every correctly-guarded
 * write as a violation. So `${name}` is expanded against the file's own constants
 * (through identifier aliases and predicate factories) before any classification
 * happens.
 *
 * Whitespace is normalised for the same reason: the first predicate census used
 * the needle `EXISTS (SELECT 1 FROM battle_collaborators`, and a copy split across
 * four lines — `scenarios/repository.ts` — was invisible to it. **The scanner's
 * pattern decided the answer**, again. Normalising first removes it.
 *
 * ---
 *
 * The invariant the last check encodes is stated in the source itself, at
 * `extended-repository.ts`:
 *
 * > Canonical battle state is writable by the owner and contributors only.
 * > Advisors submit opinions through the advice/decision-board surfaces.
 *
 * The four collaborator roles are `viewer`, `contributor`, `advisor`, `owner`
 * (migration 005), so `contributor` is what separates a reader from a writer — and
 * the predicate is duplicated, in two forms, across seven files. A write that gets
 * the read form is a role escalation no type checker and no route-level test can
 * see. That is what the marker below exists to prevent.
 */

const repositoryFiles = [
  ...readdirSync("src/lib/battle")
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => join("src/lib/battle", name)),
  ...readdirSync("src/lib/scenarios")
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts") && name.includes("repository"))
    .map((name) => join("src/lib/scenarios", name)),
];

type Signal = {
  file: string;
  line: number;
  /** Interpolations resolved, whitespace collapsed. */
  text: string;
  /** The reason given by an adjacent `authz-exempt:` marker, if any. */
  exempt: string | null;
  /** Raw source text, before interpolation — used to prove expansion happened. */
  raw: string;
};

type Entry = {
  file: string;
  name: string;
  params: string[];
  exported: boolean;
  /** `battle_*` mentions inside string literals only — comments do not count. */
  battleTables: string[];
  usesSubject: boolean;
  signals: Signal[];
};

/**
 * A site may opt out of the predicate check only by saying why, next to the code.
 *
 * Keyed on a marker rather than a `file:line` allow-list on purpose: line numbers
 * rot (the report's own "位置" column is the standing proof), and an entry that
 * silently stops matching is indistinguishable from a fixed defect.
 */
const EXEMPTION = /authz-exempt:\s*([^\n*]+)/;

/** File-scope string constants and predicate factories, so `${name}` is not a black box. */
const fileConstants = (source: ts.SourceFile): Map<string, string> => {
  const constants = new Map<string, string>();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const init = declaration.initializer;
      if (!init) continue;
      const name = declaration.name.getText();
      if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init) || ts.isTemplateExpression(init) || ts.isIdentifier(init)) {
        // An identifier initializer is an alias — `resolve` follows it.
        constants.set(name, init.getText());
      } else if (ts.isArrowFunction(init) && init.body && (ts.isTemplateExpression(init.body) || ts.isStringLiteral(init.body) || ts.isNoSubstitutionTemplateLiteral(init.body))) {
        // `const contributorCasePredicate34 = (alias) => \`…\``
        constants.set(name, init.body.getText());
      }
    }
  }
  return constants;
};

/** Replace `${name}` / `${name(args)}` with the constant it names, recursively. */
const expand = (text: string, constants: Map<string, string>, depth = 0): string => {
  if (depth > 4) return text;
  return text.replace(/\$\{([A-Za-z_$][\w$]*)(?:\([^)]*\))?\}/g, (whole, name: string) => {
    const value = constants.get(name);
    if (value === undefined) return whole;
    // `const writableBattlePredicate = contributorBattlePredicate;` names another
    // constant rather than containing text — follow the chain, do not emit the name.
    if (/^[A-Za-z_$][\w$]*$/.test(value)) return expand(`\${${value}}`, constants, depth + 1);
    return expand(value, constants, depth + 1);
  });
};

const normalise = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Does this statement open a nested scope of its own?
 *
 * `return withTransaction(async (client) => { … })` contains the whole
 * transaction, so recording it would report a read-only role probe and the write
 * it guards as one unit — a false positive that hides the real granularity. A
 * nested block means the statements inside it will be recorded on their own, so
 * the container is skipped. An arrow with an *expression* body (`.map((x) => x)`)
 * opens no block and must not be skipped.
 */
const opensNestedScope = (node: ts.Node): boolean => {
  let found = false;
  const walk = (current: ts.Node) => {
    if (found) return;
    if (ts.isBlock(current) || ts.isModuleBlock(current)) {
      found = true;
      return;
    }
    ts.forEachChild(current, walk);
  };
  ts.forEachChild(node, walk);
  return found;
};

/**
 * Statements, not template literals.
 *
 * A statement's text already contains every SQL string inside it, which keeps the
 * exemption marker (a comment on the line above) attached to the right unit and
 * makes `if (!await authorise(...)) return null;` visible as one unit.
 */
const collectSignals = (body: ts.Node, file: string, source: ts.SourceFile, constants: Map<string, string>, fileText: string): Signal[] => {
  const signals: Signal[] = [];
  const push = (node: ts.Node) => {
    const start = node.getStart(source);
    const before = fileText.slice(Math.max(0, start - 600), start);
    const markers = [...before.matchAll(new RegExp(EXEMPTION, "g"))];
    const raw = node.getText();
    signals.push({
      file,
      line: source.getLineAndCharacterOfPosition(start).line + 1,
      text: normalise(expand(raw, constants)),
      raw,
      exempt: markers.length ? markers[markers.length - 1][1].trim() : null,
    });
  };

  const walk = (node: ts.Node) => {
    if (ts.isBlock(node) || ts.isSourceFile(node) || ts.isModuleBlock(node) || ts.isCaseClause(node) || ts.isDefaultClause(node)) {
      for (const statement of node.statements) {
        if (!opensNestedScope(statement)) push(statement);
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(body);

  // An expression-bodied arrow (`const owned = (s, b) => isBattleOwner(s, b)`) has
  // no statement list at all. Without this its body is invisible, and every caller
  // that authorises through such a helper looks unauthorised.
  if (!signals.length && !ts.isBlock(body)) push(body);
  return signals;
};

const scan = (): Entry[] => {
  const entries: Entry[] = [];

  /** `battle_*` in table position inside a SQL string — `battle_id` is a column. */
  const tableReferences = (literal: string) =>
    [...literal.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+(battle_[a-z_]+)/gi)].map((match) => match[1].toLowerCase());

  for (const file of repositoryFiles) {
    const fileText = readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, fileText, ts.ScriptTarget.Latest, true);
    const constants = fileConstants(source);

    const record = (name: string, fn: ts.FunctionLikeDeclaration, exported: boolean) => {
      const params = fn.parameters.map((parameter) => parameter.name.getText());
      const body = fn.body?.getText() ?? "";
      const literals: string[] = [];
      const walkLiterals = (node: ts.Node) => {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) literals.push(node.text);
        ts.forEachChild(node, walkLiterals);
      };
      if (fn.body) walkLiterals(fn.body);
      entries.push({
        file,
        name,
        params,
        exported,
        battleTables: [...new Set(literals.flatMap(tableReferences))],
        usesSubject: /\bsubject\b/.test(body),
        signals: fn.body ? collectSignals(fn.body, file, source, constants, fileText) : [],
      });
    };

    const visit = (node: ts.Node) => {
      const exported = ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (ts.isFunctionDeclaration(node) && node.name) record(node.name.text, node, exported);
      // `export const f = async () => …` — the modifier lives on the statement.
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          const init = declaration.initializer;
          if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) record(declaration.name.getText(), init, exported);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return entries;
};

/** A statement that changes rows in a `battle_*` table. */
const writesBattleTable = (text: string) => /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+battle_[a-z_]+\b/i.test(text);
/** The `battle_cases` root row itself; every other `battle_*` table hangs off it. */
const writesChildTable = (text: string) =>
  [...text.matchAll(/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(battle_[a-z_]+)\b/gi)].some((match) => match[1] !== "battle_cases");
/** An owner-scoped filter, or any reference to the collaborator table. */
const predicatePresent = (text: string) => /battle_collaborators/.test(text) || /subject_type\s*=\s*\$\d+/.test(text);
/** The collaborator role that may write canonical state. */
const WRITE_FORM = /role\s*=\s*'contributor'/;

describe("battle repository authorisation", () => {
  const entries = scan();
  const exported = entries.filter((entry) => entry.exported);
  const allSignals = entries.flatMap((entry) => entry.signals);

  /**
   * Helpers that authorise, discovered rather than listed.
   *
   * Half of these functions do not carry a predicate of their own — they call
   * `ownerBattleForClient` / `owned` / `accessible` / `getBattle` first. A
   * hand-maintained list of those names would be one more thing to forget, so it
   * is derived: any function anywhere in the scanned tree whose own statements
   * carry a predicate is treated as authorising for its callers.
   */
  /** A predicate only the owner satisfies — stricter than the write form. */
  const ownerOnly = (text: string) => /subject_type\s*=\s*\$\d+/.test(text) && !/battle_collaborators/.test(text);
  /** A predicate that admits a writer: contributor explicitly, or the owner alone. */
  const writeGrade = (text: string) => WRITE_FORM.test(text) || ownerOnly(text);

  const callPattern = (names: Set<string>) => (names.size ? new RegExp(`\\b(?:${[...names].join("|")})\\s*\\(`) : /(?!)/);

  /**
   * Close a set of function names over "calls something already in the set".
   *
   * The predicate is often one hop away: `owned` only calls `isBattleOwner`, and
   * `accessible` only calls `getBattle`. A single pass would call `removeAttachment`
   * unauthorised — it authorises through `owned`. Three passes cover the depth
   * this tree actually has.
   */
  const close = (seed: (entry: Entry) => boolean): Set<string> => {
    const names = new Set(entries.filter(seed).map((entry) => entry.name));
    for (let pass = 0; pass < 3; pass += 1) {
      const call = callPattern(names);
      for (const entry of entries) {
        if (!names.has(entry.name) && entry.signals.some((signal) => call.test(signal.text))) names.add(entry.name);
      }
    }
    return names;
  };

  const authorisingNames = close((entry) => entry.signals.some((signal) => predicatePresent(signal.text)));
  const authorisingCall = callPattern(authorisingNames);
  const authorises = (entry: Entry) => entry.signals.some((signal) => predicatePresent(signal.text) || authorisingCall.test(signal.text));

  const writeGradeNames = close((entry) => entry.signals.some((signal) => writeGrade(signal.text)));
  const writeGradeCall = callPattern(writeGradeNames);
  const writeAuthorised = (entry: Entry) => entry.signals.some((signal) => writeGrade(signal.text) || writeGradeCall.test(signal.text));

  /** A function-level exemption: the marker sits next to the statement it excuses. */
  const exemptionFor = (entry: Entry) => entry.signals.find((signal) => signal.exempt)?.exempt ?? null;

  it("never touches battle data without an authenticated subject", () => {
    const offenders = exported
      .filter((entry) => entry.battleTables.length > 0 && !entry.params.includes("subject"))
      .map((entry) => `${entry.file}: ${entry.name}(${entry.params.join(", ")}) touches ${entry.battleTables.join(", ")}`);
    expect(offenders).toEqual([]);
  });

  it("never accepts a subject it does not use", () => {
    const offenders = exported
      .filter((entry) => entry.params.includes("subject") && !entry.usesSubject)
      .map((entry) => `${entry.file}: ${entry.name}(${entry.params.join(", ")})`);
    expect(offenders).toEqual([]);
  });

  /**
   * A write into an *existing* battle must sit behind authorisation.
   *
   * The scope is deliberate: `battleId` in the signature plus a write to a child
   * table. That is exactly the shape where a missing or wrong `WHERE` is
   * invisible, and it needs no allow-list — a function that creates a battle
   * (`createBattle`, `cloneScenario`) writes the root row and takes no
   * `battleId`, so it is out of scope by construction rather than by exemption.
   */
  it("never writes into an existing battle without authorising", () => {
    const offenders = exported
      .filter((entry) => entry.params.includes("battleId"))
      .filter((entry) => entry.signals.some((signal) => writesChildTable(signal.text)))
      .filter((entry) => !authorises(entry))
      .map((entry) => `${entry.file}: ${entry.name}(${entry.params.join(", ")})`);
    expect(offenders).toEqual([]);
  });

  /**
   * A function that writes a battle's child rows must be authorised *to write* —
   * not merely to read.
   *
   * This is the check that separates a reader from a writer, and it is the one no
   * other layer can make: the route already required a subject, the type checker
   * sees a string, and a viewer reading a battle exercises the same `accessible()`
   * path as a contributor.
   *
   * It is deliberately *function*-level. The guard statement is usually a
   * `SELECT … FOR UPDATE` that takes no write of its own, so a statement-level
   * rule would never look at it — and the guard is exactly where the two forms
   * get swapped by accident. `interview-repository.ts` was the case in point:
   * `appendInterviewTurn` and `markInterviewTurnAccepted` are adjacent functions
   * writing the same table, and they had picked different forms.
   *
   * Exempt sites say why at the code. If that list grows without a reason
   * attached, the guard has stopped being a guard — hence the bound below.
   */
  it("never lets a read-only collaborator reach a write path", () => {
    const offenders = exported
      .filter((entry) => entry.params.includes("battleId"))
      .filter((entry) => entry.signals.some((signal) => writesChildTable(signal.text)))
      .filter((entry) => !exemptionFor(entry))
      .filter((entry) => !writeAuthorised(entry))
      .map((entry) => `${entry.file}: ${entry.name}(${entry.params.join(", ")})`);
    expect(offenders).toEqual([]);
  });

  // A guard that silently matches nothing passes for the wrong reason and protects
  // nothing. The first version of this scan saw 28 of 115 functions; pin the
  // population so that failure cannot come back unnoticed.
  it("actually inspects the repository surface", () => {
    expect(exported.length).toBeGreaterThan(100);
    expect(exported.filter((entry) => entry.battleTables.length > 0).length).toBeGreaterThan(50);
    expect(exported.filter((entry) => entry.params.includes("subject")).length).toBeGreaterThan(50);

    // The predicate checks are only meaningful if the census really sees the SQL.
    const writes = allSignals.filter((signal) => writesBattleTable(signal.text));
    expect(writes.length).toBeGreaterThan(50);
    expect(writes.filter((signal) => /battle_collaborators/.test(signal.text)).length).toBeGreaterThan(8);
    expect(allSignals.filter((signal) => WRITE_FORM.test(signal.text)).length).toBeGreaterThan(10);

    // Interpolation really is resolved: these sites name the predicate but their
    // raw text contains no `battle_collaborators` at all.
    const resolvedOnly = allSignals.filter((signal) => !/battle_collaborators/.test(signal.raw) && /battle_collaborators/.test(signal.text));
    expect(resolvedOnly.length).toBeGreaterThan(15);
    // ...and the derived helper list is real, not empty.
    expect(authorisingNames.size).toBeGreaterThan(2);

    // Exemptions must stay rare and reasoned.
    const exempted = exported.filter((entry) => exemptionFor(entry));
    expect(exempted.length).toBeGreaterThan(1);
    expect(exempted.length).toBeLessThan(8);
    expect(exempted.every((entry) => (exemptionFor(entry) ?? "").length > 12)).toBe(true);
  });
});
