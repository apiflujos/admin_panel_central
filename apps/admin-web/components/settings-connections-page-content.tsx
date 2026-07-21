import { getServerConnectionsWorkspace } from "../lib/server-api";
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
  const workspace = await getServerConnectionsWorkspace();
  return (
    <SettingsConnectionsPage
      workspace={workspace}
      callbackState={callbackState}
      initialStoreId={initialStoreId}
    />
  );
}
