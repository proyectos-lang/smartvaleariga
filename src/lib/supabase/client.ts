import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./types";
import { supabaseEnv } from "./env";

/**
 * Cliente de Supabase para componentes que corren en el navegador
 * (`"use client"`). Comparte la sesión con el servidor vía cookies.
 */
export function createClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
