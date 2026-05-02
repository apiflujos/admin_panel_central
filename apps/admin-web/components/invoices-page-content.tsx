import { getServerInvoicesCatalog } from "../lib/server-api";
import { InvoicesPage } from "./invoices-page";

export async function InvoicesPageContent() {
  const invoices = await getServerInvoicesCatalog();
  return <InvoicesPage result={invoices} />;
}
