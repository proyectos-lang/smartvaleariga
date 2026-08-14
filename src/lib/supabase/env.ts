/**
 * Lectura centralizada de la configuración de Supabase.
 * Falla temprano y con un mensaje claro en lugar de reventar dentro del SDK.
 */

/**
 * Esquema de Postgres donde vive esta aplicación.
 *
 * El proyecto de Supabase es compartido: `public` ya aloja el ERP de ARIGA
 * (productos, ventas, inventario, comisiones…). Los vales viven aparte, en
 * `smartvale`, para no interferir con ese esquema.
 *
 * Es una constante y no una variable de entorno a propósito: el nombre del
 * esquema forma parte de los tipos generados por `npm run db:types`, así que
 * cambiarlo por ambiente rompería el tipado en lugar de configurarlo.
 */
export const ESQUEMA = "smartvale" as const;
export type EsquemaApp = typeof ESQUEMA;

/**
 * Clave pública del proyecto. Se prefiere la `sb_publishable_…` (formato
 * nuevo) y se cae a la `anon` en JWT por compatibilidad.
 *
 * Ambas referencias se escriben completas para que Next pueda sustituirlas
 * en tiempo de compilación en el bundle del navegador.
 */
function clavePublica() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = clavePublica();

  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o la clave pública (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY). Copia .env.example a .env.local y llena los valores.",
    );
  }

  return { url, key, esquema: ESQUEMA };
}

/**
 * Clave de servicio: ignora RLS. Solo para código que corre en el servidor
 * (route handlers, server actions, tareas programadas).
 */
export function supabaseServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Requerida solo para operaciones administrativas del lado del servidor.",
    );
  }
  return key;
}

/** ¿Está configurado Supabase? Útil para degradar la UI sin romperla. */
export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
