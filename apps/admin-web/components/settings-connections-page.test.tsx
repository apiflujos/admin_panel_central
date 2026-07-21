import { describe, expect, it } from "vitest";

describe("connections modal state contract", () => {
  it("uses one discriminated modal state instead of parallel open flags", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./settings-connections-page.tsx", import.meta.url), "utf8")
    );

    expect(source).toContain('type ConnectionModalState = { kind: "closed" }');
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
});
