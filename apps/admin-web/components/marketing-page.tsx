import { Search } from "lucide-react";
import type {
  AdminWebMarketingCampaignDto,
  AdminWebMarketingChannelDto,
  AdminWebMarketingOverviewDto,
} from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

function channelTier(row: AdminWebMarketingChannelDto) {
  if (row.roas != null && row.roas >= 4) return "Alta eficiencia";
  if (row.roas != null && row.roas >= 2) return "Sana";
  return "A vigilar";
}

function campaignTier(row: AdminWebMarketingCampaignDto) {
  if (row.roas != null && row.roas >= 4) return "success";
  if (row.roas != null && row.roas >= 2) return "warning";
  return "info";
}

export function MarketingPage({ overview }: { overview: AdminWebMarketingOverviewDto }) {
  const funnelConversion =
    overview.sessions > 0 ? ((overview.paidOrders / overview.sessions) * 100).toFixed(2) : "0.00";
  const cartRate = overview.sessions > 0 ? ((overview.addToCart / overview.sessions) * 100).toFixed(1) : "0.0";
  const checkoutRate = overview.sessions > 0 ? ((overview.checkouts / overview.sessions) * 100).toFixed(1) : "0.0";

  return (
    <section className="page-stack metrics-page">
      <PageHeader
        title="Marketing"
        subtitle="Performance, canales y embudo."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Marketing</span>
          </>
        }
      />

      <div className="card metrics-shell">
        <PageToolbar
          search={
            <form method="get">
              <input type="hidden" name="from" value={overview.from} />
              <input type="hidden" name="to" value={overview.to} />
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true"><Search size={14} strokeWidth={1.75} /></span>
                <input
                  className="input"
                  type="search"
                  name="shopDomain"
                  defaultValue={overview.shopDomain}
                  aria-label="Dominio de tienda para marketing"
                />
              </div>
            </form>
          }
          views={
            <>
              <span className="pill pill-info">ROAS · {overview.roas != null ? overview.roas.toFixed(2) : "—"}</span>
              <span className="pill">Nuevos · {overview.customersNew}</span>
              <span className="pill">Recurrentes · {overview.customersRepeat}</span>
            </>
          }
          actions={
            <form method="get" className="page-toolbar-right">
              <input type="hidden" name="shopDomain" value={overview.shopDomain} />
              <input
                className="input toolbar-date-input"
                type="date"
                name="from"
                defaultValue={overview.from}
                aria-label="Fecha desde marketing"
              />
              <input
                className="input toolbar-date-input"
                type="date"
                name="to"
                defaultValue={overview.to}
                aria-label="Fecha hasta marketing"
              />
              <button className="btn primary btn-compact" type="submit">
                Aplicar
              </button>
            </form>
          }
        />

        <section className="metrics-kpis metrics-kpis-tight">
          <article className="metrics-kpi metrics-kpi-primary">
            <p className="metrics-kpi-label">Ingresos</p>
            <strong>{overview.revenue.toLocaleString("es-CO")}</strong>
            <p>
              {overview.from} a {overview.to}
            </p>
          </article>
          <article className="metrics-kpi metrics-kpi-warning">
            <p className="metrics-kpi-label">Inversión</p>
            <strong>{overview.spend.toLocaleString("es-CO")}</strong>
          </article>
          <article className="metrics-kpi metrics-kpi-success">
            <p className="metrics-kpi-label">Pedidos pagados</p>
            <strong>{overview.paidOrders}</strong>
            <p>AOV {overview.aov != null ? overview.aov.toFixed(0) : "—"}</p>
          </article>
          <article className="metrics-kpi metrics-kpi-primary">
            <p className="metrics-kpi-label">Sesiones</p>
            <strong>{overview.sessions}</strong>
            <p>Conversión {funnelConversion}%</p>
          </article>
        </section>

        <section className="metrics-panels">
          <article className="card metrics-panel">
            <div className="metrics-panel-head">
              <div>
                <h3>Salud del embudo</h3>
              </div>
              <StatusPill tone="info" small>
                {overview.shopDomain}
              </StatusPill>
            </div>
            <div className="metrics-bars">
              <div className="metrics-bar-row">
                <div className="metrics-bar-meta">
                  <strong>Sesiones a carrito</strong>
                  <span>{cartRate}%</span>
                </div>
                <div className="metrics-bar-track">
                  <div
                    className="metrics-bar-fill metrics-bar-fill-primary"
                    style={{ width: `${Math.min(Number(cartRate), 100)}%` }}
                  />
                </div>
              </div>
              <div className="metrics-bar-row">
                <div className="metrics-bar-meta">
                  <strong>Sesiones a checkout</strong>
                  <span>{checkoutRate}%</span>
                </div>
                <div className="metrics-bar-track">
                  <div
                    className="metrics-bar-fill metrics-bar-fill-warning"
                    style={{ width: `${Math.min(Number(checkoutRate), 100)}%` }}
                  />
                </div>
              </div>
              <div className="metrics-bar-row">
                <div className="metrics-bar-meta">
                  <strong>Sesiones a pedido pagado</strong>
                  <span>{funnelConversion}%</span>
                </div>
                <div className="metrics-bar-track">
                  <div
                    className="metrics-bar-fill metrics-bar-fill-success"
                    style={{ width: `${Math.min(Number(funnelConversion), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </article>

          <article className="card metrics-panel">
            <div className="metrics-panel-head">
              <div>
                <h3>Highlights del periodo</h3>
              </div>
            </div>
            <div className="metrics-highlight-grid">
              <article className="metrics-highlight-card">
                <div className="metrics-highlight-top">
                  <span className="metrics-highlight-kind">Clientes nuevos</span>
                  <span className="metrics-highlight-metric">{overview.customersNew}</span>
                </div>
                <strong>Adquisición</strong>
              </article>
              <article className="metrics-highlight-card">
                <div className="metrics-highlight-top">
                  <span className="metrics-highlight-kind">Recurrentes</span>
                  <span className="metrics-highlight-metric">{overview.customersRepeat}</span>
                </div>
                <strong>Retención</strong>
              </article>
              <article className="metrics-highlight-card">
                <div className="metrics-highlight-top">
                  <span className="metrics-highlight-kind">Carrito</span>
                  <span className="metrics-highlight-metric">{overview.addToCart}</span>
                </div>
                <strong>Intento</strong>
              </article>
              <article className="metrics-highlight-card">
                <div className="metrics-highlight-top">
                  <span className="metrics-highlight-kind">Checkouts</span>
                  <span className="metrics-highlight-metric">{overview.checkouts}</span>
                </div>
                <strong>Cierre</strong>
              </article>
            </div>
          </article>
        </section>

        <section className="card page-module-shell">
          <div className="page-module-head">
            <div>
              <strong>Canales</strong>
            </div>
          </div>
          <DataTable<AdminWebMarketingChannelDto>
            columns={[
              {
                key: "channel",
                header: "Canal",
                render: (row) => (
                  <div className="entity-cell">
                    <strong>{row.channel}</strong>
                    <span>{channelTier(row)}</span>
                  </div>
                ),
              },
              {
                key: "revenue",
                header: "Revenue",
                render: (row) => (
                  <div className="entity-cell entity-cell-compact">
                    <strong>{row.revenue.toLocaleString("es-CO")}</strong>
                    <span>{row.paidOrders} pedidos</span>
                  </div>
                ),
              },
              {
                key: "sessions",
                header: "Sesiones",
                render: (row) => row.sessions.toLocaleString("es-CO"),
              },
              {
                key: "roas",
                header: "ROAS",
                render: (row) =>
                  row.roas != null ? (
                    <StatusPill tone={row.roas >= 4 ? "success" : "warning"} small>
                      {row.roas.toFixed(2)}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="info" small>
                      —
                    </StatusPill>
                  ),
              },
            ]}
            rows={overview.byChannel}
          />
        </section>

        <section className="card page-module-shell">
          <div className="page-module-head">
            <div>
              <strong>Campañas</strong>
            </div>
          </div>
          <DataTable<AdminWebMarketingCampaignDto>
            columns={[
              {
                key: "utmCampaign",
                header: "Campaña",
                render: (row) => (
                  <div className="entity-cell">
                    <strong>{row.utmCampaign || "—"}</strong>
                    <span>{row.paidOrders} pedidos</span>
                  </div>
                ),
              },
              {
                key: "revenue",
                header: "Revenue",
                render: (row) => row.revenue.toLocaleString("es-CO"),
              },
              {
                key: "paidOrders",
                header: "Pedidos",
                render: (row) => row.paidOrders,
              },
              {
                key: "roas",
                header: "ROAS",
                render: (row) => (
                  <StatusPill tone={campaignTier(row)} small>
                    {row.roas != null ? row.roas.toFixed(2) : "—"}
                  </StatusPill>
                ),
              },
            ]}
            rows={overview.topCampaigns}
          />
        </section>
      </div>
    </section>
  );
}
