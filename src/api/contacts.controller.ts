import type { Request, Response } from "express";
import { syncContactsBulk, syncSingleContact } from "../services/contacts-sync.service";
import { listContacts } from "../services/contacts.service";

export async function syncContactHandler(req: Request, res: Response) {
  try {
    const { source, identifier, shopDomain } = req.body || {};
    if (!source || !identifier) {
      return res.status(400).json({ error: "missing_params" });
    }
    const result = await syncSingleContact({
      source: source === "alegra" ? "alegra" : "shopify",
      identifier: String(identifier),
      shopDomain: shopDomain ? String(shopDomain) : undefined,
    });
    return res.json(result);
  } catch (error) {
    const message = (error as { message?: string })?.message || "Sync failed";
    return res.status(500).json({ error: message });
  }
}

export async function syncContactsBulkHandler(req: Request, res: Response) {
  try {
    const { source, limit, shopDomain } = req.body || {};
    if (!source) {
      return res.status(400).json({ error: "missing_source" });
    }
    const parsedLimit = typeof limit === "number" ? limit : Number(limit || 0);
    const result = await syncContactsBulk({
      source: source === "alegra" ? "alegra" : "shopify",
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined,
      shopDomain: shopDomain ? String(shopDomain) : undefined,
    });
    return res.json(result);
  } catch (error) {
    const message = (error as { message?: string })?.message || "Sync failed";
    return res.status(500).json({ error: message });
  }
}

export async function listContactsHandler(req: Request, res: Response) {
  try {
    const { query, status, source, from, to, limit, offset } = req.query;
    const result = await listContacts({
      query: typeof query === "string" ? query : undefined,
      status: typeof status === "string" ? status : undefined,
      source: typeof source === "string" ? source : undefined,
      from: typeof from === "string" ? from : undefined,
      to: typeof to === "string" ? to : undefined,
      limit: typeof limit === "string" ? Number(limit) : undefined,
      offset: typeof offset === "string" ? Number(offset) : undefined,
    });
    return res.json(result);
  } catch (error) {
    const message = (error as { message?: string })?.message || "List failed";
    return res.status(500).json({ error: message });
  }
}
