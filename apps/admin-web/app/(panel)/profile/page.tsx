import { ProfilePage } from "../../../components/profile-page";
import { getServerProfile } from "../../../lib/server-api";

export default async function ProfileRoutePage() {
  const profile = await getServerProfile();

  return <ProfilePage initialProfile={profile} />;
}
