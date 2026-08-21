import { Suspense } from "react";

import { SuperAdminPageContent } from "../../../components/superadmin-page-content";
import { PageContentSkeleton } from "../../../components/ui/page-content-skeleton";

export default async function SuperAdminRoutePage() {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <SuperAdminPageContent />
    </Suspense>
  );
}
