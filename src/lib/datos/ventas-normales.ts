import "server-only";

import { db } from "@/lib/supabase/server";

/**
 * Consultas sobre la venta de mostrador, la que no trae vale.
 *
 * Es deliberadamente pobre comparada con las redenciones: no hay cliente, ni
 * vale, ni cadena de referidos. Solo cuánto, de qué material, dónde y quién
 * lo registró.
 */

export type VentaNormal = {
  id: number;
  tienda_id: number;
  usuario_id: number;
  monto: number;
  monto_oro: number;
  monto_plata: number;
  ticket: string | null;
  nota: string | null;
  fecha_creacion: string;
  editada_por: number | null;
  fecha_edicion: string | null;
  dia: string;
  tienda: string;
  vendedora: string;
  editada_por_nombre: string | null;
};

export type FiltroNormales = {
  /** `null` para ver todas: solo el administrador debe pasarlo. */
  usuarioId?: number | null;
  tiendaId?: number;
  /** Rango por día local, `AAAA-MM-DD`, ambos inclusive. */
  desde?: string | null;
  hasta?: string | null;
  pagina?: number;
  porPagina?: number;
};

export type PaginaNormales = {
  ventas: VentaNormal[];
  total: number;
  /** La suma del filtro completo, no solo de la página que se ve. */
  monto: number;
  pagina: number;
  porPagina: number;
};

/**
 * Un día local convertido al instante en que empieza, en UTC.
 *
 * Guatemala está a UTC−6 todo el año, así que el desfase es constante y la
 * cuenta exacta. Igual que en `datos/vales.ts`.
 */
const DESFASE_GT = "06:00:00";

function inicioDelDia(dia: string) {
  return `${dia}T${DESFASE_GT}Z`;
}

function inicioDelDiaSiguiente(dia: string) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.toISOString().slice(0, 10)}T${DESFASE_GT}Z`;
}

export async function listarVentasNormales({
  usuarioId = null,
  tiendaId,
  desde,
  hasta,
  pagina = 1,
  porPagina = 25,
}: FiltroNormales = {}): Promise<PaginaNormales> {
  const salto = (pagina - 1) * porPagina;

  // Los dos filtros se escriben una sola vez: la página que se ve y la suma
  // del filtro entero tienen que acotar exactamente igual, o la tarjeta diría
  // un total que no corresponde a la lista de abajo.
  let consulta = db()
    .from("vw_ventas_normales")
    .select("*", { count: "exact" })
    .order("fecha_creacion", { ascending: false })
    .range(salto, salto + porPagina - 1);

  let suma = db().from("vw_ventas_normales").select("monto");

  if (usuarioId !== null) {
    consulta = consulta.eq("usuario_id", usuarioId);
    suma = suma.eq("usuario_id", usuarioId);
  }
  if (tiendaId) {
    consulta = consulta.eq("tienda_id", tiendaId);
    suma = suma.eq("tienda_id", tiendaId);
  }
  if (desde) {
    consulta = consulta.gte("fecha_creacion", inicioDelDia(desde));
    suma = suma.gte("fecha_creacion", inicioDelDia(desde));
  }
  if (hasta) {
    consulta = consulta.lt("fecha_creacion", inicioDelDiaSiguiente(hasta));
    suma = suma.lt("fecha_creacion", inicioDelDiaSiguiente(hasta));
  }

  const [{ data, error, count }, { data: montos, error: errorMontos }] =
    await Promise.all([consulta, suma]);

  if (error) {
    throw new Error(`No se pudieron listar las ventas: ${error.message}`);
  }
  if (errorMontos) {
    throw new Error(`No se pudo sumar la venta: ${errorMontos.message}`);
  }

  return {
    ventas: data ?? [],
    total: count ?? 0,
    monto: (montos ?? []).reduce(
      (a: number, v: { monto: number }) => a + Number(v.monto),
      0,
    ),
    pagina,
    porPagina,
  };
}

/** Una venta por su id. Devuelve `null` si no existe. */
export async function ventaNormalPorId(id: number): Promise<VentaNormal | null> {
  const { data, error } = await db()
    .from("vw_ventas_normales")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
