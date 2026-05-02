import { Suspense } from "react";

import { AppShell } from "../../components/app-shell";
import { MarketingPageContent } from "../../components/marketing-page-content";
import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";
import { getServerSessionProfile } from "../../lib/server-api";

export default async function MarketingRoutePage() {
  const session = await getServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/marketing">
      <Suspense fallback={<PageContentSkeleton />}>
        <MarketingPageContent />
      </Suspense>
    </AppShell>
  );
}
