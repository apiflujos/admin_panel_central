import { Suspense } from "react";

import { OrdersPageContent } from "../../../components/orders-page-content";
import { PageContentSkeleton } from "../../../components/ui/page-content-skeleton";

export default async function OrdersRoutePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <OrdersPageContent searchParams={searchParams} />
    </Suspense>
  );
}
