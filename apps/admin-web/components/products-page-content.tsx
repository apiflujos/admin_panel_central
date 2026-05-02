import { getServerProductsCatalog } from "../lib/server-api";
import { ProductsPage } from "./products-page";

export async function ProductsPageContent({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const query = typeof params.query === "string" ? params.query : undefined;
  const start = typeof params.start === "string" ? Number(params.start) : 0;
  const products = await getServerProductsCatalog({ query, start, limit: 30 });
  return <ProductsPage result={products} query={query ?? ""} start={start} />;
}
