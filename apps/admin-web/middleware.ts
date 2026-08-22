import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware for the admin-web.
 *
 * Responsibility: ensure the visitor has a session cookie before serving any
 * protected page. The actual token validation happens in Server Components via
 * `requireServerSessionProfile()`, which queries Postgres directly. Doing a
 * network fetch here was redundant and opened a "fail-open" window when the
 * auth check timed out.
 */
export function middleware(request: NextRequest) {
  const session = request.cookies.get("os_session");
  if (!session?.value) {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protege todo MENOS las páginas de auth, las rutas de API, los estáticos
    // de Next y los ARCHIVOS DE MARCA.
    //
    // `assets/`, `icon.svg` y los iconos faltaban en esta lista: el navegador
    // pedía el logo desde la pantalla de login —donde todavía no hay sesión—
    // y recibía un 307 al propio login. Resultado: en el login no se veía ni
    // el logo ni la mascota. Un archivo estático nunca debe exigir sesión.
    "/((?!auth/|api/|assets/|_next/static|_next/image|favicon|icon\\.svg|apple-touch-icon).*)",
  ],
};
