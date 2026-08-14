import "server-only";

import { db } from "@/lib/supabase/server";
import type {
  EstadoVale,
  ResumenRango,
  TipoVale,
  ValeDetalle,
  ValeValidado,
} from "@/lib/supabase/types";

/** Consultas sobre vales. El alcance por rol lo decide quien llama. */

export type FiltroVales = {
  /** `null` para ver todos: solo el administrador debe pasarlo. */
  usuarioId?: number | null;
  tipo?: TipoVale;
  estado?: EstadoVale;
  /** Busca por código, nombre o teléfono del portador. */
  busqueda?: string;
  pagina?: number;
  porPagina?: number;
};

export type PaginaVales = {
  vales: ValeDetalle[];
  total: number;
  pagina: number;
  porPagina: number;
};

export async function listarVales({
  usuarioId = null,
  tipo,
  estado,
  busqueda,
  pagina = 1,
  porPagina = 25,
}: FiltroVales = {}): Promise<PaginaVales> {
  const desde = (pagina - 1) * porPagina;

  let consulta = db()
    .from("vw_vales_detalle")
    .select("*", { count: "exact" })
    .order("fecha_creacion", { ascending: false })
    .range(desde, desde + porPagina - 1);

  if (usuarioId !== null) consulta = consulta.eq("usuario_id", usuarioId);
  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (estado) consulta = consulta.eq("estado", estado);

  if (busqueda?.trim()) {
    const t = busqueda.trim().replace(/[%,]/g, "");
    consulta = consulta.or(
      `codigo.ilike.%${t}%,portador.ilike.%${t}%,portador_telefono.ilike.%${t}%`,
    );
  }

  const { data, error, count } = await consulta;
  if (error) throw new Error(`No se pudieron listar los vales: ${error.message}`);

  return {
    vales: data ?? [],
    total: count ?? 0,
    pagina,
    porPagina,
  };
}

/** Un vale por su código. Devuelve `null` si no existe. */
export async function valePorCodigo(codigo: string): Promise<ValeDetalle | null> {
  const { data, error } = await db()
    .from("vw_vales_detalle")
    .select("*")
    .ilike("codigo", codigo.trim())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Validación para el escáner: existencia, vigencia y desempeño del vale.
 * Es lo único que necesita la pantalla de redención antes de capturar.
 */
export async function validarVale(codigo: string): Promise<ValeValidado | null> {
  const { data, error } = await db().rpc("fn_validar_vale", {
    p_codigo: codigo.trim(),
  });

  if (error) throw new Error(`No se pudo validar el vale: ${error.message}`);
  return data?.[0] ?? null;
}

/** Últimos vales emitidos, para el resumen del panel. */
export async function valesRecientes(
  usuarioId: number | null,
  limite = 6,
): Promise<ValeDetalle[]> {
  let consulta = db()
    .from("vw_vales_detalle")
    .select("*")
    .order("fecha_creacion", { ascending: false })
    .limit(limite);

  if (usuarioId !== null) consulta = consulta.eq("usuario_id", usuarioId);

  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Cupo de la vendedora. Devuelve el bloque en curso y cuántos vales le
 * quedan; `null` cuando no tiene ningún rango asignado.
 */
export async function cupoDe(usuarioId: number): Promise<{
  bloques: ResumenRango[];
  actual: ResumenRango | null;
  restantes: number;
  sinRango: boolean;
} | null> {
  const { data, error } = await db().rpc("fn_resumen_rango", {
    p_usuario_id: usuarioId,
  });

  if (error) throw new Error(`No se pudo leer el rango: ${error.message}`);

  const bloques = data ?? [];
  const actual = bloques.find((b) => !b.agotado) ?? null;

  return {
    bloques,
    actual,
    restantes: bloques.reduce((suma, b) => suma + b.restantes, 0),
    sinRango: bloques.length === 0,
  };
}
