import { Suspense } from "react";

import { DashboardPageContent } from "../../components/dashboard-page-content";
import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";

export default async function HomePage() {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}
