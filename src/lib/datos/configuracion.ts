import "server-only";

import { db } from "@/lib/supabase/server";
import type { Configuracion, SegmentoA1, TipoVale } from "@/lib/supabase/types";

/** Parámetros editables del panel de configuración de vales. */

export async function listarConfiguracion(): Promise<Configuracion[]> {
  const { data, error } = await db()
    .from("configuracion")
    .select("*")
    .order("grupo")
    .order("clave");

  if (error) throw new Error(`No se pudo leer la configuración: ${error.message}`);
  return data ?? [];
}

/** Todos los parámetros como mapa clave → valor. */
export async function mapaConfiguracion(): Promise<Record<string, string>> {
  const filas = await listarConfiguracion();
  return Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
}

/**
 * Clave de configuración que guarda el descuento de una combinación.
 * Debe coincidir con `smartvale.fn_descuento_de`.
 */
export function claveDescuento(tipo: TipoVale, segmento?: SegmentoA1 | null) {
  return tipo === "A1" && segmento
    ? `descuento_${segmento.toLowerCase().replace("-", "_")}`
    : `descuento_${tipo.toLowerCase()}`;
}

/**
 * Descuentos vigentes por tipo y segmento, para mostrarlos en el formulario
 * antes de emitir. El valor que queda en el vale lo fija Postgres al emitir:
 * esto es solo lo que se le enseña a la vendedora.
 */
export async function descuentosVigentes() {
  const mapa = await mapaConfiguracion();
  const leer = (clave: string) => Number(mapa[clave] ?? 0);

  return {
    A1: {
      "A1-30": leer("descuento_a1_30"),
      "A1-60": leer("descuento_a1_60"),
      "A1-90": leer("descuento_a1_90"),
      "A1-VIP": leer("descuento_a1_vip"),
    } as Record<SegmentoA1, number>,
    A2: leer("descuento_a2"),
    A3: leer("descuento_a3"),
    diasVigencia: Number(mapa.dias_vigencia_vale ?? 30),
  };
}
