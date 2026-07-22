import { AlegraClient } from "../connectors/alegra";
import { getOrgId, getPool } from "../db";
import { resolveAlegraClientForStore } from "./alegra-product-import.service";

/**
 * Standalone catalog of Alegra invoices (table `alegra_invoices`), imported per
 * store by `store_id`. Independent of the Shopify order→invoice flow.
 */

type AlegraInvoice = {
  id: string | number;
  date?: string | null;
  dueDate?: string | null;
  status?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | Array<{ amount?: number }> | null;
  total?: number | string | null;
  balance?: number | string | null;
  client?: { name?: string | null; identification?: string | number | { number?: string } | null } | null;
  numberTemplate?: {
    fullNumber?: string | null;
    formattedNumber?: string | null;
    number?: string | null;
    isElectronic?: boolean | null;
  } | null;
};

export type InvoiceImportEvent =
  | { type: "start" }
  | { type: "progress"; processed: number; failed: number; skipped: number; scanned: number }
  | { type: "done"; processed: number; failed: number; skipped: number; scanned: number }
  | { type: "error"; error: string };

const num = (value: unknown): number | null => {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export async function importAlegraInvoicesForStore(
  storeId: number,
  _options: Record<string, unknown>,
  onEvent?: (event: InvoiceImportEvent) => void,
  shouldCancel?: () => boolean
): Promise<{ processed: number; failed: number; skipped: number; scanned: number }> {
  const alegra: AlegraClient = await resolveAlegraClientForStore(storeId);
  const pool = getPool();
  const orgId = getOrgId();
  const pageSize = 30;
  let start = 0;
  let processed = 0;
  let failed = 0;
  const skipped = 0;
  let scanned = 0;

  onEvent?.({ type: "start" });

  for (;;) {
    if (shouldCancel?.()) break;
    const batch = (await alegra.listInvoices({ limit: pageSize, start })) as AlegraInvoice[] | null;
    const items = Array.isArray(batch) ? batch : [];
    if (!items.length) break;

    for (const inv of items) {
      if (shouldCancel?.()) break;
      scanned += 1;
      try {
        const number =
          inv.numberTemplate?.fullNumber || inv.numberTemplate?.formattedNumber || inv.numberTemplate?.number || null;
        const clientName = inv.client?.name ? String(inv.client.name) : null;
        const clientId = inv.client?.identification;
        const identification =
          clientId == null
            ? null
            : typeof clientId === "object"
              ? clientId.number
                ? String(clientId.number)
                : null
              : String(clientId);
        const tax = Array.isArray(inv.tax)
          ? inv.tax.reduce((acc, t) => acc + (num(t.amount) || 0), 0)
          : num(inv.tax);
        await pool.query(
          `
          INSERT INTO alegra_invoices
            (organization_id, store_id, alegra_invoice_id, number, date, due_date, client_name, client_identification,
             status, is_electronic, subtotal, tax, total, balance, payload_json, updated_at)
          VALUES ($1,$2,$3,$4,$5::date,$6::date,$7,$8,$9,$10,$11::numeric,$12::numeric,$13::numeric,$14::numeric,$15::jsonb,NOW())
          ON CONFLICT (organization_id, store_id, alegra_invoice_id) DO UPDATE SET
            number = EXCLUDED.number,
            date = EXCLUDED.date,
            due_date = EXCLUDED.due_date,
            client_name = EXCLUDED.client_name,
            client_identification = EXCLUDED.client_identification,
            status = EXCLUDED.status,
            is_electronic = EXCLUDED.is_electronic,
            subtotal = EXCLUDED.subtotal,
            tax = EXCLUDED.tax,
            total = EXCLUDED.total,
            balance = EXCLUDED.balance,
            payload_json = EXCLUDED.payload_json,
            updated_at = NOW()
          `,
          [
            orgId,
            storeId,
            String(inv.id),
            number,
            inv.date || null,
            inv.dueDate || null,
            clientName,
            identification,
            inv.status || null,
            Boolean(inv.numberTemplate?.isElectronic),
            num(inv.subtotal),
            tax,
            num(inv.total),
            num(inv.balance),
            JSON.stringify(inv),
          ]
        );
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

export async function listAlegraInvoices(options: {
  storeId?: number;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  items: Array<{
    id: number;
    alegraInvoiceId: string;
    number: string | null;
    date: string | null;
    dueDate: string | null;
    clientName: string | null;
    clientIdentification: string | null;
    status: string | null;
    isElectronic: boolean;
    total: number | null;
    balance: number | null;
  }>;
  total: number;
}> {
  const pool = getPool();
  const orgId = getOrgId();
  const where: string[] = ["organization_id = $1"];
  const params: Array<string | number> = [orgId];
  let idx = 2;
  if (typeof options.storeId === "number" && Number.isFinite(options.storeId)) {
    where.push(`store_id = $${idx}`);
    params.push(options.storeId);
    idx += 1;
  }
  if (options.query) {
    where.push(`(number ILIKE $${idx} OR client_name ILIKE $${idx} OR client_identification ILIKE $${idx})`);
    params.push(`%${options.query}%`);
    idx += 1;
  }
  const limit = Number.isFinite(options.limit) && Number(options.limit) > 0 ? Number(options.limit) : 20;
  const offset = Number.isFinite(options.offset) && Number(options.offset) >= 0 ? Number(options.offset) : 0;
  const whereClause = `WHERE ${where.join(" AND ")}`;

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM alegra_invoices ${whereClause}`,
    params
  );
  const rowsResult = await pool.query(
    `SELECT id, alegra_invoice_id, number, date, due_date, client_name, client_identification, status,
            is_electronic, total, balance
     FROM alegra_invoices ${whereClause}
     ORDER BY date DESC NULLS LAST, id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    total: Number(countResult.rows[0]?.total || 0),
    items: rowsResult.rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      alegraInvoiceId: String(r.alegra_invoice_id),
      number: r.number ? String(r.number) : null,
      date: r.date ? new Date(String(r.date)).toISOString().slice(0, 10) : null,
      dueDate: r.due_date ? new Date(String(r.due_date)).toISOString().slice(0, 10) : null,
      clientName: r.client_name ? String(r.client_name) : null,
      clientIdentification: r.client_identification ? String(r.client_identification) : null,
      status: r.status ? String(r.status) : null,
      isElectronic: Boolean(r.is_electronic),
      total: r.total != null ? Number(r.total) : null,
      balance: r.balance != null ? Number(r.balance) : null,
    })),
  };
}
