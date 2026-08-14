import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./types";
import { hasSupabaseEnv, supabaseEnv } from "./env";

/** Rutas accesibles sin sesión iniciada. */
const RUTAS_PUBLICAS = ["/login", "/auth"];

/** Rutas que deben responder aunque no haya sesión (canje público de vales). */
const RUTAS_ABIERTAS = ["/v/"];

function esPublica(pathname: string) {
  return (
    RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`)) ||
    RUTAS_ABIERTAS.some((r) => pathname.startsWith(r))
  );
}

/**
 * Refresca el token de sesión en cada request y protege el panel.
 * Debe devolver **el mismo** objeto `NextResponse` sobre el que se
 * escribieron las cookies, o la sesión se pierde entre navegaciones.
 */
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sin credenciales configuradas dejamos pasar todo: el proyecto
  // debe poder levantarse antes de conectar Supabase.
  if (!hasSupabaseEnv()) return response;

  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !esPublica(pathname)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.searchParams.set("redirect", pathname);
    return NextResponse.redirect(destino);
  }

  if (user && pathname === "/login") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/panel";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return response;
}
