import { Suspense } from "react";

import { AppShell } from "../../components/app-shell";
import { LogsPageContent } from "../../components/logs-page-content";
import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";
import { getServerSessionProfile } from "../../lib/server-api";

export default async function LogsRoutePage() {
  const session = await getServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/logs">
      <Suspense fallback={<PageContentSkeleton />}>
        <LogsPageContent />
      </Suspense>
    </AppShell>
  );
}
