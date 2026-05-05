import { getServerLogsCatalog } from "../lib/server-api";
import { LogsPage } from "./logs-page";

export async function LogsPageContent({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const logs = await getServerLogsCatalog({
    status: typeof params.status === "string" ? params.status : undefined,
    orderId: typeof params.orderId === "string" ? params.orderId : undefined,
    entity: typeof params.entity === "string" ? params.entity : undefined,
    direction: typeof params.direction === "string" ? params.direction : undefined,
    from: typeof params.from === "string" ? params.from : undefined,
    to: typeof params.to === "string" ? params.to : undefined,
  });
  return <LogsPage result={logs} />;
}
