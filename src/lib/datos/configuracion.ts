import "server-only";

import { db } from "@/lib/supabase/server";
import { fecha } from "@/lib/format";
import type { Configuracion, TipoVale } from "@/lib/supabase/types";

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

export type Tarifas = {
  /** % sobre las piezas de oro. */
  oro: number;
  /** % sobre las piezas de plata. */
  plata: number;
  diasVigencia: number;
  /**
   * Día de cierre de la campaña, si el tipo tiene uno. Con fecha de corte
   * la ventana de días no se usa: el vale muere ese día lo emita quien lo
   * emita. Nulo = ventana rodante de `diasVigencia`.
   */
  vigenciaHasta: string | null;
  /** Ya formateada para enseñarla: "31 oct 2026". */
  vigenciaHastaTexto: string | null;
};

/**
 * Tarifas vigentes, opcionalmente las del tipo.
 *
 * El descuento no depende del cliente sino de la pieza: dentro de un mismo
 * tipo, un A1-VIP y un A1 de 30 días llevan lo mismo. Lo que cambia es el
 * material —y, desde que el A3 tiene tarifa propia, la puerta de entrada.
 *
 * Un tipo sin clave propia cae a la tarifa general, que es exactamente lo
 * que hace `fn_tarifas_vigentes` en la base. Las dos lecturas tienen que
 * coincidir: esta es la que se le enseña a la vendedora antes de emitir, y
 * la de Postgres la que queda congelada dentro del vale.
 *
 * Sin `tipo` devuelve la tarifa general, para las pantallas que hablan de la
 * campaña y no de una puerta concreta.
 */
export async function descuentosVigentes(tipo?: TipoVale): Promise<Tarifas> {
  return tarifasDe(await mapaConfiguracion(), tipo);
}

/**
 * Las cuatro tarifas de una sola lectura.
 *
 * Para las pantallas que enseñan las puertas juntas: pedirlas una a una
 * serían cuatro consultas a `configuracion` para la misma tabla.
 */
export async function descuentosPorTipo(): Promise<Record<TipoVale, Tarifas>> {
  const mapa = await mapaConfiguracion();
  return {
    A1: tarifasDe(mapa, "A1"),
    A2: tarifasDe(mapa, "A2"),
    A3: tarifasDe(mapa, "A3"),
    A4: tarifasDe(mapa, "A4"),
  };
}

function tarifasDe(mapa: Record<string, string>, tipo?: TipoVale): Tarifas {
  const leer = (clave: string, defecto: number) =>
    mapa[clave] === undefined ? defecto : Number(mapa[clave]);

  // La clave del tipo manda; si no está, cae a la general. Es la misma
  // cascada que `fn_tarifas_vigentes` en la base, y tiene que seguir siéndolo.
  const porTipo = (clave: string, defecto: number) => {
    const general = leer(clave, defecto);
    return tipo ? leer(`${clave}_${tipo.toLowerCase()}`, general) : general;
  };

  // Misma cascada para la fecha de corte: la del tipo, si no la general.
  const hasta =
    (tipo ? mapa[`vigencia_hasta_${tipo.toLowerCase()}`] : undefined) ??
    mapa["vigencia_hasta"];
  const dia = hasta?.trim() ? hasta.trim() : null;

  return {
    oro: porTipo("descuento_oro", 20),
    plata: porTipo("descuento_plata", 40),
    diasVigencia: leer("dias_vigencia_vale", 30),
    vigenciaHasta: dia,
    // Se lee como mediodía para que el formateo a hora de Guatemala no
    // pueda cruzar a la víspera: "2026-10-31" a secas es medianoche UTC.
    vigenciaHastaTexto: dia ? fecha(`${dia}T12:00:00Z`) : null,
  };
}
