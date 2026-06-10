"use client";

import type { StoreConfigReadiness } from "../lib/store-config-readiness";

export function StoreConfigsReadiness({ readiness }: { readiness: StoreConfigReadiness }) {
  const title =
    readiness.level === "ok"
      ? "Listo para guardar"
      : readiness.level === "critical"
        ? "Bloqueado"
        : "Atención";

  const toneClass =
    readiness.level === "ok"
      ? "store-readiness-ok"
      : readiness.level === "critical"
        ? "store-readiness-critical"
        : "store-readiness-warn";

  return (
    <section className={`store-readiness ${toneClass}`}>
      <div className="store-readiness-head">
        <strong>{title}</strong>
        <span>{readiness.canSave ? "Puede guardar" : "Guardar bloqueado"}</span>
      </div>
      {readiness.messages.length ? (
        <ul className="store-readiness-list">
          {readiness.messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : (
        <p className="connection-inline-note">Sin riesgos detectados.</p>
      )}
    </section>
  );
}
