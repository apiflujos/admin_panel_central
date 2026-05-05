import { getServerMarketingOverview } from "../lib/server-api";
import { MarketingPage } from "./marketing-page";

export async function MarketingPageContent({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const shopDomain = typeof params.shopDomain === "string" ? params.shopDomain : undefined;
  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;
  const overview = await getServerMarketingOverview(shopDomain, from, to);
  return <MarketingPage overview={overview} />;
}
