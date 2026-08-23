import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // `packages/**` estaba fuera del include: 10 archivos con 49 tests no se
    // ejecutaban NUNCA, incluidos los del dominio de inventario y precios, que
    // es justo la lógica más delicada de este proyecto.
    include: [
      "src/**/*.test.ts",
      // `.test.ts` de admin-web también: las pruebas de ESTRUCTURA de rutas no
      // son componentes y quedaban fuera del include.
      "apps/admin-web/**/*.test.ts",
      "apps/admin-web/**/*.test.tsx",
      "packages/**/*.test.ts",
      // Y `apps/workers/**`, que también estaba fuera: es donde viven los
      // pollers y la retención, o sea el código que corre solo y sin nadie
      // mirando. Una prueba puesta ahí se ignoraba en silencio.
      "apps/workers/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
