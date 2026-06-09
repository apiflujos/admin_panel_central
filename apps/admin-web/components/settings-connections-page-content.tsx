import type { ConnectionStatusDto } from "../../../packages/shared/src/admin-web";
import {
  getServerConnectionsStatus,
  getServerConnectionsWorkspace,
  getServerSettingsOverview,
} from "../lib/server-api";
import { SettingsConnectionsPage } from "./settings-connections-page";

export async function SettingsConnectionsPageContent({
  callbackState,
  initialStoreId,
}: {
  callbackState?: {
    onboard?: string;
    oauthError?: string;
    connections?: boolean;
  };
  initialStoreId?: number | null;
}) {
  const [overview, connectionsResult, workspace] = await Promise.all([
    getServerSettingsOverview(),
    getServerConnectionsStatus(),
    getServerConnectionsWorkspace(),
  ]);
  const connections = connectionsResult.items.map((row: ConnectionStatusDto) => ({ ...row, id: row.key }));
  return (
    <SettingsConnectionsPage
      overview={overview}
      connections={connections}
      workspace={workspace}
      callbackState={callbackState}
      initialStoreId={initialStoreId}
    />
  );
}
