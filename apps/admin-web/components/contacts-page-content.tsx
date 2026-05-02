import { getServerContactsCatalog } from "../lib/server-api";
import { ContactsPage } from "./contacts-page";

export async function ContactsPageContent() {
  const contacts = await getServerContactsCatalog();
  return <ContactsPage result={contacts} />;
}
