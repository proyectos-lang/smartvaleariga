/**
 * Lectura centralizada de las variables de entorno de Supabase.
 * Falla temprano y con un mensaje claro en lugar de reventar dentro del SDK.
 */

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env.local y llena los valores del proyecto de Supabase.",
    );
  }

  return { url, anonKey };
}

/**
 * Clave de servicio: solo para código que corre en el servidor
 * (route handlers, server actions, crons). Nunca importar desde el cliente.
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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
