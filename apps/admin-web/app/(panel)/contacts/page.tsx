import { Suspense } from "react";

import { ContactsPageContent } from "../../../components/contacts-page-content";
import { PageContentSkeleton } from "../../../components/ui/page-content-skeleton";

export default async function ContactsRoutePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <ContactsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
