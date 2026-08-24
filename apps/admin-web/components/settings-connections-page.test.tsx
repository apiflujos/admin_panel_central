import { describe, expect, it } from "vitest";

describe("connections modal state contract", () => {
  it("uses one discriminated modal state instead of parallel open flags", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./settings-connections-page.tsx", import.meta.url), "utf8")
    );

    // Se compara con los ESPACIOS NORMALIZADOS: la asercion original exigia la
    // declaracion en una sola linea y el formateador la partio en varias, asi
    // que fallaba pese a estar el contrato cumplido.
    const plano = source.replace(/\s+/g, " ");
    expect(plano).toContain('type ConnectionModalState = | { kind: "closed" }');
    expect(source).toContain("const [modal, setModal] = useState<ConnectionModalState>");
    expect(source).not.toContain("isConnectionFlowOpen");
    expect(source).not.toContain("isCreateStoreOpen");
    expect(source).toContain('modal.kind === "connection"');
    expect(source).toContain('modal.kind === "create-store"');
  });

  it("refreshes connection state and closes only after providers report connected", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./settings-connections-page.tsx", import.meta.url), "utf8")
    );

    expect(source.match(/const next = await refreshWorkspace\(\);/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('providers.shopify?.status !== "connected"');
    expect(source).toContain('providers.woocommerce?.status !== "connected"');
    expect(source).toContain('providers.alegra?.status !== "connected"');
    expect(source.match(/closeConnectionFlow\(\);/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("separa el diagnóstico, las conexiones, las reglas y los trabajos", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./settings-connections-page.tsx", import.meta.url), "utf8")
    );

    expect(source).toContain('type ConfigFlowStage = "overview" | "channels" | "operations" | "workers"');
    expect(source).toContain('useState<ConfigFlowStage>("overview")');
    expect(source).toContain('["overview", "Resumen", "Qué ocurrirá y qué falta"]');
    expect(source).toContain('["workers", "Trabajos", "Motores, estado y ejecución"]');
    expect(source).not.toContain("config-active-store-shell");
  });

  it("muestra sólo el diagnóstico de la tienda elegida y no repite el título", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./settings-connections-page.tsx", import.meta.url), "utf8")
    );

    expect(source).toContain(
      "<ConfiguracionObligatoriaPanel workspace={workspaceState} activeStoreId={selectedStoreId} />"
    );
    expect(source).toContain(
      "<MatrizAutomatizacionPanel workspace={workspaceState} activeStoreId={selectedStoreId} />"
    );
    expect(source).toContain("<WebhooksSinAsociarPanel hideWhenEmpty />");
    expect(source).not.toMatch(/<PageHeader[\s\S]*?breadcrumbs=/);
  });
});
