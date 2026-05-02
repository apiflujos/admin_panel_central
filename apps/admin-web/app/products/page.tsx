import { Suspense } from "react";

import { AppShell } from "../../components/app-shell";
import { ProductsPageContent } from "../../components/products-page-content";
import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";
import { getServerSessionProfile } from "../../lib/server-api";

export default async function ProductsRoutePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/products">
      <Suspense fallback={<PageContentSkeleton />}>
        <ProductsPageContent searchParams={searchParams} />
      </Suspense>
    </AppShell>
  );
}
