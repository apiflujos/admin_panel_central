import { redirect } from "next/navigation";

import { AiAssistantsPage } from "../../components/ai-assistants-page";
import { AppShell } from "../../components/app-shell";
import { getServerAiAssistants, requireServerSessionProfile } from "../../lib/server-api";

export default async function AiAssistantsRoutePage() {
  const session = await requireServerSessionProfile();
  if (session.role !== "admin" && session.role !== "super_admin") {
    redirect("/");
  }
  const assistants = await getServerAiAssistants();

  return (
    <AppShell session={session} activeHref="/ai-assistants">
      <AiAssistantsPage initialAssistants={assistants} />
    </AppShell>
  );
}
