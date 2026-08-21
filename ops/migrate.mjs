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
    for (const file of files) {
      const sql = await readFile(join(migrationsDir, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const previous = applied.get(file);
      if (previous && previous !== checksum) throw new Error(`Applied migration changed: ${file}`);
      if (previous) continue;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)", [file, checksum]);
        await client.query("COMMIT");
        console.log(`applied\t${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
    }
  } else throw new Error("Usage: node ops/migrate.mjs status|apply");
} finally { await pool.end(); }
