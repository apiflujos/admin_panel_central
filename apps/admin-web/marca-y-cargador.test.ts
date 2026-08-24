import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname);
const leer = (p: string) => fs.readFileSync(path.join(RAIZ, p), "utf8");

const CSS = leer("styles/components.css");
const SHELL = leer("components/app-shell.tsx");
const LOGIN = leer("components/login-page.tsx");
const LOADER = leer("components/ui/apiflujos-loader.tsx");
const MARCA = leer("components/ui/brand-logo.tsx");

describe("la marca es la OFICIAL, no una reconstrucción", () => {
  it("el logo completo viene del SVG oficial de apiflujos.com", () => {
    const svg = leer("public/assets/logo.svg");
    // Firma del archivo oficial: viewBox y morado de marca.
    expect(svg).toContain('viewBox="0 0 400 112.31"');
    expect(svg).toContain("#7e43b9");
  });

  it("el isotipo es el MISMO archivo recortado por viewBox", () => {
    // Un solo activo: las dos versiones no se pueden desincronizar.
    const iso = leer("public/assets/isotipo.svg");
    expect(iso).toContain('viewBox="0 0 113 112.31"');
    expect(iso).toContain("#7e43b9");
  });

  it("el login muestra el logo completo de ApiFlujos", () => {
    // Sin depender del formato: prettier parte el JSX en varias líneas.
    expect(LOGIN).toMatch(/<BrandLogo[\s\S]{0,120}?variant="full"/);
    expect(LOGIN).not.toContain("/assets/logo.png");
  });

  it("la palabra no se repite: cabecera con isotipo, lateral con logo completo", () => {
    expect(SHELL).toMatch(/<BrandLogo[\s\S]{0,120}?variant="full"/);
    expect(SHELL).toMatch(/<BrandLogo[\s\S]{0,120}?variant="mark"/);
  });

  it("los iconos declarados existen de verdad", () => {
    const layout = leer("app/layout.tsx");
    for (const archivo of ["icon.svg", "favicon.png", "apple-touch-icon.png"]) {
      expect(layout, archivo).toContain(archivo);
      expect(fs.existsSync(path.join(RAIZ, "public", archivo)), archivo).toBe(true);
    }
  });

  it("BrandLogo respeta las proporciones del archivo oficial", () => {
    expect(MARCA).toContain("400 / 112.31");
    expect(MARCA).toContain("113 / 112.31");
  });
});

describe("el cargador se ve, y se ve como un modal", () => {
  it("al cambiar de sección sale el modal, no un esqueleto", () => {
    const loading = leer("app/(panel)/loading.tsx");
    expect(loading).toContain("<ApiFlujosBlockingLoader");
    expect(loading).not.toContain("Skeleton");
  });

  it("el modal OSCURECE y DESENFOCA lo de detrás", () => {
    const bloque = CSS.slice(CSS.indexOf(".af-blocking {"), CSS.indexOf(".af-blocking-panel"));
    expect(bloque).toContain("position: fixed");
    expect(bloque).toContain("inset: 0");
    expect(bloque).toMatch(/background:\s*rgba\(/);
    expect(bloque).toContain("backdrop-filter");
    expect(bloque).toMatch(/z-index:\s*\d{4}/);
  });

  it("bloquea la interacción: es un diálogo modal", () => {
    expect(LOADER).toContain('role="alertdialog"');
    expect(LOADER).toContain('aria-modal="true"');
  });

  it("tras ENTRAR hay pantalla de arranque: ese momento ya no queda en blanco", () => {
    // No existía `app/loading.tsx`: al moverlo dentro de (panel), el arranque
    // posterior al login se quedaba sin nada que mostrar.
    expect(fs.existsSync(path.join(RAIZ, "app/loading.tsx"))).toBe(true);
    const boot = leer("app/loading.tsx");
    expect(boot).toContain("<ApiFlujosLoader");
    expect(CSS).toContain(".af-boot");
  });

  it("entrar bloquea la pantalla mientras verifica", () => {
    expect(LOGIN).toContain("<ApiFlujosBlockingLoader");
  });

  it("gira y respira, y se calma si se pide menos movimiento", () => {
    expect(CSS).toContain("@keyframes af-spin");
    expect(CSS).toContain("@keyframes af-breathe");
    const reduce = CSS.slice(CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduce).toMatch(/\.af-loader\s*{\s*animation:\s*none;\s*}/);
  });
});
