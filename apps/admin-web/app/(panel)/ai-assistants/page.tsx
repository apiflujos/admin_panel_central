import { redirect } from "next/navigation";

import { AiAssistantsPage } from "../../../components/ai-assistants-page";
import { getServerAiAssistants, requireServerSessionProfile } from "../../../lib/server-api";

export default async function AiAssistantsRoutePage() {
  // La sesión se pide aquí porque esta pantalla AUTORIZA por rol, no sólo
  // porque la necesite el shell (de eso se encarga el layout del panel).
  const session = await requireServerSessionProfile();
  if (session.role !== "admin" && session.role !== "super_admin") {
    redirect("/");
  }
  const assistants = await getServerAiAssistants();

  return <AiAssistantsPage initialAssistants={assistants} />;
}
