import { Suspense } from "react";

import { InvoicesPageContent } from "../../../components/invoices-page-content";
import { PageContentSkeleton } from "../../../components/ui/page-content-skeleton";

export default async function InvoicesRoutePage({ searchParams }: { searchParams?: Promise<{ offset?: string }> }) {
  const params = (await searchParams) || {};
  const offset = Math.max(0, Number(params.offset) || 0);
  return (
    <Suspense key={offset} fallback={<PageContentSkeleton />}>
      <InvoicesPageContent offset={offset} />
    </Suspense>
  );
}
