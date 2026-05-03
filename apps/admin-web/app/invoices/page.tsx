import { Suspense } from "react";

import { AppShell } from "../../components/app-shell";
import { InvoicesPageContent } from "../../components/invoices-page-content";
import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";
import { requireServerSessionProfile } from "../../lib/server-api";

export default async function InvoicesRoutePage() {
  const session = await requireServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/invoices">
      <Suspense fallback={<PageContentSkeleton />}>
        <InvoicesPageContent />
      </Suspense>
    </AppShell>
  );
}
