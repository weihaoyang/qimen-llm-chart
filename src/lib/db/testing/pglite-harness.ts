/**
 * A real Postgres for the test suite, running in-process.
 *
 * The SQL in this repository is written against Postgres semantics — `jsonb`
 * casts, `ON CONFLICT` with a primary-key target, `ANY($1::uuid[])`, explicit
 * transaction blocks, partial indexes, `CHECK (jsonb_typeof(...) = 'object')`.
 * A fake client that records statement text exercises none of that: it cannot
 * tell you whether `$2::uuid[]` accepts a JS array, whether a multi-row
 * `INSERT ... ON CONFLICT DO UPDATE` touching the same row twice is rejected,
 * or whether a `NOT VALID` constraint actually rejects a scalar.
 *
 * Previously the only way to run against a real engine was to point
 * `QMDJ_INTEGRATION_DATABASE_URL` at a server, so those tests were skipped
 * everywhere except a developer's machine. PGlite is Postgres compiled to WASM,
 * so the real migrations and the real repository code can run here.
 *
 * What this is *not*: a concurrency test. PGlite has one connection, so
 * `connect()` hands out the same session every time and `FOR UPDATE` never
 * contends. Lock-ordering bugs stay invisible. It is a semantics check.
 */
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PGlite } from "@electric-sql/pglite";

const MIGRATION_FILE = /^\d+_[a-z0-9_-]+\.sql$/i;

/**
 * The migrations directory, resolved without assuming the environment.
 *
 * This module is loaded by the vitest setup file, so it is imported by *every*
 * test file — including the ones running under jsdom, where `import.meta.url` is
 * not a `file:` URL and `fileURLToPath` throws. Resolving lazily keeps module
 * load free of environment assumptions, and the fallback keeps a jsdom file from
 * failing on an import it never uses.
 */
const migrationsDir = () => {
  try {
    return resolve(fileURLToPath(new URL("../../../../database/migrations/", import.meta.url)));
  } catch {
    return resolve(process.cwd(), "database/migrations");
  }
};

export type TestQueryResult<T> = { rows: T[]; rowCount: number };

export type TestStatement = { text: string; values: unknown[] };

export type TestDatabase = {
  db: PGlite;
  /** Every statement the pool has seen, including the transaction control ones. */
  statements: TestStatement[];
  close: () => Promise<void>;
};

export type TestPool = {
  query: <T>(text: string, values?: unknown[]) => Promise<TestQueryResult<T>>;
  connect: () => Promise<{ query: TestPool["query"]; release: (destroy?: boolean) => void }>;
  end: () => Promise<void>;
};

/**
 * Every migration file, in the order `ops/migrate.mjs` applies them.
 *
 * An empty result is an error rather than an empty suite: it means the directory
 * was not found, and a test run that silently checks nothing is worse than one
 * that fails.
 */
export const listMigrationFiles = async () => {
  const dir = migrationsDir();
  const files = (await readdir(dir)).filter((file) => MIGRATION_FILE.test(file)).sort();
  if (!files.length) throw new Error(`未找到迁移文件：${dir}`);
  return files;
};

/**
 * Every migration's SQL, in apply order.
 *
 * Shared with the real-server harness so both backends are built from the same
 * files in the same order — a divergence there would make a passing PGlite suite
 * say nothing about the server.
 */
export const readMigrations = async () => {
  const dir = migrationsDir();
  return Promise.all((await listMigrationFiles()).map(async (file) => ({ file, sql: await readFile(join(dir, file), "utf8") })));
};

/**
 * Every migration, in filename order, applied to an empty database.
 *
 * Each file carries its own `BEGIN;`/`COMMIT;`, so the whole directory can be
 * replayed with no extra bookkeeping — the same property `ops/migrate.mjs`
 * relies on.
 *
 * PGlite is imported dynamically because the whole suite loads this module
 * through the vitest setup file. A static import would pull the WASM build into
 * every test file, including the ~85 that never touch the database.
 */
export const createMigratedDatabase = async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = migrationsDir();
  const db = new PGlite();
  for (const file of await listMigrationFiles()) {
    await db.exec(await readFile(join(dir, file), "utf8"));
  }
  return db;
};

/**
 * `pg` reports `rowCount` as the size of the result set when the statement
 * produced one, and as the number of affected rows otherwise. PGlite instead
 * reports `affectedRows: 0` for every `SELECT`, which would make the repository's
 * `if (!owner.rowCount) return null` guards fire on rows that exist. Deriving it
 * the way `pg` does keeps those guards meaningful.
 */
const rowCountOf = (result: { rows: unknown[]; affectedRows?: number; fields?: unknown[] }) =>
  (result.fields?.length ?? 0) > 0 ? result.rows.length : result.affectedRows ?? 0;

const clientFor = (db: PGlite, statements?: TestStatement[]) => {
  const query: TestPool["query"] = async <T>(text: string, values: unknown[] = []) => {
    statements?.push({ text, values });
    const result = await db.query<T>(text, values as never[]);
    return { rows: result.rows, rowCount: rowCountOf(result) };
  };
  return { query, release: () => {} };
};

/**
 * Install the database as the process-wide pool.
 *
 * `src/lib/db/pool.ts` caches its pool on `globalThis.qmdjPool` and reads that
 * cache on every `query`/`withTransaction` call, so assigning here redirects the
 * real repositories without touching them. `DATABASE_URL` is set to a value the
 * `pg` driver would reject: if any code path escapes this seam and constructs a
 * real pool, the connection attempt fails loudly instead of silently reaching a
 * developer's local server.
 *
 * Recording statements here lets one test assert both halves of a batching claim
 * — that the values are right *and* that they arrived in a single statement.
 */
export const installTestPool = async (): Promise<TestDatabase> => {
  const db = await createMigratedDatabase();
  const statements: TestStatement[] = [];
  const client = clientFor(db, statements);
  process.env.DATABASE_URL = "postgres://pglite.invalid/test";
  (globalThis as { qmdjPool?: TestPool }).qmdjPool = {
    query: client.query,
    connect: async () => clientFor(db, statements),
    end: async () => { await db.close(); },
  };
  return { db, statements, close: async () => { uninstallTestPool(); await db.close(); } };
};

export const uninstallTestPool = () => {
  delete (globalThis as { qmdjPool?: TestPool }).qmdjPool;
};

/**
 * Install the database suite-wide, building it on first use.
 *
 * Four files gate their whole suite on `QMDJ_RUN_DB_TESTS=1` plus an integration
 * URL, which meant their contracts were only ever checked on a machine with a
 * server running. The setup file sets those two variables and calls this, so
 * they run everywhere.
 *
 * The build is deferred because migrating takes about a second: paying that in
 * every one of the ~85 files that never issue a query would dominate the suite's
 * runtime for no benefit. A file that never queries never constructs anything.
 */
export const installLazyTestPool = () => {
  let pending: Promise<PGlite> | null = null;
  const ready = () => (pending ??= createMigratedDatabase());
  const query: TestPool["query"] = async <T>(text: string, values: unknown[] = []) => {
    const result = await (await ready()).query<T>(text, values as never[]);
    return { rows: result.rows, rowCount: rowCountOf(result) };
  };
  process.env.DATABASE_URL = "postgres://pglite.invalid/test";
  (globalThis as { qmdjPool?: TestPool }).qmdjPool = {
    query,
    connect: async () => ({ query, release: () => {} }),
    // The gated suites close the pool in `afterAll`. Clearing `pending` lets a
    // later query in the same file rebuild rather than reuse a closed handle.
    end: async () => {
      const current = pending;
      pending = null;
      if (current) await (await current).close();
    },
  };
};
