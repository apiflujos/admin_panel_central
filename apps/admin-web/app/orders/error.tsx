"use client";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        padding: "40px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Poppins, Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 380,
          border: "1px solid rgba(92,70,131,0.12)",
          borderRadius: 12,
          padding: "18px 20px",
          background: "#fff",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: "0 0 5px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#be123c",
          }}
        >
          Error al cargar
        </p>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, color: "#101521", fontWeight: 700 }}>
          No se pudo obtener los datos
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#636978" }}>
          {error.digest ? `(${error.digest})` : "El backend no respondió."}
        </p>
        <button
          onClick={reset}
          type="button"
          style={{
            minHeight: 30,
            padding: "0 12px",
            borderRadius: 8,
            background: "#6a54a1",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
