import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * `src/server.ts` enruta hacia Next SOLO `/api/session` y `/api/admin-web`:
 *
 *     mountAdminWeb("/api/session", adminWebHandle);
 *     mountAdminWeb("/api/admin-web", adminWebHandle);
 *     app.use("/api", router);          // <- todo lo demás
 *
 * Es decir: un `route.ts` creado en `apps/admin-web/app/api/sa/...` NUNCA se
 * alcanza; lo atiende el router de Express y responde 404. Así nacieron unos
 * interruptores de Super Admin que no hacían nada al pulsarlos.
 *
 * Esta prueba comprueba que todo lo que el navegador pide bajo `/api/sa/` está
 * registrado en el router de Express.
 */
const RAIZ = path.resolve(__dirname, "..", "..");
const CLIENTE = fs.readFileSync(path.join(RAIZ, "apps/admin-web/lib/api.ts"), "utf8");
const RUTAS = fs.readFileSync(path.join(RAIZ, "src/api/routes.ts"), "utf8");
const SERVER = fs.readFileSync(path.join(RAIZ, "src/server.ts"), "utf8");

describe("las rutas /api/sa que llama la UI existen en Express", () => {
  it("server.ts sigue enrutando a Next sólo esos dos prefijos", () => {
    // Si algún día se monta "/api/sa" hacia Next, esta prueba debe revisarse:
    // cambiaría dónde hay que declarar los endpoints.
    const montados = [...SERVER.matchAll(/mountAdminWeb\("([^"]+)"/g)].map((m) => m[1]);
    expect(montados.sort()).toEqual(["/api/admin-web", "/api/session"]);
  });

  it("cada /api/sa/... que pide el cliente está en el router de Express", () => {
    const pedidas = [...new Set([...CLIENTE.matchAll(/["'`](\/api\/sa\/[a-z0-9/_-]+)["'`]/g)].map((m) => m[1]))];
    expect(pedidas.length, "el cliente debería pedir alguna ruta /api/sa").toBeGreaterThan(0);
    for (const ruta of pedidas) {
      const enExpress = ruta.replace(/^\/api/, "");
      expect(RUTAS, `${ruta} no está registrada en src/api/routes.ts: devolvería 404`).toContain(`"${enExpress}"`);
    }
  });

  it("los interruptores de trabajos están registrados y protegidos", () => {
    for (const ruta of ['"/sa/workers"', '"/sa/workers/toggle"']) {
      const linea = RUTAS.split("\n").find((l) => l.includes(ruta));
      expect(linea, `falta la ruta ${ruta}`).toBeTruthy();
      expect(linea, `${ruta} debe exigir super admin`).toContain("requireSuperAdmin");
    }
  });

  it("no quedan rutas de Next para /api/sa/workers que nunca se alcanzarían", () => {
    const muerta = path.join(RAIZ, "apps/admin-web/app/api/sa/workers");
    expect(fs.existsSync(muerta), "esas rutas responden 404: los endpoints van en Express").toBe(false);
  });
});
