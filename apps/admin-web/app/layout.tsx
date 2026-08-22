import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ApiFlujos",
  description: "Panel principal de administración y trazabilidad.",
  icons: {
    // SVG primero: nítido en cualquier densidad de pantalla. El PNG queda como
    // respaldo para navegadores que no lo admiten.
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
