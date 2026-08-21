import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * `listProducts` alimenta la pantalla de Productos Y el panel de Inicio
 * (`listProducts({ limit: 3 })`). Llevaba un subselect CORRELACIONADO para
 * calcular en qué tiendas está publicado cada producto, evaluado una vez por
 * cada fila del catálogo —6.823 veces— antes de aplicar el LIMIT.
 *
 * Medido contra la base de producción:
 *   con el subselect correlacionado ... 10.664 ms
 *   sin él ..........................       10 ms
 *
 * Era la causa de que abrir Inicio o Productos tardara diez segundos. Las
 * tiendas se resuelven ahora en una segunda consulta, sólo para las filas de
 * la página (medida: 5 ms), y se comprobó que devuelve exactamente lo mismo.
 */
const FUENTE = fs.readFileSync(path.join(__dirname, "products.service.ts"), "utf8");

function cuerpoDeListProducts() {
  const inicio = FUENTE.indexOf("export async function listProducts(");
  expect(inicio, "no se encontró listProducts").toBeGreaterThan(-1);
  const siguiente = FUENTE.indexOf("\nexport ", inicio + 1);
  return FUENTE.slice(inicio, siguiente === -1 ? undefined : siguiente);
}

describe("listProducts no debe volver a ser cuadrático", () => {
  const cuerpo = cuerpoDeListProducts();

  it("no correlaciona el cálculo de tiendas con cada fila del catálogo", () => {
    // La firma del fallo: un subselect que compara p2 contra `products` de la
    // consulta exterior. Eso lo vuelve a ejecutar por cada fila.
    expect(cuerpo).not.toMatch(/p2\.organization_id\s*=\s*products\.organization_id/);
    expect(cuerpo).not.toMatch(/=\s*COALESCE\(products\.alegra_item_id/);
  });

  it("resuelve las tiendas acotando por las claves de la página", () => {
    expect(cuerpo).toContain("= ANY($2::text[])");
    expect(cuerpo).toContain("clave_producto");
  });

  it("sigue devolviendo `stores` en cada fila: la UI las pinta", () => {
    // Si esto desaparece, las etiquetas Becam/Belia dejan de verse.
    expect(cuerpo).toMatch(/copia\.stores\s*=/);
    expect(cuerpo).toContain("storesPorClave.get(clave)");
  });

  it("la clave interna NO se filtra al cliente", () => {
    // `clave_producto` es un detalle de implementación; se borra antes de salir.
    expect(cuerpo).toContain("delete copia.clave_producto");
  });

  it("la consulta de tiendas está acotada por organización", () => {
    expect(cuerpo).toContain("p2.organization_id = $1");
  });
});

describe("migración de índices de rendimiento", () => {
  const SQL = fs.readFileSync(path.resolve(__dirname, "../db/migrations/020_indices_rendimiento.sql"), "utf8");

  it("añade el índice que faltaba para ordenar registros por fecha", () => {
    expect(SQL).toContain("sync_logs_org_created_idx");
    expect(SQL).toMatch(/ON sync_logs \(organization_id, created_at DESC\)/);
  });

  it("es idempotente: se puede reaplicar sin romper", () => {
    expect(SQL).toContain("CREATE INDEX IF NOT EXISTS");
    expect(SQL).toContain("DROP INDEX IF EXISTS");
  });
});
