import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy de Next 16 (antes `middleware`).
 *
 * Hace una comprobación **barata**: solo mira si existe la cookie de sesión.
 * No consulta la base de datos, porque esto corre en cada navegación y una
 * consulta por request sería un peaje constante.
 *
 * La validación real —token existente, no vencido, cuenta activa— la hace
 * `requerirSesion()` en `src/lib/auth/guardas.ts`, que es la frontera de
 * autorización de verdad. Una cookie con basura pasa por aquí y muere allí.
 */

const COOKIE_SESION = "ariga_sesion";

/** Accesibles sin sesión. */
const RUTAS_PUBLICAS = ["/login"];

/** Cara pública del vale: es lo que abre quien recibe el WhatsApp. */
const PREFIJOS_PUBLICOS = ["/v/", "/api/qr"];

/**
 * La imagen de la tarjeta tiene que ser alcanzable sin sesión: quien la pide
 * es el servidor de WhatsApp al generar la vista previa del enlace, y ahí no
 * hay cookies. El PDF del mismo vale, en cambio, sigue protegido: es material
 * interno. Por eso es un patrón exacto y no un prefijo sobre /api/vales.
 */
const PATRONES_PUBLICOS = [/^\/api\/vales\/[^/]+\/tarjeta$/];

function esPublica(pathname: string) {
  return (
    RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`)) ||
    PREFIJOS_PUBLICOS.some((r) => pathname.startsWith(r)) ||
    PATRONES_PUBLICOS.some((r) => r.test(pathname))
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tieneCookie = Boolean(request.cookies.get(COOKIE_SESION)?.value);

  if (!tieneCookie && !esPublica(pathname)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    if (pathname !== "/") destino.searchParams.set("redirect", pathname);
    return NextResponse.redirect(destino);
  }

  if (tieneCookie && pathname === "/login") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/panel";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Todo excepto archivos estáticos, imágenes optimizadas y assets:
     * el proxy toca cada navegación, no cada recurso.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$).*)",
  ],
};
