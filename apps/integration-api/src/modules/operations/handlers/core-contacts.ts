import type { Request, Response } from "express";

import { normalizeContactsListFilters } from "../../../../../../packages/domain/src/contacts";
import { listContacts } from "../../../../../../src/services/contacts.service";
import { syncContactsBulk, syncSingleContact } from "../../../../../../src/services/contacts-sync.service";

function parseBooleanLike(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  const lowered = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!lowered) return fallback;
  if (lowered === "1" || lowered === "true" || lowered === "yes" || lowered === "on") return true;
  if (lowered === "0" || lowered === "false" || lowered === "no" || lowered === "off") return false;
  return fallback;
}

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
      force: true,
    });
    return res.json(result);
  } catch (error) {
    const message = (error as { message?: string })?.message || "Sync failed";
    return res.status(500).json({ error: message });
  }
}

export async function syncContactsBulkHandler(req: Request, res: Response) {
  try {
    const {
      direction,
      source,
      target,
      limit,
      from,
      to,
      createInDestination,
      createInAlegra,
      createInShopify,
      directions,
      shopDomain,
    } = req.body || {};
    const wantsStream = String(req.query?.stream || "") === "1" || parseBooleanLike(req.body?.stream, false);
    if (!direction && !source && !directions) {
      return res.status(400).json({ error: "missing_direction" });
    }
    const parsedLimit = typeof limit === "number" ? limit : Number(limit || 0);
    const normalizedShopDomain = shopDomain ? String(shopDomain) : undefined;
    const normalizedFrom = typeof from === "string" ? from : undefined;
    const normalizedTo = typeof to === "string" ? to : undefined;
    const normalizedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    const isBidirectional =
      direction === "bidirectional" || (directions && (directions.shopifyToAlegra || directions.alegraToShopify));

    const phases: Array<{
      direction: "shopify_to_alegra" | "alegra_to_shopify";
      directionLabel: string;
      createInDestination?: boolean;
    }> = [];

    if (isBidirectional) {
      const wantsShopifyToAlegra = parseBooleanLike(directions?.shopifyToAlegra, true);
      const wantsAlegraToShopify = parseBooleanLike(directions?.alegraToShopify, true);

      if (wantsShopifyToAlegra) {
        phases.push({
          direction: "shopify_to_alegra",
          directionLabel: "Shopify → Alegra",
          createInDestination:
            createInAlegra !== undefined
              ? parseBooleanLike(createInAlegra, false)
              : createInDestination !== undefined
                ? parseBooleanLike(createInDestination, false)
                : undefined,
        });
      }
      if (wantsAlegraToShopify) {
        phases.push({
          direction: "alegra_to_shopify",
          directionLabel: "Alegra → Shopify",
          createInDestination:
            createInShopify !== undefined
              ? parseBooleanLike(createInShopify, false)
              : createInDestination !== undefined
                ? parseBooleanLike(createInDestination, false)
                : undefined,
        });
      }
    } else {
      const resolvedDirection = direction === "alegra_to_shopify" ? "alegra_to_shopify" : "shopify_to_alegra";
      phases.push({
        direction: resolvedDirection,
        directionLabel: resolvedDirection === "alegra_to_shopify" ? "Alegra → Shopify" : "Shopify → Alegra",
        createInDestination: createInDestination !== undefined ? parseBooleanLike(createInDestination, false) : undefined,
      });
    }

    if (!phases.length) {
      return res.status(400).json({ error: "missing_direction" });
    }

    if (!wantsStream) {
      const results = [];
      for (const phase of phases) {
        const sourceResolved = phase.direction === "alegra_to_shopify" ? "alegra" : "shopify";
        const targetResolved = phase.direction === "alegra_to_shopify" ? "shopify" : "alegra";
        results.push(
          await syncContactsBulk({
            direction: phase.direction,
            source: sourceResolved,
            target: targetResolved,
            limit: normalizedLimit,
            from: normalizedFrom,
            to: normalizedTo,
            createInDestination: phase.createInDestination,
            shopDomain: normalizedShopDomain,
            force: true,
          })
        );
      }
      return res.json({ bidirectional: phases.length > 1, phases: results });
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
        // ignore write failures
      }
    };

    try {
      const startedAt = Date.now();
      write({ type: "start", startedAt, phaseTotal: phases.length });
      const phaseTotal = phases.length;
      const aggregates = { total: 0, processed: 0, synced: 0, skipped: 0, failed: 0 };
      const phaseResults = [];

      for (let index = 0; index < phases.length; index += 1) {
        const phaseIndex = index + 1;
        const phase = phases[index]!;
        const phaseStartedAt = Date.now();
        write({
          type: "phase_start",
          startedAt: phaseStartedAt,
          phaseIndex,
          phaseTotal,
          direction: phase.direction,
          directionLabel: phase.directionLabel,
        });

        const sourceResolved = phase.direction === "alegra_to_shopify" ? "alegra" : "shopify";
        const targetResolved = phase.direction === "alegra_to_shopify" ? "shopify" : "alegra";
        const result = await syncContactsBulk({
          direction: phase.direction,
          source: sourceResolved,
          target: targetResolved,
          limit: normalizedLimit,
          from: normalizedFrom,
          to: normalizedTo,
          createInDestination: phase.createInDestination,
          shopDomain: normalizedShopDomain,
          force: true,
          shouldAbort: () => closed,
          onProgress: (progress) => {
            write({
              type: "progress",
              phaseIndex,
              phaseTotal,
              direction: phase.direction,
              directionLabel: phase.directionLabel,
              ...progress,
            });
          },
        });

        phaseResults.push({ ...result, direction: phase.direction, directionLabel: phase.directionLabel });
        write({
          type: "phase_complete",
          phaseIndex,
          phaseTotal,
          direction: phase.direction,
          directionLabel: phase.directionLabel,
          ...result,
        });

        const numeric = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
        aggregates.processed += numeric((result as { processed?: unknown }).processed);
        aggregates.synced += numeric((result as { synced?: unknown }).synced);
        aggregates.skipped += numeric((result as { skipped?: unknown }).skipped);
        aggregates.failed += numeric((result as { failed?: unknown }).failed);
        aggregates.total += numeric((result as { total?: unknown }).total);
      }

      write({ type: "complete", ...aggregates, phases: phaseResults });
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
    const result = await listContacts(normalizeContactsListFilters(req.query || {}));
    return res.json(result);
  } catch (error) {
    const message = (error as { message?: string })?.message || "List failed";
    return res.status(500).json({ error: message });
  }
}
