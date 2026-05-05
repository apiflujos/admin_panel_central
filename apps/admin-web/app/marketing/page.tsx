import { Suspense } from "react";

import { AppShell } from "../../components/app-shell";
import { MarketingPageContent } from "../../components/marketing-page-content";
import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";
import { requireServerSessionProfile } from "../../lib/server-api";

export default async function MarketingRoutePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/marketing">
      <Suspense fallback={<PageContentSkeleton />}>
        <MarketingPageContent searchParams={searchParams} />
      </Suspense>
    </AppShell>
  );
}
