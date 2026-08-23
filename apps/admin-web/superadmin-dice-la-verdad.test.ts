import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Super Admin mostraba cuatro indicadores que contaban PLANTILLAS del sistema,
 * no cosas del cliente:
 *
 *   "Planes 3"    -> 3 plantillas de plan definidas, no que el cliente tenga plan
 *   "Servicios 5" -> en realidad `sa.limit_definitions`: son LÍMITES, mal etiquetado
 *
 * En una instalación de un solo cliente eso no informa de nada y confunde.
 */
const RAIZ = path.resolve(__dirname);
const PAGINA = fs.readFileSync(path.join(RAIZ, "components/superadmin-page.tsx"), "utf8");

describe("Super Admin no promete lo que no tiene", () => {
  it("ya no llama 'Servicios' a lo que son límites", () => {
    expect(PAGINA).not.toContain(">Servicios<");
  });

  it("cuando enseña las plantillas de plan, aclara que no son del cliente", () => {
    expect(PAGINA).toContain("Plantillas de plan definidas");
    expect(PAGINA).toContain("No significa que este cliente tenga un plan asignado");
  });

  it("dice cuántos pueden cambiarlo todo, y lo que eso implica", () => {
    expect(PAGINA).toContain("Con acceso de Super Admin");
    expect(PAGINA).toContain("trabajos automáticos");
  });

  it("la consola de base de datos se presenta como herramienta de soporte", () => {
    expect(PAGINA).toContain("Consulta directa a la base de datos");
    expect(PAGINA).toContain("Úsala sólo para leer");
  });

  it("cada dato viene con su explicación, no un número suelto", () => {
    const bloque = PAGINA.slice(PAGINA.indexOf('className="sa-instalacion"'), PAGINA.indexOf("page-module-shell"));
    const etiquetas = (bloque.match(/sa-dato-label/g) || []).length;
    const explicaciones = (bloque.match(/<span>/g) || []).length;
    expect(etiquetas).toBeGreaterThan(0);
    expect(explicaciones, "cada dato debe traer su explicación").toBe(etiquetas);
  });
});
