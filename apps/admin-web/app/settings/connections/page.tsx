import { Suspense } from "react";

import { AppShell } from "../../../components/app-shell";
import { SettingsConnectionsPageContent } from "../../../components/settings-connections-page-content";
import { PageContentSkeleton } from "../../../components/ui/page-content-skeleton";
import { requireServerSessionProfile } from "../../../lib/server-api";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireServerSessionProfile();
  const resolved = ((await searchParams) || {}) as Record<string, string | string[] | undefined>;
  const onboard = typeof resolved.onboard === "string" ? resolved.onboard : "";
  const oauthError = typeof resolved.oauth_error === "string" ? resolved.oauth_error : "";
  const connections = typeof resolved.connections === "string" ? resolved.connections : "";
  const initialStoreIdRaw = typeof resolved.storeId === "string" ? resolved.storeId : "";
  const initialStoreId = initialStoreIdRaw ? Number(initialStoreIdRaw) : null;

  return (
    <AppShell session={session} activeHref="/settings/connections">
      <Suspense fallback={<PageContentSkeleton />}>
        <SettingsConnectionsPageContent
          callbackState={{
            onboard,
            oauthError,
            connections: connections === "1",
          }}
          initialStoreId={Number.isFinite(initialStoreId ?? NaN) ? initialStoreId : null}
        />
      </Suspense>
    </AppShell>
  );
}
