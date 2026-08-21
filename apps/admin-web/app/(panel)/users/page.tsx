import { redirect } from "next/navigation";

import { UsersPage } from "../../../components/users-page";
import { requireServerSessionProfile, getServerTenantUsers } from "../../../lib/server-api";

export default async function UsersRoutePage() {
  // La sesión se pide aquí porque esta pantalla AUTORIZA por rol, no sólo
  // porque la necesite el shell (de eso se encarga el layout del panel).
  const session = await requireServerSessionProfile();
  if (session.role !== "admin" && session.role !== "super_admin") {
    redirect("/");
  }
  const users = await getServerTenantUsers();

  return <UsersPage initialUsers={users} canAssignRoles={session.role === "super_admin"} />;
}
