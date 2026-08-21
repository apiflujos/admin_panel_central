import { SettingsStoresPage } from "../../../../components/settings-stores-page";
import { getServerConnectionsWorkspace } from "../../../../lib/server-api";

export default async function SettingsStoresBridgePage() {
  const workspace = await getServerConnectionsWorkspace();

  return <SettingsStoresPage workspace={workspace} />;
}
