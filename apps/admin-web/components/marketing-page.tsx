import type {
  AdminWebMarketingCampaignDto,
  AdminWebMarketingChannelDto,
  AdminWebMarketingOverviewDto,
} from "../../../packages/shared/src/admin-web";
import { DataTable } from "./ui/data-table";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

export function MarketingPage({ overview }: { overview: AdminWebMarketingOverviewDto }) {
  return (
    <section className="page-stack">
      <PageHeader
        title="Marketing"
        subtitle="Métricas de performance por canal."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Marketing</span>
          </>
        }
      />

      <PageToolbar
        search={
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden="true">
              ⌕
            </span>
            <input className="input-control" type="search" defaultValue={overview.shopDomain} aria-label="Shop domain de marketing" />
          </div>
        }
        filters={
          <>
            <span className="pill pill-info">
              ROAS · {overview.roas != null ? overview.roas.toFixed(2) : "—"}
            </span>
            <span className="pill">
              Nuevos · {overview.customersNew}
            </span>
            <span className="pill">
              Recurrentes · {overview.customersRepeat}
            </span>
          </>
        }
        actions={
          <>
            <button className="btn btn-primary btn-compact" type="button">
              Refrescar
            </button>
          </>
        }
      />

      <section className="stats-grid stats-grid-4">
        <article className="card stat-card">
          <p className="stat-label">Revenue</p>
          <strong>{overview.revenue.toLocaleString("es-CO")}</strong>
          <span className="stat-note">
            {overview.from} a {overview.to}
          </span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Spend</p>
          <strong>{overview.spend.toLocaleString("es-CO")}</strong>
          <span className="stat-note">Paid media consolidado</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Paid orders</p>
          <strong>{overview.paidOrders}</strong>
          <span className="stat-note">AOV {overview.aov != null ? overview.aov.toFixed(0) : "—"}</span>
        </article>
        <article className="card stat-card">
          <p className="stat-label">Sessions</p>
          <strong>{overview.sessions}</strong>
          <span className="stat-note">Tráfico</span>
        </article>
      </section>

      <section className="stats-grid stats-grid-tight">
        <article className="card stat-card stat-card-mini">
          <p className="stat-label">Add to cart</p>
          <strong>{overview.addToCart}</strong>
        </article>
        <article className="card stat-card stat-card-mini">
          <p className="stat-label">Checkouts</p>
          <strong>{overview.checkouts}</strong>
        </article>
        <article className="card stat-card stat-card-mini">
          <p className="stat-label">Clientes nuevos</p>
          <strong>{overview.customersNew}</strong>
        </article>
      </section>

      <div className="card table-card">
        <div className="table-meta">Canales con mayor aporte a revenue</div>
          <DataTable<AdminWebMarketingChannelDto>
            columns={[
            {
              key: "channel",
              header: "Canal",
              render: (row) => row.channel,
            },
            {
              key: "revenue",
              header: "Revenue",
              render: (row) => row.revenue.toLocaleString("es-CO"),
            },
            {
              key: "paidOrders",
              header: "Paid orders",
              render: (row) => row.paidOrders,
            },
            {
              key: "roas",
              header: "ROAS",
              render: (row) =>
                row.roas != null ? (
                  <StatusPill tone="success" small>
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
      </div>

      <div className="card table-card">
        <div className="table-meta">Campañas principales del período</div>
          <DataTable<AdminWebMarketingCampaignDto>
            columns={[
            {
              key: "utmCampaign",
              header: "Campaña",
              render: (row) => row.utmCampaign || "—",
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
              render: (row) => (row.roas != null ? row.roas.toFixed(2) : "—"),
            },
          ]}
          rows={overview.topCampaigns}
        />
      </div>
    </section>
  );
}
