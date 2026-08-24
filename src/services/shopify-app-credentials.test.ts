import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("../db", () => ({
  getOrgId: () => 1,
  getPool: () => ({ query: queryMock }),
  runWithOrg: vi.fn(),
}));

vi.mock("../utils/crypto", () => ({
  decryptString: (value: string) => value,
  encryptString: (value: string) => value,
}));

vi.mock("../utils/webhook", () => ({
  verifyShopifyHmacWithSecret: vi.fn(),
}));

vi.mock("./organizations.service", () => ({
  resolveOrgIdByShopDomain: vi.fn(),
}));

vi.mock("./store-connections.service", () => ({
  getStoreIdByShopDomain: vi.fn(),
}));

import { resolveShopifyOAuthConfig } from "./shopify-app-credentials.service";

const credentialsRow = (apiKey: string, apiSecret: string, scopes = "read_orders") => ({
  data_encrypted: JSON.stringify({ apiKey, apiSecret, scopes }),
});

describe("credenciales Shopify: base de datos como única fuente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignora credenciales del entorno cuando la base de datos no tiene ninguna", async () => {
    vi.stubEnv("SHOPIFY_API_KEY", "no-usar-esta-key");
    vi.stubEnv("SHOPIFY_API_SECRET", "no-usar-este-secret");
    vi.stubEnv("SHOPIFY_SCOPES", "write_everything");
    queryMock.mockResolvedValue({ rows: [] });

    await expect(resolveShopifyOAuthConfig(2)).resolves.toEqual({
      apiKey: "",
      apiSecret: "",
      scopes: "",
    });

    vi.unstubAllEnvs();
  });

  it("prefiere la cuenta de la tienda y completa campos ausentes con la global", async () => {
    queryMock.mockImplementation(async (_sql: string, params: unknown[]) => {
      const provider = params[1];
      if (provider === "shopify_oauth_app:store:2") {
        return { rows: [credentialsRow("tienda-key", "tienda-secret", "")] };
      }
      if (provider === "shopify_oauth_app") {
        return { rows: [credentialsRow("global-key", "global-secret", "read_orders,read_products")] };
      }
      return { rows: [] };
    });

    await expect(resolveShopifyOAuthConfig(2)).resolves.toEqual({
      apiKey: "tienda-key",
      apiSecret: "tienda-secret",
      scopes: "read_orders,read_products",
    });
  });
});

const ROOT = path.resolve(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("ninguna capa vuelve a exigir secretos Shopify en ENV", () => {
  const oauthRoutes = [
    "apps/admin-web/app/api/auth/shopify/route.ts",
    "apps/admin-web/app/api/auth/shopify/callback/route.ts",
    "apps/admin-web/app/api/auth/shopify/status/route.ts",
  ];

  it.each(oauthRoutes)("%s resuelve OAuth desde la base de datos", (route) => {
    const source = read(route);
    expect(source).toContain("resolveShopifyOAuthConfig");
    expect(source).not.toMatch(/process\.env\.SHOPIFY_(?:API_KEY|API_SECRET|SCOPES|WEBHOOK_SECRET)/);
  });

  it.each([".env.example", ".env.becam.example", "render.yaml"])("%s no declara secretos Shopify", (file) => {
    expect(read(file)).not.toMatch(
      /^\s*(?:-\s+key:\s*)?(?:SHOPIFY_(?:API_KEY|API_SECRET|SCOPES|WEBHOOK_SECRET)|ALLOW_UNVERIFIED_SHOPIFY_WEBHOOKS)\s*[=:]/m
    );
  });

  it("el despliegue elimina variables antiguas en vez de pedirlas", () => {
    const deploy = read("scripts/deploy-becam.sh");
    expect(deploy).not.toContain("Faltan variables de Shopify");
    expect(deploy).toContain("SHOPIFY_API_SECRET");
    expect(deploy).toContain("Variables Shopify obsoletas retiradas");
  });
});
