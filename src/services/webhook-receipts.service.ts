import { getOrgId, getPool } from "../db";

export type WebhookReceiptInput = {
  source: "shopify" | "alegra";
  webhookId: string;
  topic?: string;
  shopDomain?: string;
};

/**
 * Records a webhook delivery atomically. Returns false if a receipt with the
 * same (org, source, webhookId) already exists — caller should treat this as a
 * duplicate redelivery and ack without re-processing.
 */
export async function recordWebhookReceipt(input: WebhookReceiptInput): Promise<boolean> {
  const webhookId = String(input.webhookId || "").trim();
  if (!webhookId) {
    return true;
  }
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query(
    `
    INSERT INTO webhook_receipts (organization_id, source, webhook_id, topic, shop_domain)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (organization_id, source, webhook_id) DO NOTHING
    RETURNING id
    `,
    [orgId, input.source, webhookId, input.topic || null, input.shopDomain || null]
  );
  return result.rows.length > 0;
}
