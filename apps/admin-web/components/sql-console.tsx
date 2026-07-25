"use client";

import { useState } from "react";

import { apiFetch } from "../lib/api";

type SqlResult = {
  command: string;
  rowCount: number;
  rows: Record<string, unknown>[];
  fields: string[];
  truncated: boolean;
  ms: number;
};

const cell = (v: unknown) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export function SqlConsole() {
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<SqlResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  async function run() {
    const trimmed = sql.trim();
    if (!trimmed) return;
    // Confirmación extra para operaciones destructivas.
    if (/^\s*(delete|update|drop|truncate|alter|insert)\b/i.test(trimmed)) {
      const ok = window.confirm(
        "Vas a ejecutar una operación que MODIFICA la base de datos de producción.\n\n¿Continuar?"
      );
      if (!ok) return;
    }
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await apiFetch("/api/sa/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || `Error ${res.status}`);
        return;
      }
      setResult(data as SqlResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo ejecutar.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <h3 style={{ margin: 0 }}>Consola SQL</h3>
        <p className="app-state-copy" style={{ color: "var(--bad, #b91c1c)", marginTop: 4 }}>
          ⚠️ Ejecuta SQL directo sobre la base de datos de <strong>producción</strong>. Úsala con cuidado — un
          <code> DELETE</code>/<code>UPDATE</code> sin <code>WHERE</code> es irreversible. Cada ejecución queda
          registrada en los logs.
        </p>
      </div>

      <textarea
        className="input"
        style={{ fontFamily: "monospace", minHeight: 140, resize: "vertical" }}
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        placeholder={"SELECT store_id, count(*) FROM products GROUP BY store_id;"}
        spellCheck={false}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void run();
          }
        }}
      />

      <div className="page-module-actions">
        <button className="btn primary" type="button" disabled={running || !sql.trim()} onClick={() => void run()}>
          {running ? "Ejecutando..." : "Ejecutar (⌘/Ctrl + Enter)"}
        </button>
      </div>

      {error ? (
        <p className="app-state-copy" style={{ color: "var(--bad, #b91c1c)" }}>
          {error}
        </p>
      ) : null}

      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="app-state-copy">
            <strong>{result.command || "OK"}</strong> · {result.rowCount} fila(s) · {result.ms} ms
            {result.truncated ? " · (resultado recortado a 1000 filas)" : ""}
          </p>
          {result.rows.length ? (
            <div style={{ overflowX: "auto", border: "1px solid var(--panel-border, #e5e7eb)", borderRadius: 6 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    {(result.fields.length ? result.fields : Object.keys(result.rows[0] || {})).map((f) => (
                      <th
                        key={f}
                        style={{
                          textAlign: "left",
                          padding: "6px 10px",
                          borderBottom: "1px solid var(--panel-border, #e5e7eb)",
                          background: "var(--panel-alt, #f9fafb)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {(result.fields.length ? result.fields : Object.keys(row)).map((f) => (
                        <td
                          key={f}
                          style={{
                            padding: "6px 10px",
                            borderBottom: "1px solid var(--panel-border, #eef0f2)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cell(row[f])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
