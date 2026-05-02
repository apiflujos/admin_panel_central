import { normalizeMarketingDashboardFilters } from "../../../../../../../packages/domain/src/marketing";
import { resolveDefaultMarketingShopDomain } from "./marketing-shop-domain";

type MarketingDashboardQueryInput = Record<string, unknown>;

type ResolveMarketingDashboardFiltersOptions = {
  autofillShopDomain?: boolean;
};

export async function resolveMarketingDashboardFilters(
  query: MarketingDashboardQueryInput,
  options: ResolveMarketingDashboardFiltersOptions = {}
) {
  const requestedShopDomain =
    typeof query.shopDomain === "string" && query.shopDomain.trim()
      ? query.shopDomain
      : options.autofillShopDomain
        ? await resolveDefaultMarketingShopDomain()
        : undefined;

  const filters = normalizeMarketingDashboardFilters({
    ...query,
    shopDomain: requestedShopDomain,
  });

  if (!filters.shopDomain) {
    throw new Error("shopDomain requerido");
  }

  return filters;
}
