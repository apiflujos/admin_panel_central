import { getServerSuperAdminOverview } from "../lib/server-api";
import { SuperAdminPage } from "./superadmin-page";

export async function SuperAdminPageContent() {
  const overview = await getServerSuperAdminOverview();
  return <SuperAdminPage overview={overview} />;
}
