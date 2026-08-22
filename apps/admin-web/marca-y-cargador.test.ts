import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname);
const leer = (p: string) => fs.readFileSync(path.join(RAIZ, p), "utf8");

const CSS = leer("styles/components.css");
const SHELL = leer("components/app-shell.tsx");
const LOGIN = leer("components/login-page.tsx");
const ESQUELETO = leer("components/ui/page-content-skeleton.tsx");
const LOADER = leer("components/ui/apiflujos-loader.tsx");

describe("marca en SVG", () => {
  it("el isotipo existe y es vectorial", () => {
    const svg = leer("public/assets/isotipo.svg");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 100 100"');
    expect(svg).toContain("#8A40B9"); // morado de marca, extraído del logo original
  });

  it("pesa mucho menos que el PNG que sustituye", () => {
    const svg = fs.statSync(path.join(RAIZ, "public/assets/isotipo.svg")).size;
    const png = fs.statSync(path.join(RAIZ, "public/assets/logo.png")).size;
    expect(svg).toBeLessThan(png / 4);
  });

  it("el favicon que declara el layout EXISTE", () => {
    // Estaba declarado y no existía: cada carga pedía un 404.
    const layout = leer("app/layout.tsx");
    for (const archivo of ["icon.svg", "favicon.png", "apple-touch-icon.png"]) {
      expect(layout, archivo).toContain(archivo);
      expect(fs.existsSync(path.join(RAIZ, "public", archivo)), archivo).toBe(true);
    }
  });

  it("la palabra ya no se pinta dos veces", () => {
    // El PNG anterior YA incluía "ApiFlujos" y al lado se repetía en texto.
    expect(SHELL).not.toContain("/assets/logo.png");
    expect(LOGIN).not.toContain("/assets/logo.png");
    expect(SHELL).toContain("<BrandLogo");
  });
});

describe("cargador oficial", () => {
  it("gira y respira: dos animaciones distintas", () => {
    expect(CSS).toContain("@keyframes af-spin");
    expect(CSS).toContain("@keyframes af-breathe");
    expect(CSS).toMatch(/\.af-loader\s*\{[^}]*animation:\s*af-spin/s);
    expect(CSS).toMatch(/\.af-loader\s*>\s*img\s*\{[^}]*animation:\s*af-breathe/s);
  });

  it("respeta a quien pide menos movimiento", () => {
    // Girar y desenfocar puede marear. Con reduced-motion se queda en un
    // latido de opacidad.
    const bloque = CSS.slice(CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(bloque).toContain(".af-loader { animation: none; }");
    expect(bloque).toContain("af-fade");
  });

  it("ofrece los cinco tamaños que declara el componente", () => {
    for (const t of ["is-xs", "is-sm", "is-md", "is-lg", "is-xl"]) {
      expect(CSS, t).toContain(`.af-loader.${t}`);
      expect(LOADER, t).toContain(t);
    }
  });

  it("se anuncia a lectores de pantalla, y calla si algo al lado ya lo hace", () => {
    expect(LOADER).toContain('role={label ? "status" : undefined}');
    expect(LOADER).toContain('aria-live={label ? "polite" : undefined}');
  });

  it("el esqueleto de carga encabeza con el logo animado", () => {
    // Antes eran sólo bloques grises: parecía que el navegador se había colgado.
    expect(ESQUELETO).toContain("<ApiFlujosLoader");
    expect(ESQUELETO).toContain("aria-busy");
  });

  it("entrar bloquea la pantalla mientras verifica", () => {
    expect(LOGIN).toContain("<ApiFlujosBlockingLoader");
    expect(LOGIN).toMatch(/loading \? \(\s*<ApiFlujosBlockingLoader/s);
    expect(CSS).toContain(".af-blocking");
  });
});
