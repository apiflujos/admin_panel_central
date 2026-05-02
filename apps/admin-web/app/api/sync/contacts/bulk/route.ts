import { NextResponse } from "next/server";

import { syncContactsBulk } from "../../../../../../../src/services/contacts-sync.service";
import { routeHandler } from "../../../../../lib/route-handler";

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

export const POST = routeHandler(async (req: Request) => {
  try {
    const searchParams = new URL(req.url).searchParams;
    const body = (await req.json()) as Record<string, any>;
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
    } = body || {};
    const wantsStream = String(searchParams.get("stream") || "") === "1" || parseBooleanLike(body?.stream, false);
    if (!direction && !source && !directions) {
      return NextResponse.json({ error: "missing_direction" }, { status: 400 });
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
      return NextResponse.json({ error: "missing_direction" }, { status: 400 });
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
      return NextResponse.json({ bidirectional: phases.length > 1, phases: results });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const write = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
        };

        const run = async () => {
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
                shouldAbort: () => req.signal.aborted,
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
            if (req.signal.aborted) {
              controller.close();
              return;
            }
            if (code === "canceled") {
              write({ type: "canceled" });
            } else {
              const message = (error as { message?: string })?.message || "Sync failed";
              write({ type: "error", error: message });
            }
          }
          controller.close();
        };

        void run();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = (error as { message?: string })?.message || "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
