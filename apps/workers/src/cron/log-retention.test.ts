import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

/**
 * La retención llevaba UN MES fallando en cada pasada sin que nadie lo notara:
 * `retry_queue` apunta a `sync_logs` con clave foránea, el DELETE chocaba
 * contra ella y el `catch` se comía el error. Resultado: 188 MB y 52.312 filas
 * que debían haberse podado.
 *
 * Estas pruebas fijan las dos mitades del arreglo, y sobre todo el límite que
 * no se puede cruzar: un reintento pendiente NUNCA se borra.
 */
describe("retención de registros", () => {
  const leer = () => readFile(new URL("./log-retention.ts", import.meta.url), "utf8");

  it("no borra un registro que aún sostiene un reintento", async () => {
    const fuente = await leer();
    expect(fuente).toContain("NOT EXISTS (SELECT 1 FROM retry_queue rq WHERE rq.sync_log_id = sync_logs.id)");
  });

  it("las TRES reglas de sync_logs llevan la protección", async () => {
    const fuente = await leer();
    // Basta que una se olvide para que esa regla vuelva a fallar entera.
    const reglasSyncLogs = fuente.split("\n").filter((l) => l.includes('table: "sync_logs"')).length;
    const protegidas = fuente.split("\n").filter((l) => l.includes("protegido: REINTENTO_VIVO")).length;
    expect(reglasSyncLogs).toBe(3);
    expect(protegidas).toBe(3);
  });

  it("sólo libera reintentos TERMINADOS, nunca los vivos", async () => {
    const fuente = await leer();
    expect(fuente).toContain("status IN ('done', 'failed', 'skipped')");
    // Un pendiente o en curso es trabajo por hacer: borrarlo pierde un pedido.
    expect(fuente).not.toContain("status IN ('pending'");
    expect(fuente).not.toContain("'processing'");
  });

  it("libera los reintentos ANTES de podar, o el borrado vuelve a chocar", async () => {
    const fuente = await leer();
    const liberar = fuente.indexOf("await soltarReintentosTerminados(");
    const podar = fuente.indexOf("await purge(table,");
    expect(liberar).toBeGreaterThan(-1);
    expect(podar).toBeGreaterThan(liberar);
  });
});
