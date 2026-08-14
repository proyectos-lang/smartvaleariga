import "server-only";

import { db } from "@/lib/supabase/server";
import type { Tienda } from "@/lib/supabase/types";

/** Puntos de venta. Los usa A3 al emitir y toda redención al registrarse. */

export async function listarTiendas(soloActivas = true): Promise<Tienda[]> {
  let consulta = db().from("tiendas").select("*").order("nombre");
  if (soloActivas) consulta = consulta.eq("activo", true);

  const { data, error } = await consulta;
  if (error) throw new Error(`No se pudieron leer las tiendas: ${error.message}`);
  return data ?? [];
}

/**
 * Tienda por su token público. Es como llega el cliente que escanea el QR
 * fijo del mostrador, así que no exige sesión ni acepta el id.
 */
export async function tiendaPorToken(token: string): Promise<Tienda | null> {
  const limpio = token.trim();
  if (limpio.length < 16) return null;

  const { data, error } = await db()
    .from("tiendas")
    .select("*")
    .eq("token", limpio)
    .eq("activo", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function tiendaPorId(id: number): Promise<Tienda | null> {
  const { data, error } = await db()
    .from("tiendas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
