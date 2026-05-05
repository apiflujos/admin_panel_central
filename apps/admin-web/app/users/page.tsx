import { redirect } from "next/navigation";

import { AppShell } from "../../components/app-shell";
import { UsersPage } from "../../components/users-page";
import { requireServerSessionProfile, getServerTenantUsers } from "../../lib/server-api";

export default async function UsersRoutePage() {
  const session = await requireServerSessionProfile();
  if (session.role !== "admin" && session.role !== "super_admin") {
    redirect("/");
  }
  const users = await getServerTenantUsers();

  return (
    <AppShell session={session} activeHref="/users">
      <UsersPage initialUsers={users} canAssignRoles={session.role === "super_admin"} />
    </AppShell>
  );
}
