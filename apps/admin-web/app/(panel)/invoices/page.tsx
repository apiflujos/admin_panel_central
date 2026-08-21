import { Suspense } from "react";

import { InvoicesPageContent } from "../../../components/invoices-page-content";
import { PageContentSkeleton } from "../../../components/ui/page-content-skeleton";

export default async function InvoicesRoutePage() {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <InvoicesPageContent />
    </Suspense>
  );
}
