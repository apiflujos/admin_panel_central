import { AppShell } from "../../components/app-shell";
import { ProfilePage } from "../../components/profile-page";
import { getServerProfile, requireServerSessionProfile } from "../../lib/server-api";

export default async function ProfileRoutePage() {
  const session = await requireServerSessionProfile();
  const profile = await getServerProfile();

  return (
    <AppShell session={session} activeHref="/profile">
      <ProfilePage initialProfile={profile} />
    </AppShell>
  );
}
