import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./types";
import { supabaseEnv, supabaseServiceKey, type EsquemaApp } from "./env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Respeta las políticas RLS del usuario autenticado.
 *
 * Siempre crear uno nuevo por request: nunca guardarlo en una variable global.
 *
 * Las consultas apuntan al esquema `smartvale`. Para leer del ERP en `public`
 * (productos, clientes, tiendas, usuarios) usar `.schema("public")` en la
 * consulta concreta.
 */
export async function createClient() {
  const { url, key, esquema } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database, EsquemaApp>(url, key, {
    db: { schema: esquema },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Los Server Components no pueden escribir cookies; el proxy ya
          // refresca la sesión, así que ignorar aquí es seguro.
        }
      },
    },
  });
}

/**
 * Cliente con privilegios de servicio: ignora RLS.
 * Usar solo en el servidor y solo cuando de verdad haga falta
 * (webhooks, tareas programadas, migraciones de datos).
 */
export function createAdminClient() {
  const { url, esquema } = supabaseEnv();

  return createServerClient<Database, EsquemaApp>(url, supabaseServiceKey(), {
    db: { schema: esquema },
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
