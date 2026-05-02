import type { ConnectionStatusDto } from "../../../packages/shared/src/admin-web";
import { getServerConnectionsStatus, getServerSettingsOverview } from "../lib/server-api";
import { SettingsConnectionsPage } from "./settings-connections-page";

export async function SettingsConnectionsPageContent() {
  const [overview, connectionsResult] = await Promise.all([
    getServerSettingsOverview(),
    getServerConnectionsStatus(),
  ]);
  const connections = connectionsResult.items.map((row: ConnectionStatusDto) => ({ ...row, id: row.key }));
  return <SettingsConnectionsPage overview={overview} connections={connections} summary={connectionsResult.summary} />;
}
