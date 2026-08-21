import { AppShell } from "../../../components/app-shell";
import { WorkersPage } from "../../../components/workers-page";
import { requireServerSessionProfile } from "../../../lib/server-api";

export default async function WorkersRoutePage() {
  const session = await requireServerSessionProfile();

  return (
    <AppShell session={session} activeHref="/superadmin">
      <WorkersPage />
    </AppShell>
  );
}
