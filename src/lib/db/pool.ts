import { Pool, type PoolClient, type QueryResultRow } from "pg";

const globalForDatabase = globalThis as unknown as { qmdjPool?: Pool };

const createPool = () => {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("缺少产品数据库配置 DATABASE_URL。");
  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined,
    application_name: "shengtian-banzi",
  });
};

export const getDatabasePool = () => {
  if (!globalForDatabase.qmdjPool) globalForDatabase.qmdjPool = createPool();
  return globalForDatabase.qmdjPool;
};

export const query = <T extends QueryResultRow>(text: string, values: unknown[] = []) =>
  getDatabasePool().query<T>(text, values);

export const withTransaction = async <T>(callback: (client: PoolClient) => Promise<T>) => {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const value = await callback(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
