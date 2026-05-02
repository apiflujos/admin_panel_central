import { Suspense } from "react";

import { AppShell } from "../../components/app-shell";
import { SuperAdminPageContent } from "../../components/superadmin-page-content";
import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";
import { getServerSessionProfile } from "../../lib/server-api";

export default async function SuperAdminRoutePage() {
  const session = await getServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/superadmin">
      <Suspense fallback={<PageContentSkeleton />}>
        <SuperAdminPageContent />
      </Suspense>
    </AppShell>
  );
}
