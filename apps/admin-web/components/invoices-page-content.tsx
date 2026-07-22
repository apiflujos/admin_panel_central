import { getServerInvoicesCatalog } from "../lib/server-api";
import { AlegraInvoicesCatalog } from "./alegra-invoices-catalog";
import { InvoicesPage } from "./invoices-page";

export async function InvoicesPageContent() {
  const invoices = await getServerInvoicesCatalog();
  return (
    <div className="page-stack">
      <InvoicesPage result={invoices} />
      <AlegraInvoicesCatalog />
    </div>
  );
}
