import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Un archivo estático NUNCA debe exigir sesión.
 *
 * El `matcher` del middleware protegía todo salvo unas pocas rutas, y `assets/`
 * no estaba en la lista. Desde la pantalla de login —donde todavía no hay
 * cookie— el navegador pedía el logo y recibía un **307 al propio login**:
 * en el login no se veía ni el logo ni la mascota.
 *
 * Los PNG viejos se salvaban de casualidad porque los servía Express desde la
 * carpeta `public/` de la raíz, antes de llegar a Next.
 */
const RAIZ = path.resolve(__dirname);
const FUENTE = fs.readFileSync(path.join(RAIZ, "middleware.ts"), "utf8");

function patronDelMatcher() {
  const m = FUENTE.match(/"(\/\(\(\?![^"]+)"/);
  expect(m, "no se encontró el matcher").toBeTruthy();
  // Se interpreta el literal como lo hace JavaScript (\\. -> \.)
  return JSON.parse(`"${m![1]}"`) as string;
}

describe("el middleware no bloquea archivos estáticos", () => {
  const re = new RegExp(`^${patronDelMatcher()}$`);

  it.each([
    "/assets/logo.svg",
    "/assets/isotipo.svg",
    "/assets/avatar.webp",
    "/icon.svg",
    "/favicon.png",
    "/apple-touch-icon.png",
  ])("%s se sirve SIN sesión", (ruta) => {
    expect(re.test(ruta), `${ruta} exige sesión: en el login daría 307`).toBe(false);
  });

  it.each(["/auth/login", "/api/session/login", "/_next/static/chunk.js"])("%s sigue fuera del middleware", (ruta) => {
    expect(re.test(ruta)).toBe(false);
  });

  it.each(["/", "/orders", "/superadmin/workers", "/settings/stores", "/invoices"])("%s SÍ sigue protegido", (ruta) => {
    // Lo importante es no haber abierto de más al arreglar lo anterior.
    expect(re.test(ruta), `${ruta} quedó SIN protección`).toBe(true);
  });
});

describe("los activos de marca están donde Express los sirve", () => {
  // Express sirve `public/` de la RAÍZ y va ANTES que Next. Tener ahí los
  // archivos los deja fuera del alcance del middleware pase lo que pase.
  const RAIZ_REPO = path.resolve(__dirname, "..", "..");

  it.each(["assets/logo.svg", "assets/isotipo.svg", "assets/avatar.webp", "icon.svg", "favicon.png"])(
    "%s existe en la carpeta public de la raíz",
    (archivo) => {
      expect(fs.existsSync(path.join(RAIZ_REPO, "public", archivo)), archivo).toBe(true);
    }
  );

  it("el logo servido es el OFICIAL", () => {
    const svg = fs.readFileSync(path.join(RAIZ_REPO, "public/assets/logo.svg"), "utf8");
    expect(svg).toContain('viewBox="0 0 400 112.31"');
    expect(svg).toContain("#7e43b9");
  });
});
