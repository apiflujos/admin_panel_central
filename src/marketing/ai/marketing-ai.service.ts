type ExecutiveDashboard = {
  kpis: {
    revenue: number;
    paidOrders: number;
    aov: number | null;
    customersNew: number;
    customersRepeat: number;
    funnel: {
      sessions: number;
      addToCart: number;
      checkouts: number;
      paidOrders: number;
      convSessionToCart: number | null;
      convCartToCheckout: number | null;
      convCheckoutToPaid: number | null;
    };
  };
  byChannel: Array<{
    channel: string;
    revenue: number;
    paidOrders: number;
    sessions: number;
    checkouts: number;
    roas: number | null;
  }>;
  topProducts: Array<{ name: string; units: number; amount: number }>;
  topCampaigns: Array<{ utmCampaign: string | null; revenue: number; paidOrders: number; roas: number | null }>;
};

export type MarketingInsight = {
  id: string;
  title: string;
  severity: "info" | "warn" | "critical";
  rationale: string;
  actions: string[];
};

function pct(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.round(value * 1000) / 10; // 1 decimal
}

export function generateMarketingInsights(dashboard: ExecutiveDashboard) {
  const insights: MarketingInsight[] = [];
  const funnel = dashboard.kpis.funnel;

  const s2c = funnel.convSessionToCart;
  const c2co = funnel.convCartToCheckout;
  const co2p = funnel.convCheckoutToPaid;

  if (s2c !== null && s2c < 0.02 && funnel.sessions >= 500) {
    insights.push({
      id: "funnel_session_to_cart_low",
      title: "Baja intención: pocos agregan al carrito",
      severity: "critical",
      rationale: `Sesión→Carrito: ${pct(s2c)}% con ${funnel.sessions} sesiones en el rango.`,
      actions: [
        "Revisar velocidad y UX en PDP (talla, disponibilidad, costos de envío).",
        "Agregar prueba social (reviews) y mensajes de confianza cerca del CTA.",
        "Activar bundles o incentivo ligero (envío gratis desde X o 2x1 en segunda unidad).",
      ],
    });
  }

  if (c2co !== null && c2co < 0.35 && funnel.addToCart >= 100) {
    insights.push({
      id: "funnel_cart_to_checkout_low",
      title: "Fricción en carrito: muchos no inician checkout",
      severity: "warn",
      rationale: `Carrito→Checkout: ${pct(c2co)}% con ${funnel.addToCart} add-to-cart.`,
      actions: [
        "Reducir distracciones en carrito y enfatizar 'Checkout seguro'.",
        "Mostrar total estimado (envío/impuestos) temprano y evitar sorpresas.",
        "Añadir métodos de pago visibles (PSE, tarjetas, contraentrega si aplica).",
      ],
    });
  }

  if (co2p !== null && co2p < 0.45 && funnel.checkouts >= 50) {
    insights.push({
      id: "funnel_checkout_to_paid_low",
      title: "Caída alta en checkout: muchos no pagan",
      severity: "critical",
      rationale: `Checkout→Pago: ${pct(co2p)}% con ${funnel.checkouts} checkouts.`,
      actions: [
        "Auditar fallas de pago y cobertura de medios (intentos fallidos, pasarela, rechazo).",
        "Activar recuperación (email/WhatsApp) para checkout abandonado y retargeting dinámico.",
        "Probar simplificación: menos campos, autocompletar, pago express.",
      ],
    });
  }

  const repeatShare =
    dashboard.kpis.customersNew + dashboard.kpis.customersRepeat > 0
      ? dashboard.kpis.customersRepeat / (dashboard.kpis.customersNew + dashboard.kpis.customersRepeat)
      : null;
  if (repeatShare !== null && repeatShare < 0.18 && (dashboard.kpis.customersNew + dashboard.kpis.customersRepeat) >= 50) {
    insights.push({
      id: "retention_low",
      title: "Retención baja: pocos clientes recurrentes",
      severity: "warn",
      rationale: `Recurrentes: ${pct(repeatShare)}% del total de clientes del rango.`,
      actions: [
        "Crear flujo post-compra (upsell a 7–14 días + reposición).",
        "Implementar programa VIP (puntos / cupones para 2da compra).",
        "Campañas de email/WhatsApp segmentadas por categoría y talla.",
      ],
    });
  }

  const paidChannels = dashboard.byChannel.filter((c) => c.channel.includes("paid") || c.channel.includes("social"));
  const lowRoas = paidChannels
    .filter((c) => typeof c.roas === "number" && c.roas < 1.6 && c.revenue > 0)
    .sort((a, b) => (a.roas || 0) - (b.roas || 0))
    .slice(0, 3);
  if (lowRoas.length) {
    insights.push({
      id: "roas_low",
      title: "ROAS bajo en canales pagos",
      severity: "critical",
      rationale: lowRoas
        .map((c) => `${c.channel}: ROAS ${(Math.round((c.roas || 0) * 10) / 10).toFixed(1)}`)
        .join(" · "),
      actions: [
        "Mover presupuesto a campañas/productos con mejor margen y conversión.",
        "Excluir audiencias frías si el checkout→paid está bajo; reforzar remarketing.",
        "Alinear oferta/creativos con Top productos (ganadores) para elevar CTR y CVR.",
      ],
    });
  }

  const top = dashboard.topProducts.slice(0, 5);
  if (top.length) {
    insights.push({
      id: "top_products_focus",
      title: "Enfoque recomendado: Top productos",
      severity: "info",
      rationale: `Top 5 por ventas: ${top.map((p) => p.name).join(", ")}.`,
      actions: [
        "Crear campañas dedicadas (catálogo + creativos) para los Top 5.",
        "Optimizar páginas de producto: fotos, guía de tallas, beneficios claros.",
        "Asegurar inventario y variantes para evitar perder demanda.",
      ],
    });
  }

  return insights;
}

