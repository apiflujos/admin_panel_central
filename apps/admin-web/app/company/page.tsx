import { redirect } from "next/navigation";

import { AppShell } from "../../components/app-shell";
import { CompanyPage } from "../../components/company-page";
import { requireServerSessionProfile, getServerCompanyProfile } from "../../lib/server-api";

export default async function CompanyRoutePage() {
  const session = await requireServerSessionProfile();
  if (session.role !== "admin" && session.role !== "super_admin") {
    redirect("/");
  }
  const company = await getServerCompanyProfile();

  return (
    <AppShell session={session} activeHref="/company">
      <CompanyPage initialCompany={company} />
    </AppShell>
  );
}
