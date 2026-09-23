/**
 * A real Postgres server for the tests PGlite cannot run.
 *
 * PGlite is Postgres compiled to WASM, which is enough to check semantics: casts,
 * `jsonb` typing, `ON CONFLICT`, constraint enforcement. It is *one connection*,
 * so it cannot check anything about concurrency. `connect()` hands out the same
 * session every time, `FOR UPDATE` never contends, and two transactions that
 * would deadlock on a real server simply run one after the other.
 *
 * Everything the repositories rely on for correctness under contention — that a
 * compare-and-set admits exactly one winner, that the battle row lock serializes
 * writers into a whole state rather than an interleaved one — is therefore
 * unverified by the PGlite suite. This harness closes that gap against a real
 * server.
 *
 * The real `pg` Pool is installed **as-is**, with no adapter. `TestPool` was
 * shaped to match `pg` in the first place (the PGlite adapter exists only to make
 * PGlite look like `pg`), so the real thing already satisfies it.
 *
 * Enabled by `QMDJ_TEST_REAL_DATABASE_URL`. When it is unset the concurrency
 * suite skips: a server is not present on every machine, and a suite that fails
 * for want of infrastructure gets deleted rather than fixed.
 */
import { createRequire } from "node:module";
import type { Pool as PgPool, PoolClient } from "pg";
import { readMigrations, uninstallTestPool } from "./pglite-harness";

const require = createRequire(import.meta.url);

export type RealTestPool = {
  /** The raw pool, for tests that need to hold a connection open themselves. */
  pool: PgPool;
  /** Every statement the *installed* pool has seen, in order. */
  statements: Array<{ text: string; values: unknown[] }>;
  /**
   * How long this file waited for exclusive use of the schema. Non-zero means a
   * sibling file was running; it is reported rather than hidden because a slow
   * `beforeAll` otherwise looks like a slow server.
   */
  gateWaitMs: number;
  /** Server version, for the record — the engine the migrations were checked on. */
  serverVersion: string;
  close: () => Promise<void>;
};

/**
 * A cross-process mutex for the schema.
 *
 * Every real-server file rebuilds `public` from the migrations, and vitest runs
 * files in parallel. Two processes resetting one schema means one of them is
 * `DROP SCHEMA ... CASCADE`-ing the catalog the other is reading, which surfaces
 * as `could not open file "base/24576/1259": Permission denied` — from a
 * statement that is itself correct. Nothing in that message points at the other
 * test file, so the natural response is to distrust the query rather than the
 * harness.
 *
 * Serializing the *whole file* is the only thing that helps: a reset between
 * another file's tests would wipe the fixtures it had just built. A
 * session-level advisory lock fits because it is held by the connection — a
 * crashed test process releases it with no cleanup, and there is no lockfile or
 * port to leave behind. The client is deliberately never returned to the pool,
 * so the lock lives exactly as long as the pool does.
 */
const SCHEMA_GATE_KEY = "qmdj-real-test-schema";

/**
 * The `application_name` this harness tags its connections with.
 *
 * Named once and used twice: the pool sets it, and the leftover sweep matches it
 * exactly. An exact match rather than a `LIKE 'qmdj-%'` because the sweep
 * terminates backends — a prefix would start killing application connections the
 * day someone renames the app's pool to `qmdj-app`. (It is `shengtian-banzi`
 * today, so a prefix would happen to be safe; "happens to be safe" is what stops
 * being true without anyone noticing.)
 */
const APPLICATION_NAME = "qmdj-real-test";

/**
 * Rebuild `public` from the real migration files.
 *
 * Dropping the schema rather than truncating tables means the suite is runnable
 * against any server without someone having migrated it by hand first, and it
 * cannot leave stale objects behind when a migration adds one.
 *
 * Each file carries its own `BEGIN;`/`COMMIT;`. `pool.query(text)` without
 * parameters uses the simple protocol, which permits the multiple statements a
 * migration file contains — the same property `ops/migrate.mjs` relies on.
 */
const resetSchema = async (pool: PgPool) => {
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
  await pool.query("CREATE SCHEMA public");
  for (const { sql } of await readMigrations()) await pool.query(sql);
};

export const installRealTestPool = async (url: string): Promise<RealTestPool> => {
  const { Pool } = require("pg") as { Pool: typeof import("pg").Pool };
  // One connection is spent on the schema gate and never returned, so the pool is
  // sized to leave the tests the same number of connections they would otherwise
  // have. A gate that quietly shrank the pool would turn a contention test into a
  // test that deadlocks waiting for a connection.
  const pool = new Pool({ connectionString: url, max: 12, application_name: APPLICATION_NAME });
  // An idle client can die at any moment; Node treats an unhandled 'error' on the
  // Pool as fatal and would take the test process with it.
  pool.on("error", () => {});
  const statements: Array<{ text: string; values: unknown[] }> = [];

  let gate: PoolClient;
  try {
    gate = await pool.connect();
  } catch (error) {
    await pool.end().catch(() => {});
    throw error;
  }

  try {
    // Taken before the first statement that touches the schema, so a second file
    // cannot be inside `resetSchema` while this one is running its tests.
    const gateStarted = Date.now();
    await gate.query(`SELECT pg_advisory_lock(hashtextextended($1, 0))`, [SCHEMA_GATE_KEY]);
    const gateWaitMs = Date.now() - gateStarted;

    // Holding the gate means no other run of this suite is live, so any backend
    // still carrying our `application_name` belongs to a process that died — a
    // crash, or a `timeout` that killed the runner. Such a backend can be
    // idle-in-transaction, and then the `DROP SCHEMA ... CASCADE` below waits on a
    // lock nobody will ever release, or fails opaquely. Evicting them is safe
    // precisely because the gate proves they are not in use, and it is the
    // difference between a crashed run costing nothing and costing a hand-run
    // `pg_terminate_backend` the next morning.
    //
    // The `NOT EXISTS` is the whole difficulty. "No other run is live" is not the
    // same as "no other connection exists": a sibling file that lost the race for
    // the gate is sitting in `pg_advisory_lock` with our `application_name` on its
    // only connection. Terminating it does not merely disconnect it — it fails the
    // lock acquisition, so the sibling's `beforeAll` throws and its entire file is
    // reported as skipped. Matching on `application_name` alone did exactly that
    // the first time this ran. A backend waiting on an ungranted advisory lock is
    // waiting for *this* gate, so it is spared by name.
    //
    // Run on the gate connection, not the pool: the gate holds the lock, and a
    // sweep that terminated the gate would release the very lock it depends on.
    await gate.query(
      `SELECT pg_terminate_backend(a.pid) FROM pg_stat_activity a
        WHERE a.datname=current_database() AND a.pid<>pg_backend_pid() AND a.application_name=$1
          AND NOT EXISTS (SELECT 1 FROM pg_locks l
                           WHERE l.pid=a.pid AND l.locktype='advisory' AND NOT l.granted)`,
      [APPLICATION_NAME],
    );

    const version = await pool.query<{ version: string }>("SELECT version() AS version");
    await resetSchema(pool);
    // Point the driver at the real server too, so a code path that escapes the
    // global pool slot still reaches the engine under test rather than failing
    // on a deliberately invalid URL and looking like a bug.
    process.env.DATABASE_URL = url;
    // Install a recording wrapper rather than the pool itself. The wrapper only
    // implements the surface `pool.ts` uses — `query` and `connect` — and both
    // hand the work to the real pool, so every `connect()` still returns a
    // distinct connection and `FOR UPDATE` still contends. Recording lets a test
    // EXPLAIN the statement a repository function actually issued instead of a
    // copy of it kept in the test file, which is the difference between checking
    // the real query and checking a transcription of it.
    const installed = {
      query: async (text: string, values: unknown[] = []) => {
        statements.push({ text, values });
        return pool.query(text, values as never[]);
      },
      connect: async () => {
        const client = await pool.connect();
        return {
          query: async (text: string, values: unknown[] = []) => {
            statements.push({ text, values });
            return client.query(text, values as never[]);
          },
          release: (destroy?: boolean) => client.release(destroy),
        };
      },
      end: async () => { await pool.end(); },
    };
    (globalThis as { qmdjPool?: unknown }).qmdjPool = installed;
    return {
      pool,
      statements,
      gateWaitMs,
      serverVersion: version.rows[0].version,
      close: async () => {
        uninstallTestPool();
        // Released before `end()`, and not after: the gate holds a checked-out
        // client, and `pool.end()` waits for every client to come back — ending
        // first would wait forever on the connection holding the gate.
        gate.release();
        await pool.end();
      },
    };
  } catch (error) {
    gate.release();
    await pool.end().catch(() => {});
    throw error;
  }
};

/**
 * The URL to test against, or `null` when no server is configured.
 *
 * Read through a function rather than a module constant because this module is
 * loaded by the vitest setup file, where `process.env` is populated afterwards.
 */
export const realTestDatabaseUrl = () => process.env.QMDJ_TEST_REAL_DATABASE_URL?.trim() || null;
