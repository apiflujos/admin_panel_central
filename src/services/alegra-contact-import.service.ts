import { AlegraClient } from "../connectors/alegra";
import { upsertContact } from "./contacts.service";
import { resolveAlegraClientForStore } from "./alegra-product-import.service";

/**
 * Import contacts directly from Alegra into the local `contacts` table, scoped to
 * a store by `store_id` (via `alegra_accounts`). Does NOT require Shopify.
 */

type AlegraContact = {
  id: string | number;
  name?: string | { firstName?: string; lastName?: string } | null;
  identification?: string | number | { number?: string } | null;
  email?: string | null;
  phonePrimary?: string | null;
  phoneSecondary?: string | null;
  mobile?: string | null;
  address?: { address?: string } | string | null;
  type?: string[] | string | null;
};

export type ContactImportOptions = {
  onlyClients?: boolean;
};

export type ContactImportEvent =
  | { type: "start" }
  | { type: "progress"; processed: number; failed: number; skipped: number; scanned: number }
  | { type: "done"; processed: number; failed: number; skipped: number; scanned: number }
  | { type: "error"; error: string };

const resolveName = (name: AlegraContact["name"]) => {
  if (!name) return null;
  if (typeof name === "string") return name;
  return [name.firstName, name.lastName].filter(Boolean).join(" ").trim() || null;
};

const resolveDoc = (identification: AlegraContact["identification"]) => {
  if (identification == null) return null;
  if (typeof identification === "object") return identification.number ? String(identification.number) : null;
  return String(identification);
};

const resolveAddress = (address: AlegraContact["address"]) => {
  if (!address) return null;
  if (typeof address === "string") return address;
  return address.address || null;
};

const isClient = (contact: AlegraContact) => {
  const type = contact.type;
  if (!type) return false;
  const arr = Array.isArray(type) ? type : [type];
  return arr.map((t) => String(t).toLowerCase()).includes("client");
};

export async function importAlegraContactsForStore(
  storeId: number,
  options: ContactImportOptions,
  onEvent?: (event: ContactImportEvent) => void,
  shouldCancel?: () => boolean
): Promise<{ processed: number; failed: number; skipped: number; scanned: number }> {
  const alegra: AlegraClient = await resolveAlegraClientForStore(storeId);
  const shopDomainKey = `alegra-store-${storeId}`;
  const pageSize = 30;
  let start = 0;
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  let scanned = 0;

  onEvent?.({ type: "start" });

  for (;;) {
    if (shouldCancel?.()) break;
    const batch = (await alegra.listContacts({ limit: pageSize, start })) as AlegraContact[] | null;
    const items = Array.isArray(batch) ? batch : [];
    if (!items.length) break;

    for (const contact of items) {
      if (shouldCancel?.()) break;
      scanned += 1;
      if (options.onlyClients && !isClient(contact)) {
        skipped += 1;
        continue;
      }
      try {
        await upsertContact({
          shopDomain: shopDomainKey,
          storeId,
          alegraId: contact.id,
          name: resolveName(contact.name),
          email: contact.email ?? null,
          phone: contact.phonePrimary ?? contact.mobile ?? contact.phoneSecondary ?? null,
          doc: resolveDoc(contact.identification),
          address: resolveAddress(contact.address),
          source: "alegra",
        });
        processed += 1;
      } catch {
        failed += 1;
      }
    }

    onEvent?.({ type: "progress", processed, failed, skipped, scanned });
    if (items.length < pageSize) break;
    start += pageSize;
  }

  const result = { processed, failed, skipped, scanned };
  onEvent?.({ type: "done", ...result });
  return result;
}
