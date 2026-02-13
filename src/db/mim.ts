import { Pool } from "pg";

let mimPool: Pool | null = null;

export function getMimPool() {
  if (!mimPool) {
    const connectionString = String(process.env.MIM_DATABASE_URL || "").trim();
    if (!connectionString) {
      throw new Error("MIM_DATABASE_URL is required");
    }
    const ssl =
      process.env.MIM_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
    mimPool = new Pool({
      connectionString,
      ssl,
      options: "-c search_path=public",
    });
  }
  return mimPool;
}
