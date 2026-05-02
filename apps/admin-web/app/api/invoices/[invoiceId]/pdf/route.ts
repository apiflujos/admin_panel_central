import { NextResponse } from "next/server";

import { getOrFetchInvoicePdf } from "../../../../../../../src/services/invoices.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

export const GET = routeHandler(async (req: Request, ctx) => {
  await requireRouteAdmin();
  const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
  const invoiceId = String(params.invoiceId || "").trim();
  const searchParams = new URL(req.url).searchParams;
  const shopDomain = typeof searchParams.get("shopDomain") === "string" ? String(searchParams.get("shopDomain") || "") : "";
  const result = await getOrFetchInvoicePdf(invoiceId, shopDomain);
  const filenameBase = (result.invoiceNumber || invoiceId || "factura").replace(/[^\w.-]+/g, "_");
  return new NextResponse(new Uint8Array(result.content), {
    status: 200,
    headers: {
      "Content-Type": result.contentType || "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
});
