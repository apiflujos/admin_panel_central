import { Suspense } from "react";

import { LogsPageContent } from "../../../components/logs-page-content";
import { PageContentSkeleton } from "../../../components/ui/page-content-skeleton";

export default async function LogsRoutePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <LogsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
