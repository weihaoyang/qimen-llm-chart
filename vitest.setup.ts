/**
 * Give the whole suite a real Postgres.
 *
 * Four test files declare their contracts behind
 * `QMDJ_RUN_DB_TESTS=1 && QMDJ_INTEGRATION_DATABASE_URL`, so they were skipped
 * unless someone pointed them at a running server. Setting both variables here
 * turns them on, and the pool they reach is PGlite — Postgres in WASM, with the
 * real migrations applied — so the contracts are checked on every run.
 *
 * The variables are read at module scope by those files, which is why this has to
 * happen in a setup file rather than in a `beforeAll`.
 *
 * Everything else in the suite mocks `@/lib/db/pool` outright, so installing a
 * pool underneath it is inert: nothing that already passes queries the real one.
 * `installLazyTestPool` defers building the database until a query arrives, so
 * files that never touch it pay nothing.
 */
import { installLazyTestPool } from "./src/lib/db/testing/pglite-harness";

process.env.QMDJ_RUN_DB_TESTS = "1";
process.env.QMDJ_INTEGRATION_DATABASE_URL = "postgres://pglite.invalid/integration";

installLazyTestPool();
