import { getServerLogsCatalog } from "../lib/server-api";
import { LogsPage } from "./logs-page";

export async function LogsPageContent() {
  const logs = await getServerLogsCatalog();
  return <LogsPage result={logs} />;
}
