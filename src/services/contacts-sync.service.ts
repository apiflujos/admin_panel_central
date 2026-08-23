import { buildSyncContext } from "./sync-context";
import { resolveStoreConfig } from "./store-config.service";
import { getMappingByAlegraId, getMappingByShopifyId, saveMapping } from "./mapping.service";
import { upsertContact } from "./contacts.service";
import type { ShopifyCustomer } from "../connectors/shopify";

type SyncSource = "shopify" | "alegra";
type SyncDirection = "shopify_to_alegra" | "alegra_to_shopify";

type ContactRecord = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  doc?: string;
  address?: string;
};

type AlegraContact = {
  id?: string | number;
  name?: string;
  email?: string;
  phonePrimary?: string;
  identification?: string;
  address?: string;
  dateCreated?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  date?: string;
};

type ShopifyCustomerInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  note?: string;
  addresses?: Array<{ address1: string }>;
};

const isEmail = (value: string) => value.includes("@");

const normalizePhone = (value?: string) => (value ? value.replace(/[^\d+]/g, "").trim() : "");

const normalizeDocument = (value?: string) =>
  value
    ? value
        .replace(/[^\da-zA-Z]/g, "")
        .trim()
        .toUpperCase()
    : "";

const extractDocumentFromShopifyNote = (value?: string | null) => {
  const note = String(value || "").trim();
  if (!note) return "";
  const match = note.match(/(?:^|\b)DOC:\s*([A-Z0-9.-]+)/i);
  return normalizeDocument(match?.[1] || "");
};

const normalizeIsoDate = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  // Expected input: YYYY-MM-DD (from <input type="date">).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return raw;
};

const parseIsoDay = (value?: string) => {
  const iso = normalizeIsoDate(value);
  if (!iso) return null;
  const parsed = Date.parse(`${iso}T00:00:00.000Z`);
  return Number.isNaN(parsed) ? null : new Date(parsed);
};

const normalizeMatchPriority = (value: string[] | undefined) => {
  const fallback = ["document", "phone", "email"];
  const allowed = new Set(["document", "phone", "email"]);
  const list = Array.isArray(value) ? value : fallback;
  const cleaned = list.map((item) => item.toLowerCase()).filter((item) => allowed.has(item));
  return cleaned.length ? cleaned : fallback;
};

const splitName = (name?: string) => {
  const full = (name || "").trim();
  if (!full) return { firstName: "", lastName: "" };
  const parts = full.split(/\s+/);
  return { firstName: parts[0] || full, lastName: parts.slice(1).join(" ") };
};

function normalizeShopifyCustomer(customer: ShopifyCustomer): ContactRecord {
  const address = customer.defaultAddress;
  return {
    id: customer.id,
    name: [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim(),
    email: customer.email || undefined,
    phone: normalizePhone(customer.phone || ""),
    doc: extractDocumentFromShopifyNote(customer.note),
    address: address?.address1 || undefined,
  };
}

function normalizeAlegraContact(contact: AlegraContact): ContactRecord {
  const address = typeof contact.address === "string" ? contact.address : undefined;
  const name = contact.name ? String(contact.name) : "";
  return {
    id: contact.id ? String(contact.id) : undefined,
    name: name || undefined,
    email: contact.email ? String(contact.email) : undefined,
    phone: normalizePhone(contact.phonePrimary ? String(contact.phonePrimary) : ""),
    doc: normalizeDocument(contact.identification ? String(contact.identification) : ""),
    address: address || undefined,
  };
}

async function findAlegraContactByPriority(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  contact: ContactRecord,
  priority: string[]
) {
  const email = contact.email || "";
  const phone = normalizePhone(contact.phone || "");
  const doc = contact.doc || "";

  for (const key of priority) {
    if (key === "email" && email) {
      const found = (await ctx.alegra.findContactByEmail(email)) as Array<Record<string, unknown>>;
      const typedFound = found as AlegraContact[];
      if (typedFound && typedFound.length) return typedFound[0];
    }
    if (key === "phone" && phone) {
      const found = await scanAlegraContacts(ctx, (item) => {
        const rawPhone = item.phonePrimary ? String(item.phonePrimary) : "";
        return normalizePhone(rawPhone) === phone;
      });
      if (found) return found;
    }
    if (key === "document" && doc) {
      const found = await scanAlegraContacts(ctx, (item) => {
        const identification = normalizeDocument(item.identification ? String(item.identification) : "");
        return identification === doc;
      });
      if (found) return found;
    }
  }
  return null;
}

async function scanAlegraContacts(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  predicate: (contact: AlegraContact) => boolean
) {
  const limit = 50;
  const maxPages = 40; // 2000 contactos máximo
  let start = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const data = (await ctx.alegra.listContacts({ limit, start })) as AlegraContact[];
    if (!Array.isArray(data) || !data.length) return null;
    const match = data.find((item) => predicate(item));
    if (match) return match;
    if (data.length < limit) break;
    start += limit;
  }
  return null;
}

async function findShopifyCustomerByPriority(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  contact: ContactRecord,
  priority: string[]
) {
  const email = contact.email || "";
  const phone = normalizePhone(contact.phone || "");
  const doc = normalizeDocument(contact.doc || "");
  for (const key of priority) {
    if (key === "email" && email) {
      const matches = await ctx.shopify.searchCustomers(`email:${email}`);
      if (matches.length) return matches[0];
    }
    if (key === "phone" && phone) {
      const matches = await ctx.shopify.searchCustomers(`phone:${phone}`);
      if (matches.length) return matches[0];
    }
    if (key === "document" && doc) {
      const customers = await ctx.shopify.listAllCustomers(500);
      const matched = customers.find((customer) => extractDocumentFromShopifyNote(customer.note) === doc);
      if (matched) return matched;
    }
  }
  return null;
}

async function findShopifyCustomerByIdentifier(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  identifier: string,
  priority: string[]
) {
  const rawIdentifier = identifier.trim();
  if (!rawIdentifier) return null;
  if (rawIdentifier.startsWith("gid://")) {
    const data = await ctx.shopify.getCustomerById(rawIdentifier);
    return data?.customer || null;
  }
  if (isEmail(rawIdentifier)) {
    const matches = await ctx.shopify.searchCustomers(`email:${rawIdentifier}`);
    return matches[0] || null;
  }
  if (/^\d+$/.test(rawIdentifier)) {
    const gid = `gid://shopify/Customer/${rawIdentifier}`;
    try {
      const data = await ctx.shopify.getCustomerById(gid);
      if (data?.customer) {
        return data.customer;
      }
    } catch {
      // Fallback to manual match priority below.
    }
  }
  return findShopifyCustomerByPriority(
    ctx,
    {
      phone: rawIdentifier,
      doc: rawIdentifier,
    },
    priority
  );
}

async function findAlegraContactByIdentifier(ctx: Awaited<ReturnType<typeof buildSyncContext>>, identifier: string) {
  const rawIdentifier = identifier.trim();
  if (!rawIdentifier) return null;
  if (isEmail(rawIdentifier)) {
    const matches = (await ctx.alegra.findContactByEmail(rawIdentifier)) as AlegraContact[];
    return matches[0] || null;
  }
  if (/^\d+$/.test(rawIdentifier)) {
    try {
      const byId = (await ctx.alegra.getContact(rawIdentifier)) as AlegraContact | null;
      if (byId?.id) {
        return byId;
      }
    } catch {
      // Fallback to phone/document scan below.
    }
  }
  return scanAlegraContacts(ctx, (item) => {
    const phone = normalizePhone(item.phonePrimary ? String(item.phonePrimary) : "");
    const doc = normalizeDocument(item.identification ? String(item.identification) : "");
    const normalizedIdentifier = normalizeDocument(rawIdentifier);
    return phone === rawIdentifier || doc === normalizedIdentifier;
  });
}

async function syncShopifyCustomerToAlegra(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  contact: ShopifyCustomer,
  matchPriority: string[],
  options: { createInAlegra?: boolean } = {}
) {
  const createInAlegra = options.createInAlegra !== false;
  const normalized = normalizeShopifyCustomer(contact);
  if (!normalized.email && !normalized.phone && !normalized.doc) {
    return { skipped: true, reason: "missing_contact_data" };
  }

  const existingMapping = normalized.id ? await getMappingByShopifyId("contact", normalized.id) : null;
  let alegraContactId = existingMapping?.alegraId || "";

  if (!alegraContactId) {
    const matched = await findAlegraContactByPriority(ctx, normalized, matchPriority);
    if (matched?.id) {
      alegraContactId = String(matched.id);
    }
  }

  const payload = {
    name: normalized.name || normalized.email || "Cliente",
    email: normalized.email || undefined,
    phonePrimary: normalized.phone || undefined,
    address: normalized.address || undefined,
    identification: normalized.doc || undefined,
  };

  if (alegraContactId) {
    await ctx.alegra.updateContact(alegraContactId, payload);
  } else {
    if (!createInAlegra) {
      await upsertContact({
        shopDomain: ctx.shopDomain,
        shopifyId: normalized.id,
        name: normalized.name,
        email: normalized.email,
        phone: normalized.phone,
        doc: normalized.doc,
        address: normalized.address,
        source: "shopify",
      });
      return { skipped: true, reason: "create_disabled" };
    }
    const created = (await ctx.alegra.createContact(payload)) as { id?: string | number };
    alegraContactId = created?.id ? String(created.id) : "";
  }

  if (normalized.id && alegraContactId) {
    await saveMapping({
      entity: "contact",
      shopifyId: normalized.id,
      alegraId: alegraContactId,
    });
  }

  await upsertContact({
    shopDomain: ctx.shopDomain,
    shopifyId: normalized.id,
    alegraId: alegraContactId,
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    doc: normalized.doc,
    address: normalized.address,
    source: "shopify",
  });

  return { synced: true, alegraContactId };
}

async function syncAlegraContactToShopify(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  contact: AlegraContact,
  matchPriority: string[],
  options: { createInShopify?: boolean } = {}
) {
  const createInShopify = options.createInShopify !== false;
  const normalized = normalizeAlegraContact(contact);
  if (!normalized.email && !normalized.phone && !normalized.doc) {
    return { skipped: true, reason: "missing_contact_data" };
  }

  const existingMapping = normalized.id ? await getMappingByAlegraId("contact", normalized.id) : null;
  let shopifyCustomerId = existingMapping?.shopifyId || "";

  if (!shopifyCustomerId) {
    const matched = await findShopifyCustomerByPriority(ctx, normalized, matchPriority);
    if (matched?.id) {
      shopifyCustomerId = matched.id;
    }
  }

  const nameParts = splitName(normalized.name);
  const payload: ShopifyCustomerInput = {
    firstName: nameParts.firstName || undefined,
    lastName: nameParts.lastName || undefined,
    email: normalized.email || undefined,
    phone: normalized.phone || undefined,
    note: normalized.doc ? `DOC:${normalized.doc}` : undefined,
  };

  if (normalized.address) {
    payload.addresses = [
      {
        address1: normalized.address,
      },
    ];
  }

  if (shopifyCustomerId) {
    await ctx.shopify.updateCustomer(shopifyCustomerId, payload);
  } else {
    if (!createInShopify) {
      await upsertContact({
        shopDomain: ctx.shopDomain,
        alegraId: normalized.id,
        name: normalized.name,
        email: normalized.email,
        phone: normalized.phone,
        doc: normalized.doc,
        address: normalized.address,
        source: "alegra",
      });
      return { skipped: true, reason: "create_disabled" };
    }
    const created = await ctx.shopify.createCustomer(payload);
    shopifyCustomerId = created?.id || "";
  }

  if (normalized.id && shopifyCustomerId) {
    await saveMapping({
      entity: "contact",
      shopifyId: shopifyCustomerId,
      alegraId: normalized.id,
    });
  }

  await upsertContact({
    shopDomain: ctx.shopDomain,
    shopifyId: shopifyCustomerId,
    alegraId: normalized.id,
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    doc: normalized.doc,
    address: normalized.address,
    source: "alegra",
  });

  return { synced: true, shopifyCustomerId };
}

export async function syncSingleContact(options: {
  source: SyncSource;
  identifier: string;
  shopDomain?: string;
  force?: boolean;
}) {
  const ctx = await buildSyncContext(options.shopDomain);
  const storeConfig = await resolveStoreConfig(options.shopDomain || null);
  const priority = normalizeMatchPriority(storeConfig.contactMatchPriority);
  const force = options.force === true;

  if (options.source === "shopify") {
    if (!force && !storeConfig.syncContactsFromShopify) {
      return { skipped: true, reason: "sync_disabled" };
    }
    const identifier = options.identifier.trim();
    const customer = await findShopifyCustomerByIdentifier(ctx, identifier, priority);
    if (!customer) {
      return { skipped: true, reason: "not_found" };
    }
    return syncShopifyCustomerToAlegra(ctx, customer, priority, {
      createInAlegra: storeConfig.syncContactsCreateInAlegra,
    });
  }

  if (!force && !storeConfig.syncContactsFromAlegra) {
    return { skipped: true, reason: "sync_disabled" };
  }
  const identifier = options.identifier.trim();
  const alegraContact = await findAlegraContactByIdentifier(ctx, identifier);
  if (!alegraContact) {
    return { skipped: true, reason: "not_found" };
  }
  return syncAlegraContactToShopify(ctx, alegraContact, priority, {
    createInShopify: storeConfig.syncContactsCreateInShopify,
  });
}

export async function syncContactsBulk(options: {
  direction?: SyncDirection;
  source?: SyncSource;
  target?: SyncSource;
  limit?: number;
  from?: string;
  to?: string;
  createInDestination?: boolean;
  shopDomain?: string;
  force?: boolean;
  onProgress?: (payload: {
    total: number | null;
    processed: number;
    synced: number;
    skipped: number;
    failed: number;
    last?: { label?: string };
  }) => void;
  shouldAbort?: () => boolean;
}) {
  const ctx = await buildSyncContext(options.shopDomain);
  const storeConfig = await resolveStoreConfig(options.shopDomain || null);
  const priority = normalizeMatchPriority(storeConfig.contactMatchPriority);
  const limit = typeof options.limit === "number" && options.limit > 0 ? options.limit : 200;
  const force = options.force === true;

  const direction: SyncDirection =
    options.direction === "alegra_to_shopify"
      ? "alegra_to_shopify"
      : options.source === "alegra"
        ? "alegra_to_shopify"
        : "shopify_to_alegra";

  const from = normalizeIsoDate(options.from);
  const to = normalizeIsoDate(options.to);
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const shouldAbort = typeof options.shouldAbort === "function" ? options.shouldAbort : null;
  const counters = {
    total: direction === "alegra_to_shopify" ? limit : null,
    processed: 0,
    synced: 0,
    skipped: 0,
    failed: 0,
  };
  const emit = (lastLabel?: string) => {
    if (!onProgress) return;
    onProgress({
      total: typeof counters.total === "number" ? counters.total : null,
      processed: counters.processed,
      synced: counters.synced,
      skipped: counters.skipped,
      failed: counters.failed,
      last: lastLabel ? { label: lastLabel } : undefined,
    });
  };
  const maybeAbort = () => {
    if (shouldAbort && shouldAbort()) {
      const error = new Error("canceled");
      (error as { code?: string }).code = "canceled";
      throw error;
    }
  };

  if (direction === "shopify_to_alegra") {
    if (!force && !storeConfig.syncContactsFromShopify) {
      return { skipped: true, reason: "sync_disabled" };
    }
    const createInAlegra =
      typeof options.createInDestination === "boolean"
        ? options.createInDestination
        : storeConfig.syncContactsCreateInAlegra;
    const queryParts = [];
    if (from) queryParts.push(`created_at:>='${from}'`);
    if (to) queryParts.push(`created_at:<='${to}'`);
    const query = queryParts.join(" ").trim();
    const customers = query
      ? await ctx.shopify.listAllCustomersByQuery(query, limit)
      : await ctx.shopify.listAllCustomers(limit);
    counters.total = customers.length;
    emit();
    for (const customer of customers) {
      maybeAbort();
      const label = customer.email || customer.phone || customer.id || "";
      try {
        const result = await syncShopifyCustomerToAlegra(ctx, customer, priority, { createInAlegra });
        counters.processed += 1;
        if (result?.synced) counters.synced += 1;
        if (result?.skipped) counters.skipped += 1;
      } catch {
        counters.processed += 1;
        counters.failed += 1;
      }
      emit(label);
    }
    return {
      total: counters.total,
      processed: counters.processed,
      synced: counters.synced,
      skipped: counters.skipped,
      failed: counters.failed,
    };
  }

  if (!storeConfig.syncContactsFromAlegra) {
    if (force) {
      // continue
    } else {
      return { skipped: true, reason: "sync_disabled" };
    }
  }
  const createInShopify =
    typeof options.createInDestination === "boolean"
      ? options.createInDestination
      : storeConfig.syncContactsCreateInShopify;
  const pageSize = 50;
  let start = 0;
  let remaining = limit;
  const fromDate = parseIsoDay(from);
  const toDate = parseIsoDay(to);
  const resolveAlegraTimestamp = (item: AlegraContact) => {
    const candidates = [item.dateCreated, item.createdAt, item.created_at, item.updatedAt, item.updated_at, item.date];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const parsed = Date.parse(String(candidate));
      if (!Number.isNaN(parsed)) return new Date(parsed);
    }
    return null;
  };
  const withinRange = (item: AlegraContact) => {
    if (!fromDate && !toDate) return true;
    const ts = resolveAlegraTimestamp(item);
    if (!ts) return true;
    if (fromDate && ts < fromDate) return false;
    if (toDate) {
      const end = new Date(toDate);
      end.setUTCDate(end.getUTCDate() + 1);
      if (ts >= end) return false;
    }
    return true;
  };
  emit();
  while (remaining > 0) {
    maybeAbort();
    const batch = (await ctx.alegra.listContacts({
      limit: Math.min(pageSize, remaining),
      start,
    })) as AlegraContact[];
    if (!Array.isArray(batch) || !batch.length) break;
    for (const item of batch) {
      maybeAbort();
      if (!withinRange(item)) continue;
      const label =
        (item.email ? String(item.email) : "") ||
        (item.phonePrimary ? String(item.phonePrimary) : "") ||
        (item.identification ? String(item.identification) : "") ||
        (item.id ? String(item.id) : "");
      try {
        const result = await syncAlegraContactToShopify(ctx, item, priority, { createInShopify });
        counters.processed += 1;
        if (result?.synced) counters.synced += 1;
        if (result?.skipped) counters.skipped += 1;
      } catch {
        counters.processed += 1;
        counters.failed += 1;
      }
      emit(label);
    }
    if (batch.length < pageSize) break;
    start += pageSize;
    remaining -= pageSize;
  }
  // Para Alegra no siempre sabemos el total desde el inicio; reportamos el total real al final.
  counters.total = counters.processed;
  emit();
  return {
    total: counters.total,
    processed: counters.processed,
    synced: counters.synced,
    skipped: counters.skipped,
    failed: counters.failed,
  };
}
