import { Suspense } from "react";

import { AppShell } from "../../components/app-shell";
import { OperationsPageContent } from "../../components/operations-page-content";
import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";
import { requireServerSessionProfile } from "../../lib/server-api";

export default async function OperationsRoutePage() {
  const session = await requireServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/operations">
      <Suspense fallback={<PageContentSkeleton />}>
        <OperationsPageContent />
      </Suspense>
    </AppShell>
  );
}
