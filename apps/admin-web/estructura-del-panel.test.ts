import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * El marco de la aplicación (menú + cabecera) debe montarse UNA vez, en el
 * layout del grupo `(panel)`, nunca dentro de una página.
 *
 * Cuando cada página montaba su propio `AppShell`, al navegar Next desmontaba
 * el menú y la cabecera y pintaba un esqueleto sin ellos: la interfaz entera
 * parpadeaba en cada clic y daba sensación de recarga completa.
 *
 * `(panel)` es un GRUPO DE RUTAS: los paréntesis no salen en la URL.
 */
const APP = path.resolve(__dirname, "app");
const PANEL = path.join(APP, "(panel)");

function paginasDelPanel(dir = PANEL): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return paginasDelPanel(full);
    return e.name === "page.tsx" ? [full] : [];
  });
}

describe("estructura del panel", () => {
  const paginas = paginasDelPanel();

  it("hay páginas dentro del grupo (panel)", () => {
    expect(paginas.length).toBeGreaterThanOrEqual(15);
  });

  it("el layout del panel monta el shell y resuelve la sesión", () => {
    const layout = fs.readFileSync(path.join(PANEL, "layout.tsx"), "utf8");
    expect(layout).toContain("<AppShell");
    expect(layout).toContain("requireServerSessionProfile");
  });

  it("NINGUNA página monta su propio AppShell", () => {
    const culpables = paginas.filter((p) => fs.readFileSync(p, "utf8").includes("<AppShell"));
    expect(culpables.map((p) => path.relative(APP, p))).toEqual([]);
  });

  it("el shell ya no recibe la ruta activa por props", () => {
    // Si volviera `activeHref`, el shell tendría que vivir dentro de la página.
    const shell = fs.readFileSync(path.resolve(__dirname, "components/app-shell.tsx"), "utf8");
    expect(shell).not.toContain("activeHref");
    expect(shell).toContain("AppShellNav");
    expect(shell).toContain("AppShellTitle");
  });

  it("las pantallas que autorizan por rol siguen pidiendo la sesión", () => {
    // El layout resuelve la sesión para el shell, pero estas tres DECIDEN con
    // ella: si se les quita, cualquier usuario entraría.
    for (const ruta of ["ai-assistants", "company", "users"]) {
      const fuente = fs.readFileSync(path.join(PANEL, ruta, "page.tsx"), "utf8");
      expect(fuente, ruta).toContain("requireServerSessionProfile()");
      expect(fuente, ruta).toMatch(/session\.role !== "admin"/);
      expect(fuente, ruta).toContain('redirect("/")');
    }
  });

  it("el login queda FUERA del panel: no debe llevar shell", () => {
    expect(fs.existsSync(path.join(APP, "auth/login/page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(PANEL, "auth"))).toBe(false);
    const login = fs.readFileSync(path.join(APP, "auth/login/page.tsx"), "utf8");
    expect(login).not.toContain("<AppShell");
  });
});
