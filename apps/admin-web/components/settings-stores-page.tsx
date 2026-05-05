"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ConnectionsWorkspace, WorkspaceStore } from "../lib/connections-workspace";
import { createStore, deleteStore } from "../lib/api";
import { PageHeader } from "./ui/page-header";
import { ProviderMark } from "./ui/provider-mark";
import { StageGuide } from "./ui/stage-guide";

export function SettingsStoresPage({ workspace }: { workspace: ConnectionsWorkspace }) {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCreateStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = storeName.trim();
    if (!name) {
      setStatusMessage("Escribe un nombre de tienda antes de crearla.");
      return;
    }
    setStatusMessage("");
    try {
      await createStore(name);
      setStoreName("");
      setStatusMessage(`Tienda "${name}" creada correctamente.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo crear la tienda.");
    }
  }

  async function handleDeleteStore(store: WorkspaceStore) {
    if (
      !window.confirm(
        `Eliminar la tienda "${store.name}"? Esta acción también elimina conexiones, configuraciones y cuentas asociadas de esa tienda.`
      )
    ) {
      return;
    }
    setPendingDeleteId(store.id);
    setStatusMessage("");
    try {
      await deleteStore(store.id);
      setStatusMessage(`Tienda "${store.name}" eliminada correctamente.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo eliminar la tienda.");
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Tiendas"
        subtitle="Alta mínima de tiendas y salto directo al flujo de conexiones por tienda."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <a href="/settings/connections">Configuración</a>
            <span>/</span>
            <span>Tiendas</span>
          </>
        }
        actions={
          <>
            <a className="btn ghost" href="/settings/connections">
              Volver a Configuración
            </a>
          </>
        }
      />

      <section className="page-module-shell page-module-shell-compact">
        <div className="page-module-head">
          <div>
            <h3>Paso 1. Alta base</h3>
            <p>
              Crea la tienda y luego salta directo al flujo de conexiones para completar Shopify, WooCommerce o Alegra.
            </p>
          </div>
        </div>
        <form className="store-inline-form" onSubmit={handleCreateStore}>
          <input
            className="input"
            name="storeName"
            placeholder="Nombre de la tienda"
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            disabled={isPending || pendingDeleteId !== null}
          />
          <button className="btn primary" type="submit" disabled={isPending || pendingDeleteId !== null}>
            Crear tienda
          </button>
        </form>
        {statusMessage ? <p className="connection-status-note">{statusMessage}</p> : null}
      </section>

      <StageGuide
        title="Paso 2. Continuar por tienda"
        description="Selecciona la tienda que vas a conectar o ajustar. La limpieza queda como acción secundaria."
        items={["1. Elegir tienda", "2. Conectar proveedores", "3. Ajustar operación"]}
        next={
          <a className="btn ghost btn-compact" href="/settings/connections">
            Ir al flujo de conexiones
          </a>
        }
      />

      <section className="connections-grid connections-grid-dense">
        {workspace.stores.map((store) => {
          const isDeleting = pendingDeleteId === store.id;
          return (
            <article className="card connection-card connection-card-dense" key={`settings-store:${store.id}`}>
              <div className="connection-card-head">
                <div>
                  <h3>{store.name}</h3>
                  <p>Tienda #{store.id}</p>
                </div>
                <span className="pill">{store.createdAt}</span>
              </div>
              <div className="connection-card-meta compact-pills">
                {store.providers.shopify ? <span className="pill pill-info">Shopify</span> : null}
                {store.providers.alegra ? <span className="pill pill-ok">Alegra</span> : null}
                {store.providers.woocommerce ? <span className="pill pill-warn">WooCommerce</span> : null}
              </div>
              <div className="provider-mark-row compact-provider-row">
                {store.providers.shopify ? <ProviderMark provider="Shopify" /> : null}
                {store.providers.alegra ? <ProviderMark provider="Alegra" /> : null}
                {store.providers.woocommerce ? <ProviderMark provider="WooCommerce" /> : null}
                <span className="connection-inline-note">
                  {store.providers.shopify || store.providers.alegra || store.providers.woocommerce
                    ? "Lista para continuar"
                    : "Sin proveedores conectados"}
                </span>
              </div>
              <div className="connection-tech-list">
                <div className="connection-tech-item">
                  <span>Siguiente paso</span>
                  <strong>
                    {store.providers.shopify || store.providers.alegra || store.providers.woocommerce
                      ? "Revisar conexiones y reglas por tienda."
                      : "Conectar al menos un proveedor para habilitar operación."}
                  </strong>
                </div>
              </div>
              <div className="connection-card-actions">
                <a className="btn primary btn-compact" href={`/settings/connections?storeId=${store.id}`}>
                  Configurar tienda
                </a>
                <a className="btn ghost btn-compact" href={`/settings/connections?storeId=${store.id}`}>
                  Copiar y ajustar
                </a>
                <button
                  className="btn ghost btn-compact"
                  type="button"
                  onClick={() => void handleDeleteStore(store)}
                  disabled={isPending || isDeleting || pendingDeleteId !== null}
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}
