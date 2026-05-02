import { getServerDashboardOverview } from "../lib/server-api";
import { DashboardPage } from "./dashboard-page";

export async function DashboardPageContent() {
  const overview = await getServerDashboardOverview();
  return <DashboardPage overview={overview} />;
}
