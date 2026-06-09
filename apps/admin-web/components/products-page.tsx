import type { AdminWebProductRowDto, AdminWebProductsListDto } from "../../../packages/shared/src/admin-web";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

const PAGE_SIZE = 30;

type ProductGroup = {
  key: string;
  name: string;
  reference: string;
  variantCount: number;
  totalStock: number;
  matchedCount: number;
  pendingCount: number;
  shopifyProductIds: string[];
  variants: AdminWebProductRowDto[];
};

function groupProducts(rows: AdminWebProductRowDto[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();
  for (const row of rows) {
    const baseName = (row.name || "").trim() || "Sin nombre";
    const reference = (row.reference || "").trim();
    const key = reference ? `${baseName}__${reference}` : baseName;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: baseName,
        reference,
        variantCount: 0,
        totalStock: 0,
        matchedCount: 0,
        pendingCount: 0,
        shopifyProductIds: [],
        variants: [],
      };
      groups.set(key, group);
    }
    group.variantCount += 1;
    group.totalStock += typeof row.inventoryQuantity === "number" ? row.inventoryQuantity : 0;
    if (row.shopifyProductId) {
      group.matchedCount += 1;
      if (!group.shopifyProductIds.includes(row.shopifyProductId)) {
        group.shopifyProductIds.push(row.shopifyProductId);
      }
    } else {
      group.pendingCount += 1;
    }
    group.variants.push(row);
  }
  return Array.from(groups.values());
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-CO");
  } catch {
    return "—";
  }
}

export function ProductsPage({
  result,
  query,
  start,
}: {
  result: AdminWebProductsListDto;
  query: string;
  start: number;
}) {
  const rows = result.items;
  const groups = groupProducts(rows);
  const prevStart = Math.max(0, start - PAGE_SIZE);
  const nextStart = start + PAGE_SIZE;
  const hasNext = nextStart < result.total;
  const hasPrev = start > 0;

  return (
    <section className="page-stack">
      <PageHeader
        title="Productos y servicios"
        subtitle="Catálogo operativo con foco en lectura rápida, stock y matching."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Productos y servicios</span>
          </>
        }
      />

      <section className="card metrics-shell metrics-shell-compact">
        <PageToolbar
          search={
            <form method="get">
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">
                  ⌕
                </span>
                <input
                  className="input"
                  type="search"
                  name="query"
                  defaultValue={query}
                  placeholder="Buscar producto, referencia o SKU..."
                  aria-label="Buscar producto"
                />
              </div>
            </form>
          }
          views={
            <>
              <span className="pill pill-info">Todos · {result.total}</span>
              <span className="pill">Matcheados · {result.summary.matchedCount}</span>
              <span className="pill">Con stock · {result.summary.inStockCount}</span>
              <span className="pill">Pendientes · {result.summary.pendingCount}</span>
            </>
          }
          actions={
            <>
              {hasPrev && (
                <a
                  className="btn ghost btn-compact"
                  href={`/products?query=${encodeURIComponent(query)}&start=${prevStart}`}
                >
                  ← Anterior
                </a>
              )}
              {hasNext && (
                <a
                  className="btn primary btn-compact"
                  href={`/products?query=${encodeURIComponent(query)}&start=${nextStart}`}
                >
                  Siguiente →
                </a>
              )}
            </>
          }
        />

        <div className="table-meta">
          Mostrando {start + 1}–{Math.min(start + PAGE_SIZE, result.total)} de {result.total} · {groups.length} productos
          padre
        </div>

        {groups.length ? (
          <div className="products-table">
            <div className="products-table-head">
              <span className="products-table-col-toggle" aria-hidden="true" />
              <span>Producto</span>
              <span>Referencia</span>
              <span className="products-table-col-num">Variantes</span>
              <span className="products-table-col-num">Stock</span>
              <span>Estado</span>
              <span>Actualizado</span>
            </div>

            {groups.map((group) => {
              const lastUpdate = group.variants.reduce<string | null>((acc, variant) => {
                if (!variant.updatedAt) return acc;
                if (!acc) return variant.updatedAt;
                return variant.updatedAt > acc ? variant.updatedAt : acc;
              }, null);
              const allMatched = group.matchedCount === group.variantCount;
              const partiallyMatched = group.matchedCount > 0 && !allMatched;

              return (
                <details className="products-table-group" key={group.key}>
                  <summary className="products-table-row products-table-row-parent">
                    <span className="products-table-col-toggle" aria-hidden="true">
                      ▸
                    </span>
                    <span className="products-table-cell-name">
                      <strong>{group.name}</strong>
                      <small>
                        {group.shopifyProductIds.length > 0
                          ? `${group.shopifyProductIds.length} producto(s) Shopify`
                          : "Sin Shopify"}
                      </small>
                    </span>
                    <span className="products-table-cell-ref">{group.reference || "—"}</span>
                    <span className="products-table-col-num">{group.variantCount}</span>
                    <span className="products-table-col-num">{group.totalStock}</span>
                    <span>
                      {allMatched ? (
                        <StatusPill tone="success" small>
                          Matcheado
                        </StatusPill>
                      ) : partiallyMatched ? (
                        <StatusPill tone="warning" small>
                          {group.matchedCount}/{group.variantCount}
                        </StatusPill>
                      ) : (
                        <StatusPill tone="warning" small>
                          Pendiente
                        </StatusPill>
                      )}
                    </span>
                    <span>{formatDate(lastUpdate)}</span>
                  </summary>

                  <div className="products-table-variants">
                    <div className="products-table-variants-head">
                      <span>SKU</span>
                      <span>Alegra ID</span>
                      <span>Shopify ID</span>
                      <span className="products-table-col-num">Stock</span>
                      <span>Alegra</span>
                      <span>Shopify</span>
                      <span>Actualizado</span>
                    </div>
                    {group.variants.map((variant) => (
                      <div className="products-table-variant-row" key={variant.id}>
                        <span>{variant.sku || "—"}</span>
                        <span>{variant.alegraItemId || "—"}</span>
                        <span>{variant.shopifyProductId || "—"}</span>
                        <span className="products-table-col-num">
                          {variant.inventoryQuantity ?? 0}
                        </span>
                        <span>
                          {variant.alegraStatus ? (
                            <span className="pill pill-mini">{variant.alegraStatus}</span>
                          ) : (
                            "—"
                          )}
                        </span>
                        <span>
                          {variant.shopifyStatus ? (
                            <span className="pill pill-mini pill-info">{variant.shopifyStatus}</span>
                          ) : (
                            "—"
                          )}
                        </span>
                        <span>{formatDate(variant.updatedAt)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <div className="metrics-empty-state">
            <strong>Sin resultados</strong>
            <p>No encontramos productos con los filtros actuales.</p>
          </div>
        )}
      </section>
    </section>
  );
}
