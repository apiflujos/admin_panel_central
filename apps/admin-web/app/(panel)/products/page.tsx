import { Suspense } from "react";

import { ProductsPageContent } from "../../../components/products-page-content";
import { PageContentSkeleton } from "../../../components/ui/page-content-skeleton";

export default async function ProductsRoutePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <ProductsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
