import { getServerInvoicesCatalog } from "../lib/server-api";
import { AlegraInvoicesCatalog } from "./alegra-invoices-catalog";
import { InvoicesPage } from "./invoices-page";

export async function InvoicesPageContent({ offset = 0 }: { offset?: number }) {
  const invoices = await getServerInvoicesCatalog(offset);
  return (
    <div className="page-stack">
      <InvoicesPage result={invoices} offset={offset} />
      <AlegraInvoicesCatalog />
    </div>
  );
}
