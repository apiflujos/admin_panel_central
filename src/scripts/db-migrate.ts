import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { getPool } from "../db";

async function resolveMigrationsDir() {
  const explicit = process.env.MIGRATIONS_DIR ? process.env.MIGRATIONS_DIR.trim() : "";
  if (explicit) {
    return path.resolve(process.cwd(), explicit);
  }
  return path.resolve(process.cwd(), "src", "db", "migrations");
}

async function readMigrationFiles(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function ensureMigrationsTable(pool: ReturnType<typeof getPool>) {
  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    `
  );
}

async function getAppliedMigrations(pool: ReturnType<typeof getPool>) {
  const result = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations"
  );
  return new Set(result.rows.map((row) => row.filename));
}

async function applyMigration(pool: ReturnType<typeof getPool>, filename: string, sql: string) {
  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const migrationsDir = await resolveMigrationsDir();
  const files = await readMigrationFiles(migrationsDir);
  if (!files.length) {
    console.log("No migration files found.");
    return;
  }

  const pool = getPool();
  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);

  let appliedCount = 0;
  for (const filename of files) {
    if (applied.has(filename)) {
      continue;
    }
    const filePath = path.join(migrationsDir, filename);
    const sql = await fs.readFile(filePath, "utf-8");
    if (!sql.trim()) {
      continue;
    }
    console.log(`Applying ${filename}...`);
    await applyMigration(pool, filename, sql);
    appliedCount += 1;
  }

  if (!appliedCount) {
    console.log("Migrations already up to date.");
  } else {
    console.log(`Applied ${appliedCount} migration(s).`);
  }

  await pool.end();
}

main().catch((error) => {
  console.error("[db-migrate] failed:", error);
  process.exitCode = 1;
});
