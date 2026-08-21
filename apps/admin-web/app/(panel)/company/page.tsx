import { redirect } from "next/navigation";

import { CompanyPage } from "../../../components/company-page";
import { requireServerSessionProfile, getServerCompanyProfile } from "../../../lib/server-api";

export default async function CompanyRoutePage() {
  // La sesión se pide aquí porque esta pantalla AUTORIZA por rol, no sólo
  // porque la necesite el shell (de eso se encarga el layout del panel).
  const session = await requireServerSessionProfile();
  if (session.role !== "admin" && session.role !== "super_admin") {
    redirect("/");
  }
  const company = await getServerCompanyProfile();

  return <CompanyPage initialCompany={company} />;
}
