import { AppShell } from "../../../components/app-shell";
import { SettingsStoresPage } from "../../../components/settings-stores-page";
import { requireServerSessionProfile, getServerConnectionsWorkspace } from "../../../lib/server-api";

export default async function SettingsStoresBridgePage() {
  const session = await requireServerSessionProfile();
  const workspace = await getServerConnectionsWorkspace();

  return (
    <AppShell session={session} activeHref="/settings/connections">
      <SettingsStoresPage workspace={workspace} />
    </AppShell>
  );
}
