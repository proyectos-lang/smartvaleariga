import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./types";
import { supabaseEnv, type EsquemaApp } from "./env";

/**
 * Cliente de Supabase para componentes que corren en el navegador
 * (`"use client"`). Comparte la sesión con el servidor vía cookies.
 *
 * Las consultas apuntan al esquema `smartvale`; para leer del ERP en
 * `public` hay que pedirlo explícitamente con `.schema("public")`.
 */
export function createClient() {
  const { url, key, esquema } = supabaseEnv();

  return createBrowserClient<Database, EsquemaApp>(url, key, {
    db: { schema: esquema },
  });
}
