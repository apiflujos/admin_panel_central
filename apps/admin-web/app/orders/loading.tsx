import { AppShell } from "../../components/app-shell";
import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";

export default function Loading() {
  return (
    <AppShell activeHref="/orders">
      <PageContentSkeleton />
    </AppShell>
  );
}
