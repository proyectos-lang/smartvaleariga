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

export async function tiendaPorId(id: number): Promise<Tienda | null> {
  const { data, error } = await db()
    .from("tiendas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
