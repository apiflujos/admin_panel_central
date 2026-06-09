import { getServerContactsCatalog } from "../lib/server-api";
import { ContactsPage } from "./contacts-page";

export async function ContactsPageContent({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const query = typeof params.query === "string" ? params.query : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const source = typeof params.source === "string" ? params.source : undefined;
  const offset = typeof params.offset === "string" ? Number(params.offset) : 0;
  const contacts = await getServerContactsCatalog({ query, status, source, offset, limit: 20 });
  return (
    <ContactsPage result={contacts} query={query ?? ""} status={status ?? ""} source={source ?? ""} offset={offset} />
  );
}
