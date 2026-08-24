import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      ...eslintConfigPrettier.rules,
    },
  },
  {
    ignores: [
      "dist/",
      "dist.build.*/",
      "**/node_modules/",
      "**/.next/",
      "**/.next.build.*/",
      ".playwright-cli/",
      "ecosystem.config.js",
      "apps/admin-web/next-env.d.ts",
      "public/",
      "scripts/",
    ],
  }
);
