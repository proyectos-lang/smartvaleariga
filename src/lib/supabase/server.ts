import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./types";
import { supabaseEnv, supabaseServiceKey } from "./env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Respeta las políticas RLS del usuario autenticado.
 *
 * Siempre crear uno nuevo por request: nunca guardarlo en una variable global.
 */
export async function createClient() {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
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
          // Los Server Components no pueden escribir cookies; el middleware
          // ya refresca la sesión, así que ignorar es seguro.
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
  const { url } = supabaseEnv();

  return createServerClient<Database>(url, supabaseServiceKey(), {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
