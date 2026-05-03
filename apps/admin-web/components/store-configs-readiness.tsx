"use client";

import type { StoreConfigReadiness } from "../lib/store-config-readiness";

export function StoreConfigsReadiness({ readiness }: { readiness: StoreConfigReadiness }) {
  const title =
    readiness.level === "ok"
      ? "Readiness estable"
      : readiness.level === "critical"
        ? "Readiness bloqueante"
        : "Readiness en atención";

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
        <span>{readiness.canSave ? "Guardado permitido" : "Guardar bloqueado"}</span>
      </div>
      {readiness.messages.length ? (
        <ul className="store-readiness-list">
          {readiness.messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : (
        <p className="connection-inline-note">La combinación actual no expone riesgos inmediatos del bloque portado.</p>
      )}
    </section>
  );
}
