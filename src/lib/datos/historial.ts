import "server-only";

import { db } from "@/lib/supabase/server";

/**
 * El historial completo de ventas: con vale y sin él, en una sola lista.
 *
 * Las dos vías siguen teniendo su propia pantalla —redenciones lleva cliente,
 * referido y vale; la venta de mostrador no— y su propia tabla. Esto es la
 * vista de quien pregunta «cuánto se vendió» sin que le importe por dónde
 * entró, y necesita distinguirlo de un vistazo.
 */

export type TipoVenta = "vale" | "normal";

export type LineaHistorial = {
  tipo: TipoVenta;
  id: number;
  clave: string;
  fecha_creacion: string;
  dia: string;
  tienda_id: number;
  tienda: string;
  usuario_id: number;
  vendedora: string;
  emisora_id: number;
  monto: number;
  monto_oro: number;
  monto_plata: number;
  descuento: number;
  /** Lo que entró en caja: `monto - descuento`. */
  neto: number;
  ticket: string | null;
  vale_codigo: string | null;
  vale_tipo: string | null;
  comprador: string | null;
  comprador_telefono: string | null;
};

export type FiltroHistorial = {
  /** `null` para ver todo: solo el administrador debe pasarlo. */
  usuarioId?: number | null;
  tipo?: TipoVenta;
  tiendaId?: number;
  /** Rango por día local, `AAAA-MM-DD`, ambos inclusive. */
  desde?: string | null;
  hasta?: string | null;
  pagina?: number;
  porPagina?: number;
};

export type PaginaHistorial = {
  lineas: LineaHistorial[];
  total: number;
  /** Totales del filtro entero, no solo de la página que se ve. */
  suma: { monto: number; descuento: number; neto: number; conVale: number };
  pagina: number;
  porPagina: number;
};

/**
 * Un día local convertido al instante en que empieza, en UTC. Guatemala está
 * a UTC−6 todo el año, así que el desfase es constante y la cuenta exacta.
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

/** Tope de seguridad al sumar: sin él una base grande pediría todo de golpe. */
const TOPE_SUMA = 20000;

export async function listarHistorial({
  usuarioId = null,
  tipo,
  tiendaId,
  desde,
  hasta,
  pagina = 1,
  porPagina = 25,
}: FiltroHistorial = {}): Promise<PaginaHistorial> {
  const salto = (pagina - 1) * porPagina;

  // Los dos filtros se escriben en paralelo sobre ambas consultas: la página
  // que se ve y los totales tienen que acotar igual, o las cifras de arriba no
  // corresponderían a la lista de abajo. Van explícitos y no por un ayudante
  // genérico porque el encadenado de PostgREST cambia de tipo en cada paso y
  // envolverlo obliga a perder ese tipado.
  let lista = db()
    .from("vw_historial_ventas")
    .select("*", { count: "exact" })
    .order("fecha_creacion", { ascending: false })
    .range(salto, salto + porPagina - 1);

  let totales = db()
    .from("vw_historial_ventas")
    .select("tipo,monto,descuento,neto")
    .limit(TOPE_SUMA);

  // El alcance se mide por quién emitió el vale, igual que en la pantalla de
  // redenciones: la vendedora ve el resultado de su gestión.
  if (usuarioId !== null) {
    lista = lista.eq("emisora_id", usuarioId);
    totales = totales.eq("emisora_id", usuarioId);
  }
  if (tipo) {
    lista = lista.eq("tipo", tipo);
    totales = totales.eq("tipo", tipo);
  }
  if (tiendaId) {
    lista = lista.eq("tienda_id", tiendaId);
    totales = totales.eq("tienda_id", tiendaId);
  }
  if (desde) {
    lista = lista.gte("fecha_creacion", inicioDelDia(desde));
    totales = totales.gte("fecha_creacion", inicioDelDia(desde));
  }
  if (hasta) {
    lista = lista.lt("fecha_creacion", inicioDelDiaSiguiente(hasta));
    totales = totales.lt("fecha_creacion", inicioDelDiaSiguiente(hasta));
  }

  const [resultado, sumas] = await Promise.all([lista, totales]);

  if (resultado.error) {
    throw new Error(`No se pudo leer el historial: ${resultado.error.message}`);
  }
  if (sumas.error) {
    throw new Error(`No se pudieron sumar las ventas: ${sumas.error.message}`);
  }

  const suma = (sumas.data ?? []).reduce(
    (a: { monto: number; descuento: number; neto: number; conVale: number },
     v: { tipo: string; monto: number; descuento: number; neto: number }) => ({
      monto: a.monto + Number(v.monto),
      descuento: a.descuento + Number(v.descuento),
      neto: a.neto + Number(v.neto),
      conVale: a.conVale + (v.tipo === "vale" ? 1 : 0),
    }),
    { monto: 0, descuento: 0, neto: 0, conVale: 0 },
  );

  return {
    lineas: (resultado.data ?? []) as LineaHistorial[],
    total: resultado.count ?? 0,
    suma,
    pagina,
    porPagina,
  };
}

/**
 * El historial entero para exportar, recorriendo todas las páginas.
 *
 * PostgREST corta en `db-max-rows` aunque se pida más, así que se pagina a
 * mano: pedir «todo» de una vez devolvería un archivo silenciosamente
 * incompleto, que es peor que uno que falla.
 */
const LOTE = 1000;

export async function historialCompleto(
  filtro: FiltroHistorial = {},
  tope = 20000,
): Promise<LineaHistorial[]> {
  const todas: LineaHistorial[] = [];

  for (let pagina = 1; todas.length < tope; pagina++) {
    const { lineas } = await listarHistorial({
      ...filtro,
      pagina,
      porPagina: LOTE,
    });
    todas.push(...lineas);
    if (lineas.length < LOTE) break;
  }

  return todas;
}
