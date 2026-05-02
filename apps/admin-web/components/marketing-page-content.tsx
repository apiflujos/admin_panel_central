import { getServerMarketingOverview } from "../lib/server-api";
import { MarketingPage } from "./marketing-page";

export async function MarketingPageContent() {
  const overview = await getServerMarketingOverview();
  return <MarketingPage overview={overview} />;
}
