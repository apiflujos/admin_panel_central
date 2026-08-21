import { Suspense } from "react";

import { OperationsPageContent } from "../../../components/operations-page-content";
import { PageContentSkeleton } from "../../../components/ui/page-content-skeleton";

export default async function OperationsRoutePage() {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <OperationsPageContent />
    </Suspense>
  );
}
