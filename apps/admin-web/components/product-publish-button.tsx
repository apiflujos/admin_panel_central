"use client";

import { useState } from "react";

import { publishProductToShopify, unpublishProductFromShopify } from "../lib/api";

/**
 * One-by-one publish / unpublish action for a single product row.
 * - If the product is not yet in Shopify (no shopifyProductId): shows "Publicar".
 * - If it is in Shopify: shows "Despublicar" (sets the Shopify product to draft).
 */
export function ProductPublishButton({
  alegraItemId,
  shopifyProductId = null,
}: {
  alegraItemId: string | null;
  shopifyProductId?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [published, setPublished] = useState<boolean>(Boolean(shopifyProductId));

  if (!alegraItemId && !shopifyProductId) {
    return <span>—</span>;
  }

  async function publish() {
    if (!alegraItemId) return;
    setLoading(true);
    setNote(null);
    try {
      const result = await publishProductToShopify({ alegraId: alegraItemId });
      const shopifyId = result.shopify && (result.shopify.id as string | number | undefined);
      setPublished(true);
      setNote({ tone: "ok", text: shopifyId ? `Publicado · #${shopifyId}` : "Publicado" });
    } catch (error) {
      setNote({ tone: "error", text: error instanceof Error ? error.message : "No se pudo publicar." });
    } finally {
      setLoading(false);
    }
  }

  async function unpublish() {
    if (!shopifyProductId) return;
    setLoading(true);
    setNote(null);
    try {
      await unpublishProductFromShopify({ shopifyProductId });
      setPublished(false);
      setNote({ tone: "ok", text: "Despublicado" });
    } catch (error) {
      setNote({ tone: "error", text: error instanceof Error ? error.message : "No se pudo despublicar." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="product-publish-cell">
      {published ? (
        <button className="btn ghost btn-compact" type="button" disabled={loading} onClick={() => void unpublish()}>
          {loading ? "Despublicando…" : "Despublicar"}
        </button>
      ) : (
        <button
          className="btn primary btn-compact"
          type="button"
          disabled={loading || !alegraItemId}
          onClick={() => void publish()}
        >
          {loading ? "Publicando…" : "Publicar"}
        </button>
      )}
      {note ? (
        <small className={`product-publish-note ${note.tone === "error" ? "is-error" : "is-ok"}`} role="status">
          {note.text}
        </small>
      ) : null}
    </span>
  );
}
