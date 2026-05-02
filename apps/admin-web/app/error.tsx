"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Poppins, Segoe UI, sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          border: "1px solid rgba(92,70,131,0.12)",
          borderRadius: 12,
          padding: "20px 24px",
          background: "#fff",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#be123c",
          }}
        >
          Error del sistema
        </p>
        <h2
          style={{ margin: "0 0 10px", fontSize: 18, color: "#101521", fontWeight: 700 }}
        >
          No se pudo cargar la página
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#636978" }}>
          El backend no respondió o encontró un error.
          {error.digest ? ` (${error.digest})` : ""}
        </p>
        <button
          onClick={reset}
          style={{
            minHeight: 32,
            padding: "0 12px",
            borderRadius: 10,
            background: "#6a54a1",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            fontSize: 11,
            cursor: "pointer",
          }}
          type="button"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
