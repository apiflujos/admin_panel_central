import type { AdminWebMarketingOverviewDto } from "../../shared/src/admin-web";

type MarketingDashboardInput = {
  shopDomain?: unknown;
  from?: unknown;
  to?: unknown;
};

type MarketingDashboardResult = {
  shopDomain: string;
  from: string;
  to: string;
  kpis: {
    revenue: number;
    spend: number;
    roas: number | null;
    paidOrders: number;
    aov: number | null;
    customersNew: number;
    customersRepeat: number;
    funnel: {
      sessions: number;
      addToCart: number;
      checkouts: number;
    };
  };
  byChannel: Array<{
    channel: string;
    revenue: number;
    paidOrders: number;
    sessions: number;
    roas: number | null;
  }>;
  topCampaigns: Array<{
    utmCampaign: string | null;
    revenue: number;
    paidOrders: number;
    roas: number | null;
  }>;
};

function normalizeShopDomain(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function coerceDateKey(value: unknown): string | undefined {
  const raw = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}

function todayKeyUtc() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysUtc(dateKey: string, days: number) {
  const base = new Date(`${dateKey}T00:00:00.000Z`);
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export type NormalizedMarketingDashboardFilters = {
  shopDomain: string;
  from: string;
  to: string;
};

export function normalizeMarketingDashboardFilters(input: MarketingDashboardInput): NormalizedMarketingDashboardFilters {
  const shopDomain = normalizeShopDomain(input.shopDomain);
  const to = coerceDateKey(input.to) || todayKeyUtc();
  const from = coerceDateKey(input.from) || addDaysUtc(to, -30);
  return { shopDomain, from, to };
}

export function toAdminWebMarketingOverviewDto(result: MarketingDashboardResult): AdminWebMarketingOverviewDto {
  return {
    shopDomain: result.shopDomain,
    from: result.from,
    to: result.to,
    revenue: result.kpis.revenue,
    spend: result.kpis.spend,
    roas: result.kpis.roas,
    paidOrders: result.kpis.paidOrders,
    aov: result.kpis.aov,
    customersNew: result.kpis.customersNew,
    customersRepeat: result.kpis.customersRepeat,
    sessions: result.kpis.funnel.sessions,
    addToCart: result.kpis.funnel.addToCart,
    checkouts: result.kpis.funnel.checkouts,
    byChannel: result.byChannel.map((channel) => ({
      channel: channel.channel,
      revenue: channel.revenue,
      paidOrders: channel.paidOrders,
      sessions: channel.sessions,
      roas: channel.roas,
    })),
    topCampaigns: result.topCampaigns.map((campaign) => ({
      utmCampaign: campaign.utmCampaign,
      revenue: campaign.revenue,
      paidOrders: campaign.paidOrders,
      roas: campaign.roas,
    })),
  };
}
