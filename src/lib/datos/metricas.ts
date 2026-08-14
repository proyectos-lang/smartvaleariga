import "server-only";

import { db } from "@/lib/supabase/server";
import type {
  ActividadDiaria,
  MetricasGenerales,
  MetricasPorTipo,
  RankingTienda,
  RankingVendedora,
  ViralidadA2,
} from "@/lib/supabase/types";

/**
 * Lecturas del tablero de inteligencia comercial.
 *
 * Todo pasa por vistas y funciones de Postgres: agregar en SQL evita traerse
 * miles de filas a Node solo para contarlas.
 */

const METRICAS_VACIAS: MetricasGenerales = {
  vales_emitidos: 0,
  vales_activos: 0,
  vales_vencidos: 0,
  vales_anulados: 0,
  redenciones: 0,
  vales_con_compra: 0,
  tasa_conversion: null,
  ingreso_total: 0,
  ticket_promedio: null,
  descuento_total: 0,
  descuento_sobre_venta: null,
};

/**
 * Indicadores generales. Con `usuarioId` se acotan a esa vendedora; sin él,
 * son los de toda la operación.
 */
export async function metricasGenerales(
  usuarioId?: number | null,
): Promise<MetricasGenerales> {
  const { data, error } = await db().rpc("fn_metricas", {
    p_usuario_id: usuarioId ?? null,
  });

  if (error) throw new Error(`No se pudieron leer las métricas: ${error.message}`);
  return data?.[0] ?? METRICAS_VACIAS;
}

/** Adquisición por puerta de entrada (A1, A2, A3). */
export async function metricasPorTipo(): Promise<MetricasPorTipo[]> {
  const { data, error } = await db()
    .from("vw_vales_por_tipo")
    .select("*")
    .order("tipo");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function rankingVendedoras(
  limite = 10,
): Promise<RankingVendedora[]> {
  const { data, error } = await db()
    .from("vw_ranking_vendedoras")
    .select("*")
    .order("ingreso_generado", { ascending: false })
    .limit(limite);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function rankingTiendas(limite = 10): Promise<RankingTienda[]> {
  const { data, error } = await db()
    .from("vw_ranking_tiendas")
    .select("*")
    .order("ingreso", { ascending: false })
    .limit(limite);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Alcance viral de los vales A2, que son los pensados para compartirse. */
export async function viralidadA2(): Promise<ViralidadA2> {
  const { data, error } = await db()
    .from("vw_viralidad_a2")
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (
    data ?? {
      vales_a2: 0,
      redenciones_a2: 0,
      redenciones_por_vale: null,
      alcance_maximo: null,
      vales_compartidos: 0,
      ingreso_a2: 0,
    }
  );
}

/** Serie diaria de los últimos `dias` para las gráficas. */
export async function actividadDiaria(dias = 30): Promise<ActividadDiaria[]> {
  const desde = new Date(Date.now() - dias * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await db()
    .from("vw_actividad_diaria")
    .select("*")
    .gte("dia", desde)
    .order("dia");

  if (error) throw new Error(error.message);
  return data ?? [];
}
