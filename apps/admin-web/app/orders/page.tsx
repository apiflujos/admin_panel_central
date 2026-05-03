import { Suspense } from "react";

import { AppShell } from "../../components/app-shell";
import { OrdersPageContent } from "../../components/orders-page-content";
import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";
import { requireServerSessionProfile } from "../../lib/server-api";

export default async function OrdersRoutePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/orders">
      <Suspense fallback={<PageContentSkeleton />}>
        <OrdersPageContent searchParams={searchParams} />
      </Suspense>
    </AppShell>
  );
}
