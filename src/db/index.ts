async function performRepair(p: Pool) {
  try {
    console.log("🛠️ AGREGANDO COLUMNAS FALTANTES (INCLUYENDO STATUS EN RQ)...");
    
    const queries = [
      "CREATE TABLE IF NOT EXISTS sync_logs (id SERIAL PRIMARY KEY);",
      "CREATE TABLE IF NOT EXISTS retry_queue (id SERIAL PRIMARY KEY);",
      // Columnas para sync_logs
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS status TEXT;",
      "ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;",
      // Columnas para retry_queue (AQUÍ ESTÁ EL TRUCO)
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS status TEXT;", 
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS sync_log_id INTEGER;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS payload JSONB;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;",
      "ALTER TABLE retry_queue ADD COLUMN IF NOT EXISTS next_retry TIMESTAMP;"
    ];

    for (const q of queries) {
      await p.query(q);
    }

    console.log("✅ BASE DE DATOS REPARADA TOTALMENTE.");
    dbReady = true;
  } catch (err) {
    console.error("❌ ERROR EN REPARACIÓN:", err);
    dbReady = true; 
  }
}
