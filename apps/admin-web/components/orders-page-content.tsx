import { getServerOrdersCatalog } from "../lib/server-api";
import { OrdersPage } from "./orders-page";

export async function OrdersPageContent({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const query = typeof params.query === "string" ? params.query : undefined;
  const offset = typeof params.offset === "string" ? Number(params.offset) : 0;
  const orders = await getServerOrdersCatalog({ query, offset, limit: 20 });
  return <OrdersPage result={orders} query={query ?? ""} offset={offset} />;
}
