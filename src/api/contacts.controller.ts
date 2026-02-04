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
    const { direction, source, target, limit, from, to, createInDestination, shopDomain } =
      req.body || {};
    const wantsStream = String(req.query?.stream || "") === "1" || req.body?.stream === true;
    if (!direction && !source) {
      return res.status(400).json({ error: "missing_direction" });
    }
    const parsedLimit = typeof limit === "number" ? limit : Number(limit || 0);
    const payload = {
      direction:
        direction === "alegra_to_shopify" ? "alegra_to_shopify" : "shopify_to_alegra",
      source: source === "alegra" ? "alegra" : "shopify",
      target: target === "shopify" ? "shopify" : "alegra",
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined,
      from: typeof from === "string" ? from : undefined,
      to: typeof to === "string" ? to : undefined,
      createInDestination: typeof createInDestination === "boolean" ? createInDestination : undefined,
      shopDomain: shopDomain ? String(shopDomain) : undefined,
    } as const;

    if (!wantsStream) {
      const result = await syncContactsBulk(payload);
      return res.json(result);
    }

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    let closed = false;
    req.on("close", () => {
      closed = true;
    });

    const write = (data: Record<string, unknown>) => {
      if (closed || res.writableEnded) return;
      try {
        res.write(`${JSON.stringify(data)}\n`);
      } catch {
        // ignore write failures (connection might be closing)
      }
    };

    const startedAt = Date.now();
    write({ type: "start", startedAt });

    try {
      const result = await syncContactsBulk({
        ...payload,
        shouldAbort: () => closed,
        onProgress: (progress) => {
          write({ type: "progress", ...progress });
        },
      });
      write({ type: "complete", ...result });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (closed) {
        return res.end();
      }
      if (code === "canceled") {
        write({ type: "canceled" });
      } else {
        const message = (error as { message?: string })?.message || "Sync failed";
        write({ type: "error", error: message });
      }
    }
    return res.end();
  } catch (error) {
    const message = (error as { message?: string })?.message || "Sync failed";
    return res.status(500).json({ error: message });
  }
}

export async function listContactsHandler(req: Request, res: Response) {
  try {
    const { query, status, source, from, to, limit, offset, shopDomain } = req.query;
    const result = await listContacts({
      shopDomain: typeof shopDomain === "string" ? shopDomain : undefined,
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
