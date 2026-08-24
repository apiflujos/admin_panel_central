import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..");
const deploy = fs.readFileSync(path.join(ROOT, "scripts/deploy-becam.sh"), "utf8");
const nextConfig = fs.readFileSync(path.join(ROOT, "apps/admin-web/next.config.ts"), "utf8");

describe("el deploy de Becam no rompe el sitio activo si se interrumpe", () => {
  it("instala las dependencias en staging antes de intercambiarlas", () => {
    expect(deploy).toContain(".deploy-root-deps.XXXXXX");
    expect(deploy).toContain(".deploy-admin-deps.XXXXXX");
    expect(deploy).toContain("atomic_replace_dir node_modules");
    expect(deploy).toContain("atomic_replace_dir apps/admin-web/node_modules");
    expect(deploy).toContain('rm -rf -- "$root_deps_stage" "$admin_deps_stage"');
    expect(deploy).not.toContain('rmdir "$root_deps_stage" "$admin_deps_stage"');
  });

  it("construye backend y frontend fuera de los directorios activos", () => {
    expect(deploy).toContain('backend_build_stage="dist.build.$$"');
    expect(deploy).toContain('NEXT_DIST_DIR=".next.build.$$"');
    expect(nextConfig).toContain('distDir: process.env.NEXT_DIST_DIR || ".next"');
  });

  it("restaura los archivos que Next reescribe al usar un distDir temporal", () => {
    expect(deploy).toContain("restore_next_config_files");
    expect(deploy).toContain(".deploy-next-env.$$");
    expect(deploy).toContain(".deploy-tsconfig.$$");
  });

  it("limpia staging al recibir Ctrl+C sin tocar la versión activa", () => {
    expect(deploy).toContain("trap interrupted_deploy INT TERM");
    expect(deploy).toContain("sin alterar las dependencias ni builds activos");
  });

  it.each(["/settings/connections", "/orders", "/products", "/contacts"])(
    "el smoke comprueba la página real %s",
    (route) => {
      expect(deploy).toContain(route);
    }
  );
});
