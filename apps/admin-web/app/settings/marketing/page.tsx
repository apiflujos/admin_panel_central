import { AppShell } from "../../../components/app-shell";
import { SettingsMarketingPage } from "../../../components/settings-marketing-page";
import { getServerConnectionsWorkspace, requireServerSessionProfile } from "../../../lib/server-api";

export default async function SettingsMarketingPageRoute() {
  const [session, workspace] = await Promise.all([requireServerSessionProfile(), getServerConnectionsWorkspace()]);

  return (
    <AppShell session={session} activeHref="/settings/connections">
      <SettingsMarketingPage workspace={workspace} />
    </AppShell>
  );
}
