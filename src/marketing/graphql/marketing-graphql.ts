import { buildSchema } from "graphql";
import { createHandler } from "graphql-http/lib/use/express";
import type { Request, Response } from "express";
import { getMarketingExecutiveDashboard } from "../reports/marketing-reports.service";

export const marketingSchema = buildSchema(`
  scalar JSON

  type Funnel {
    sessions: Int!
    addToCart: Int!
    checkouts: Int!
    paidOrders: Int!
    convSessionToCart: Float
    convCartToCheckout: Float
    convCheckoutToPaid: Float
  }

  type KPIs {
    revenue: Float!
    spend: Float!
    roas: Float
    cac: Float
    cpa: Float
    ltv: Float
    paidOrders: Int!
    aov: Float
    customersNew: Int!
    customersRepeat: Int!
    funnel: Funnel!
  }

  type ChannelRow {
    channel: String!
    revenue: Float!
    paidOrders: Int!
    sessions: Int!
    checkouts: Int!
    roas: Float
  }

  type ProductRow {
    name: String!
    units: Int!
    amount: Float!
  }

  type CampaignRow {
    utmCampaign: String
    revenue: Float!
    paidOrders: Int!
    roas: Float
  }

  type SeriesPoint {
    date: String!
    revenue: Float!
    paidOrders: Int!
    sessions: Int!
    checkouts: Int!
  }

  type ExecutiveDashboard {
    shopDomain: String!
    from: String!
    to: String!
    kpis: KPIs!
    byChannel: [ChannelRow!]!
    topProducts: [ProductRow!]!
    topCampaigns: [CampaignRow!]!
    series: [SeriesPoint!]!
  }

  type Query {
    executiveDashboard(shopDomain: String!, from: String!, to: String!): ExecutiveDashboard!
  }
`);

export function marketingGraphqlHandler() {
  return createHandler({
    schema: marketingSchema,
    rootValue: {
      executiveDashboard: async (args: { shopDomain: string; from: string; to: string }) => {
        return getMarketingExecutiveDashboard(args);
      },
    },
  });
}

export async function marketingGraphqlHttpHandler(req: Request, res: Response, next: (err?: unknown) => void) {
  return marketingGraphqlHandler()(req, res, next);
}
