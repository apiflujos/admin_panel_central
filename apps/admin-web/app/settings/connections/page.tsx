import { Suspense } from "react";

import { AppShell } from "../../../components/app-shell";
import { SettingsConnectionsPageContent } from "../../../components/settings-connections-page-content";
import { PageContentSkeleton } from "../../../components/ui/page-content-skeleton";
import { requireServerSessionProfile } from "../../../lib/server-api";

export default async function ConnectionsPage() {
  const session = await requireServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/settings/connections">
      <Suspense fallback={<PageContentSkeleton />}>
        <SettingsConnectionsPageContent />
      </Suspense>
    </AppShell>
  );
}
