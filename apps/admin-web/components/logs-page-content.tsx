import { getServerLogsCatalog } from "../lib/server-api";
import { LogsPage } from "./logs-page";

export async function LogsPageContent({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const offset = Math.max(0, Number(typeof params.offset === "string" ? params.offset : 0) || 0);
  const logs = await getServerLogsCatalog({
    offset,
    status: typeof params.status === "string" ? params.status : undefined,
    orderId: typeof params.orderId === "string" ? params.orderId : undefined,
    entity: typeof params.entity === "string" ? params.entity : undefined,
    direction: typeof params.direction === "string" ? params.direction : undefined,
    from: typeof params.from === "string" ? params.from : undefined,
    to: typeof params.to === "string" ? params.to : undefined,
  });
  // Los filtros se conservan al cambiar de página: perderlos al pulsar
  // «Siguiente» obligaría a volver a ponerlos en cada salto.
  const filtros = Object.entries(params)
    .filter(([clave, valor]) => clave !== "offset" && typeof valor === "string" && valor)
    .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`)
    .join("&");

  return <LogsPage result={logs} offset={offset} filtros={filtros} />;
}
