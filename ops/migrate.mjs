import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const migrationsDir = join(root, "database", "migrations");
const command = process.argv[2] ?? "status";
const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL is required");

const files = (await readdir(migrationsDir)).filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file)).sort();
// Fixed application-level advisory lock key, namespaced to this migrator.
// Any concurrent `apply` blocks here until the holder finishes.
const MIGRATION_LOCK_KEY = 8274513096;
// A migration opts out of the runner's transaction by carrying this line:
//
//     -- migrate:no-transaction
//
// It exists because `CREATE INDEX CONCURRENTLY` — the only way to add an index to
// a populated table without holding `ACCESS EXCLUSIVE` and blocking every write —
// is rejected inside a transaction block. Without the opt-out the capability is
// simply not expressible, so a future index on a large table has no non-blocking
// form.
//
// Opting out gives up atomicity: the DDL and the ledger row can no longer commit
// together, so a crash in between leaves the work done but unrecorded and the next
// `apply` re-runs the file. **A no-transaction migration must therefore be
// idempotent** — and for `CONCURRENTLY` that means more than `IF NOT EXISTS`:
//
//     DROP INDEX CONCURRENTLY IF EXISTS name;
//     CREATE INDEX CONCURRENTLY name ON ...;
//
// `IF NOT EXISTS` alone is not enough, because a `CREATE INDEX CONCURRENTLY` that
// fails part-way leaves behind an *invalid* index under that name. The name exists,
// so the next run skips it, and the index stays unusable. Dropping first is what
// makes the retry actually rebuild it.
const NO_TRANSACTION_DIRECTIVE = /^\s*--\s*migrate:no-transaction\s*$/im;

/**
 * Split a migration file into individual statements.
 *
 * The no-transaction path must send each statement on its own. PostgreSQL wraps a
 * *multi-statement* simple query in an implicit transaction block, and
 * `CREATE INDEX CONCURRENTLY` is refused inside any transaction block — so sending
 * the whole file as one query fails even after the explicit transaction is gone.
 * Splitting on `;` alone would cut a statement in half at a semicolon inside a
 * string, a `$$`-quoted body, or a comment, so this tracks those contexts.
 */
const splitStatements = (sql) => {
  const statements = [];
  let current = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end + 1;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j += 1; break; }
        j += 1;
      }
      current += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === "$") {
      const tag = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
      if (tag) {
        const close = sql.indexOf(tag[0], i + tag[0].length);
        const stop = close === -1 ? sql.length : close + tag[0].length;
        current += sql.slice(i, stop);
        i = stop;
        continue;
      }
    }
    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
};
const pool = new Pool({ connectionString, ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined, application_name: "shengtian-banzi-migrator", max: 1 });
try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version varchar(128) PRIMARY KEY, checksum varchar(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
  const applied = new Map((await pool.query("SELECT version,checksum FROM schema_migrations ORDER BY version")).rows.map((row) => [row.version, row.checksum]));
  if (command === "status") {
    for (const file of files) {
      const checksum = createHash("sha256").update(await readFile(join(migrationsDir, file))).digest("hex");
      const value = applied.get(file);
      console.log(`${value ? value === checksum ? "applied" : "changed" : "pending"}\t${file}`);
    }
    process.exitCode = 0;
  } else if (command === "apply") {
    // Hold a session-level advisory lock across the whole apply phase. Without
    // it, two concurrent runs (two deploy pods, a retried CI job) both read an
    // empty ledger and then race on DDL, which fails one of them with a
    // pg_type_typname_nsp_index duplicate-key error.
    // The lock is taken on the same client that runs the migrations: the pool
    // is sized at 1, so checking out a second client while holding this one
    // would deadlock.
    const client = await pool.connect();
    try {
      await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
      // Re-read the ledger *inside* the lock — another process may have applied
      // migrations between the first read and lock acquisition.
      applied.clear();
      for (const row of (await client.query("SELECT version,checksum FROM schema_migrations ORDER BY version")).rows) {
        applied.set(row.version, row.checksum);
      }
      for (const file of files) {
        const sql = await readFile(join(migrationsDir, file), "utf8");
        const checksum = createHash("sha256").update(sql).digest("hex");
        const previous = applied.get(file);
        if (previous && previous !== checksum) throw new Error(`Applied migration changed: ${file}`);
        if (previous) continue;
        // Every migration file carries its own `BEGIN; … COMMIT;`. The runner
        // also owns a transaction, so nesting them made each file's COMMIT end
        // the runner's transaction early: the ledger INSERT below then ran in
        // autocommit, and a crash between the two would leave the migration
        // applied but unrecorded. Strip the file-level transaction control so
        // the runner's transaction covers the DDL *and* the ledger row.
        const statement = sql
          .replace(/^\s*BEGIN\s*;\s*/i, "")
          .replace(/\s*COMMIT\s*;\s*$/i, "");
        const noTransaction = NO_TRANSACTION_DIRECTIVE.test(sql);
        if (!noTransaction && /CONCURRENTLY/i.test(statement)) {
          // Fail with the reason and the fix rather than letting PostgreSQL report
          // "CREATE INDEX CONCURRENTLY cannot run inside a transaction block" at
          // deploy time, where the author has no context for it.
          throw new Error(
            `${file} uses CONCURRENTLY, which PostgreSQL rejects inside a transaction block. ` +
            `Add a "-- migrate:no-transaction" line and make the whole file idempotent ` +
            `(DROP ... IF EXISTS before CREATE ... IF NOT EXISTS) — see ops/migrate.mjs.`,
          );
        }
        if (noTransaction) {
          for (const one of splitStatements(statement)) await client.query(one);
          await client.query("INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)", [file, checksum]);
          console.log(`applied\t${file}\t(no transaction — file must be idempotent)`);
          continue;
        }
        try {
          await client.query("BEGIN");
          await client.query(statement);
          await client.query("INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)", [file, checksum]);
          await client.query("COMMIT");
          console.log(`applied\t${file}`);
        } catch (error) {
          try { await client.query("ROLLBACK"); } catch { /* the connection is already unusable */ }
          throw error;
        }
      }
    } finally {
      try { await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]); } catch { /* session end releases it */ }
      client.release();
    }
  } else throw new Error("Usage: node ops/migrate.mjs status|apply");
} finally { await pool.end(); }
