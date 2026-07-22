import type { Request, Response } from "express";

import { importAlegraContactsForStore } from "../services/alegra-contact-import.service";
import { importAlegraInvoicesForStore, listAlegraInvoices } from "../services/alegra-invoice-import.service";
import { importAlegraProductsForStore } from "../services/alegra-product-import.service";
import { createSyncLog } from "../services/logs.service";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

let activeImportCanceled = false;
let activeContactsImportCanceled = false;
let activeInvoicesImportCanceled = false;

export async function stopAlegraInvoicesImportHandler(_req: Request, res: Response) {
  activeInvoicesImportCanceled = true;
  res.status(200).json({ ok: true });
}

export async function listAlegraInvoicesHandler(req: Request, res: Response) {
  try {
    const storeId = req.query.storeId ? Number(req.query.storeId) : undefined;
    const result = await listAlegraInvoices({
      storeId: Number.isFinite(storeId) ? storeId : undefined,
      query: typeof req.query.query === "string" ? req.query.query : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
}

export async function importAlegraInvoicesHandler(req: Request, res: Response) {
  const body = (req.body || {}) as { storeId?: number | string; stream?: boolean };
  const storeId = Number(body.storeId);
  const stream = body.stream === true || req.query.stream === "1" || req.query.stream === "true";

  let streamOpen = stream;
  const send = (payload: Record<string, unknown>) => {
    if (!streamOpen || res.writableEnded || res.destroyed) return;
    try {
      res.write(`${JSON.stringify(payload)}\n`);
    } catch {
      streamOpen = false;
    }
  };

  if (!Number.isFinite(storeId) || storeId <= 0) {
    res.status(400).json({ error: "storeId requerido" });
    return;
  }

  activeInvoicesImportCanceled = false;

  try {
    if (stream) {
      res.status(200);
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      res.on("close", () => {
        streamOpen = false;
      });
    }

    const result = await importAlegraInvoicesForStore(
      storeId,
      {},
      (event) => send(event as unknown as Record<string, unknown>),
      () => activeInvoicesImportCanceled
    );

    await createSyncLog({
      entity: "invoices_import_alegra",
      direction: "shopify->alegra",
      status: "success",
      message: `Importación Alegra: ${result.processed} facturas`,
      request: { storeId },
      response: result as unknown as Record<string, unknown>,
    });

    if (stream) {
      res.end();
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "invoices_import_alegra",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
    if (stream) {
      send({ type: "error", error: message });
      res.end();
    } else {
      res.status(400).json({ error: message });
    }
  }
}

export async function stopAlegraProductsImportHandler(_req: Request, res: Response) {
  activeImportCanceled = true;
  res.status(200).json({ ok: true });
}

export async function stopAlegraContactsImportHandler(_req: Request, res: Response) {
  activeContactsImportCanceled = true;
  res.status(200).json({ ok: true });
}

export async function importAlegraContactsHandler(req: Request, res: Response) {
  const body = (req.body || {}) as {
    storeId?: number | string;
    onlyClients?: boolean;
    stream?: boolean;
  };
  const storeId = Number(body.storeId);
  const stream = body.stream === true || req.query.stream === "1" || req.query.stream === "true";

  let streamOpen = stream;
  const send = (payload: Record<string, unknown>) => {
    if (!streamOpen || res.writableEnded || res.destroyed) return;
    try {
      res.write(`${JSON.stringify(payload)}\n`);
    } catch {
      streamOpen = false;
    }
  };

  if (!Number.isFinite(storeId) || storeId <= 0) {
    res.status(400).json({ error: "storeId requerido" });
    return;
  }

  activeContactsImportCanceled = false;

  try {
    if (stream) {
      res.status(200);
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      res.on("close", () => {
        streamOpen = false;
      });
    }

    const result = await importAlegraContactsForStore(
      storeId,
      { onlyClients: body.onlyClients === true },
      (event) => send(event as unknown as Record<string, unknown>),
      () => activeContactsImportCanceled
    );

    await createSyncLog({
      entity: "contacts_import_alegra",
      direction: "shopify->alegra",
      status: "success",
      message: `Importación Alegra: ${result.processed} contactos`,
      request: { storeId, onlyClients: body.onlyClients === true },
      response: result as unknown as Record<string, unknown>,
    });

    if (stream) {
      res.end();
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "contacts_import_alegra",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
    if (stream) {
      send({ type: "error", error: message });
      res.end();
    } else {
      res.status(400).json({ error: message });
    }
  }
}

export async function importAlegraProductsHandler(req: Request, res: Response) {
  const body = (req.body || {}) as {
    storeId?: number | string;
    onlyActive?: boolean;
    onlyWithImages?: boolean;
    stream?: boolean;
  };
  const storeId = Number(body.storeId);
  const stream = body.stream === true || req.query.stream === "1" || req.query.stream === "true";

  let streamOpen = stream;
  const send = (payload: Record<string, unknown>) => {
    if (!streamOpen || res.writableEnded || res.destroyed) return;
    try {
      res.write(`${JSON.stringify(payload)}\n`);
    } catch {
      streamOpen = false;
    }
  };

  if (!Number.isFinite(storeId) || storeId <= 0) {
    res.status(400).json({ error: "storeId requerido" });
    return;
  }

  activeImportCanceled = false;

  try {
    if (stream) {
      res.status(200);
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      res.on("close", () => {
        streamOpen = false;
      });
    }

    const result = await importAlegraProductsForStore(
      storeId,
      { onlyActive: body.onlyActive !== false, onlyWithImages: body.onlyWithImages === true },
      (event) => send(event as unknown as Record<string, unknown>),
      () => activeImportCanceled
    );

    await createSyncLog({
      entity: "products_import_alegra",
      direction: "shopify->alegra",
      status: "success",
      message: `Importación Alegra: ${result.processed} productos`,
      request: { storeId, onlyActive: body.onlyActive !== false, onlyWithImages: body.onlyWithImages === true },
      response: result as unknown as Record<string, unknown>,
    });

    if (stream) {
      res.end();
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "products_import_alegra",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
    if (stream) {
      send({ type: "error", error: message });
      res.end();
    } else {
      res.status(400).json({ error: message });
    }
  }
}
