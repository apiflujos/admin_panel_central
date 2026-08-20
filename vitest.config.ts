import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // `packages/**` estaba fuera del include: 10 archivos con 49 tests no se
    // ejecutaban NUNCA, incluidos los del dominio de inventario y precios, que
    // es justo la lógica más delicada de este proyecto.
    include: ["src/**/*.test.ts", "apps/admin-web/**/*.test.tsx", "packages/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
