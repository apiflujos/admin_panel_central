import { Suspense } from "react";

import { AppShell } from "../../components/app-shell";
import { ContactsPageContent } from "../../components/contacts-page-content";
import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";
import { requireServerSessionProfile } from "../../lib/server-api";

export default async function ContactsRoutePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/contacts">
      <Suspense fallback={<PageContentSkeleton />}>
        <ContactsPageContent searchParams={searchParams} />
      </Suspense>
    </AppShell>
  );
}
