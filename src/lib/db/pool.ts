import { createRequire } from "node:module";
import type { Pool as PgPool, PoolClient, QueryResultRow } from "pg";

const require = createRequire(import.meta.url);
const { Pool } = require("pg") as { Pool: typeof import("pg").Pool };

const globalForDatabase = globalThis as unknown as { qmdjPool?: PgPool };

const DEFAULT_POOL_MAX = 10;
// Bound every statement so one pathological query cannot hold a pooled
// connection — and therefore a slice of the connection budget — forever.
const DEFAULT_STATEMENT_TIMEOUT_MS = 30_000;

const readPositiveInt = (raw: string | undefined, fallback: number) => {
  const value = Number(raw?.trim());
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const createPool = () => {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("缺少产品数据库配置 DATABASE_URL。");
  const pool = new Pool({
    connectionString,
    max: readPositiveInt(process.env.DATABASE_POOL_MAX, DEFAULT_POOL_MAX),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: readPositiveInt(process.env.DATABASE_STATEMENT_TIMEOUT_MS, DEFAULT_STATEMENT_TIMEOUT_MS),
    ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined,
    application_name: "shengtian-banzi",
  });
  // An idle client can fail at any moment (server restart, network reset, admin
  // termination). pg reports that on the Pool, and Node treats an unhandled
  // 'error' event as fatal — without this listener the whole process dies and
  // takes every in-flight request with it.
  pool.on("error", (error) => {
    console.error("[db] idle client error", error);
  });
  return pool;
};

export const getDatabasePool = () => {
  if (!globalForDatabase.qmdjPool) globalForDatabase.qmdjPool = createPool();
  return globalForDatabase.qmdjPool;
};

export const query = <T extends QueryResultRow>(text: string, values: unknown[] = []) =>
  getDatabasePool().query<T>(text, values);

export const withTransaction = async <T>(callback: (client: PoolClient) => Promise<T>) => {
  const client = await getDatabasePool().connect();
  let poisoned = false;
  try {
    await client.query("BEGIN");
    const value = await callback(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    // The connection may already be broken, in which case ROLLBACK throws too.
    // Never let that replace the error the caller actually needs to see.
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      poisoned = true;
      console.error("[db] rollback failed; discarding client", rollbackError);
    }
    throw error;
  } finally {
    // Passing a truthy flag makes pg destroy the client instead of returning a
    // connection with unknown transaction state to the pool.
    client.release(poisoned);
  }
};
