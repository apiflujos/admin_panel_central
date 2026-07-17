"use client";

import { useState } from "react";

import { publishProductToShopify } from "../lib/api";

/**
 * One-by-one "Publicar" action for a single Alegra product. Renders in the
 * products table for variants that are not yet matched to Shopify. Shows a
 * loading state and surfaces the backend result/error inline.
 */
export function ProductPublishButton({ alegraItemId }: { alegraItemId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  if (!alegraItemId) {
    return <span>—</span>;
  }

  async function publish() {
    setLoading(true);
    setNote(null);
    try {
      const result = await publishProductToShopify({ alegraId: alegraItemId as string });
      const shopifyId = result.shopify && (result.shopify.id as string | number | undefined);
      setNote({ tone: "ok", text: shopifyId ? `Publicado · #${shopifyId}` : "Publicado" });
    } catch (error) {
      setNote({ tone: "error", text: error instanceof Error ? error.message : "No se pudo publicar." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="product-publish-cell">
      <button
        className="btn primary btn-compact"
        type="button"
        disabled={loading}
        onClick={() => void publish()}
      >
        {loading ? "Publicando…" : "Publicar"}
      </button>
      {note ? (
        <small className={`product-publish-note ${note.tone === "error" ? "is-error" : "is-ok"}`} role="status">
          {note.text}
        </small>
      ) : null}
    </span>
  );
}
