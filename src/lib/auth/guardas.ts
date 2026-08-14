import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { leerSesion, type SesionActiva } from "./sesion";

/**
 * La sesión se resuelve una sola vez por request aunque el layout y varias
 * páginas la pidan: `cache()` deduplica la consulta dentro del mismo render.
 */
const obtenerSesion = cache(leerSesion);

/**
 * Guardas de autorización.
 *
 * Sin Supabase Auth no hay `auth.uid()`, así que RLS no puede decidir quién
 * ve qué: **esta es la única frontera de autorización de la aplicación**.
 * Toda página, Server Action y Route Handler que toque datos debe empezar
 * llamando a una de estas funciones.
 */

/** Exige sesión válida. Redirige a /login si no la hay. */
export async function requerirSesion(destino?: string): Promise<SesionActiva> {
  const sesion = await obtenerSesion();
  if (sesion) return sesion;

  const parametro = destino ? `?redirect=${encodeURIComponent(destino)}` : "";
  redirect(`/login${parametro}`);
}

/** Exige rol de administrador. Los demás van al panel, no a una pantalla vacía. */
export async function requerirAdmin(): Promise<SesionActiva> {
  const sesion = await requerirSesion();
  if (sesion.rol !== "admin") redirect("/panel");
  return sesion;
}

/**
 * Variante para Server Actions y Route Handlers, donde `redirect()` no
 * siempre es la respuesta correcta: devuelve `null` en vez de navegar.
 */
export async function sesionOpcional(): Promise<SesionActiva | null> {
  return obtenerSesion();
}

export function esAdmin(sesion: SesionActiva) {
  return sesion.rol === "admin";
}

/**
 * Filtro de alcance para las consultas: el administrador ve todo, la
 * vendedora solo lo suyo. Devuelve el `usuario_id` por el que filtrar, o
 * `null` cuando no hay que filtrar.
 */
export function alcanceDe(sesion: SesionActiva): number | null {
  return sesion.rol === "admin" ? null : sesion.usuarioId;
}
