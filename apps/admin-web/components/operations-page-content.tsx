import { getServerOperationsCatalog } from "../lib/server-api";
import { OperationsPage } from "./operations-page";

export async function OperationsPageContent() {
  const operations = await getServerOperationsCatalog();
  return <OperationsPage result={operations} />;
}
