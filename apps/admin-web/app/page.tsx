import { Suspense } from "react";

import { AppShell } from "../components/app-shell";
import { DashboardPageContent } from "../components/dashboard-page-content";
import { PageContentSkeleton } from "../components/ui/page-content-skeleton";
import { getServerSessionProfile } from "../lib/server-api";

export default async function HomePage() {
  const session = await getServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/">
      <Suspense fallback={<PageContentSkeleton />}>
        <DashboardPageContent />
      </Suspense>
    </AppShell>
  );
}
