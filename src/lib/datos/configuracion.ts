import "server-only";

import { db } from "@/lib/supabase/server";
import type { Configuracion } from "@/lib/supabase/types";

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
};

/**
 * Tarifas vigentes.
 *
 * El descuento ya no depende del cliente sino de la pieza: la campaña es de
 * boca en boca y ofrece lo mismo a todos, así que un A1-VIP y un visitante
 * llevan el mismo vale. Lo que cambia es el material.
 *
 * Esto es solo lo que se le enseña a la vendedora antes de emitir; el valor
 * que queda dentro del vale lo congela Postgres en ese momento.
 */
export async function descuentosVigentes(): Promise<Tarifas> {
  const mapa = await mapaConfiguracion();
  const leer = (clave: string, defecto: number) =>
    mapa[clave] === undefined ? defecto : Number(mapa[clave]);

  return {
    oro: leer("descuento_oro", 20),
    plata: leer("descuento_plata", 40),
    diasVigencia: leer("dias_vigencia_vale", 30),
  };
}
