import "server-only";

import { db } from "@/lib/supabase/server";

/** Historial de compras asociadas a los vales. */

export type RedencionDetalle = {
  id: number;
  monto_compra: number;
  /** Reparto por material: lo que decide el descuento de cada parte. */
  monto_oro: number;
  monto_plata: number;
  descuento_aplicado: number;
  /** Factura del punto de venta. Nula desde que la caja no la pide. */
  ticket: string | null;
  /** Quién le pasó el vale al comprador. Nulo = lo usó el propio portador. */
  referido_por: string | null;
  nota: string | null;
  fecha_creacion: string;
  vale_id: number;
  codigo: string;
  comprador: string;
  comprador_telefono: string;
  comprador_correo: string | null;
  tienda: string;
  tienda_id: number;
  registrada_por: string;
  comprador_id: number;
  /** Nulo mientras nadie la haya corregido. */
  editada_por: string | null;
  fecha_edicion: string | null;
};

/**
 * PostgREST devuelve las relaciones incrustadas como objeto o arreglo según
 * la cardinalidad que infiere; se normaliza para no arrastrar esa duda.
 */
function unico<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

const SELECCION = `
  id, monto_compra, monto_oro, monto_plata, descuento_aplicado, ticket, nota,
  referido_por, fecha_creacion, fecha_edicion, vale_id, tienda_id, contacto_id,
  vales!inner(codigo, usuario_id),
  contactos!inner(nombre, telefono, correo),
  tiendas!inner(nombre),
  usuarios!redenciones_usuario_id_fkey(nombre),
  editor:usuarios!redenciones_editada_por_fkey(nombre)
`;

type FilaCruda = {
  id: number;
  monto_compra: number;
  monto_oro: number;
  monto_plata: number;
  descuento_aplicado: number;
  /** Factura del punto de venta. Nula desde que la caja no la pide. */
  ticket: string | null;
  /** Quién le pasó el vale al comprador. Nulo = lo usó el propio portador. */
  referido_por: string | null;
  nota: string | null;
  fecha_creacion: string;
  vale_id: number;
  tienda_id: number;
  contacto_id: number;
  fecha_edicion: string | null;
  vales: { codigo: string; usuario_id: number } | { codigo: string; usuario_id: number }[];
  contactos:
    | { nombre: string; telefono: string; correo: string | null }
    | { nombre: string; telefono: string; correo: string | null }[];
  tiendas: { nombre: string } | { nombre: string }[];
  usuarios: { nombre: string } | { nombre: string }[] | null;
  editor: { nombre: string } | { nombre: string }[] | null;
};

function normalizar(fila: FilaCruda): RedencionDetalle {
  const vale = unico(fila.vales);
  const contacto = unico(fila.contactos);
  const tienda = unico(fila.tiendas);
  const usuario = unico(fila.usuarios);

  return {
    id: fila.id,
    monto_compra: Number(fila.monto_compra),
    monto_oro: Number(fila.monto_oro),
    monto_plata: Number(fila.monto_plata),
    descuento_aplicado: Number(fila.descuento_aplicado),
    ticket: fila.ticket,
    referido_por: fila.referido_por,
    nota: fila.nota,
    fecha_creacion: fila.fecha_creacion,
    vale_id: fila.vale_id,
    codigo: vale?.codigo ?? "",
    comprador: contacto?.nombre ?? "",
    comprador_telefono: contacto?.telefono ?? "",
    comprador_correo: contacto?.correo ?? null,
    tienda: tienda?.nombre ?? "",
    tienda_id: fila.tienda_id,
    registrada_por: usuario?.nombre ?? "",
    comprador_id: fila.contacto_id,
    editada_por: unico(fila.editor)?.nombre ?? null,
    fecha_edicion: fila.fecha_edicion,
  };
}

/** Compras registradas contra un vale, de la más reciente a la más antigua. */
export async function redencionesDeVale(
  valeId: number,
): Promise<RedencionDetalle[]> {
  const { data, error } = await db()
    .from("redenciones")
    .select(SELECCION)
    .eq("vale_id", valeId)
    .order("fecha_creacion", { ascending: false });

  if (error) throw new Error(`No se pudieron leer las redenciones: ${error.message}`);
  return ((data ?? []) as unknown as FilaCruda[]).map(normalizar);
}

export type FiltroRedenciones = {
  /** `null` para ver todas: solo el administrador debe pasarlo. */
  usuarioId?: number | null;
  tiendaId?: number;
  busqueda?: string;
  /** Rango por día local, `AAAA-MM-DD`, ambos inclusive. */
  desde?: string | null;
  hasta?: string | null;
  pagina?: number;
  porPagina?: number;
};

/**
 * Un día local convertido al instante en que empieza, en UTC.
 *
 * Guatemala está a UTC−6 todo el año —no cambia la hora—, así que el desfase
 * es constante y la cuenta exacta. Sin esto, «octubre» empezaría a las 18:00
 * del 30 de septiembre y las compras de esa tarde contarían en el mes que no
 * es.
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

/** Tope al sumar: sin él, una base grande pediría todo de golpe. */
const TOPE_SUMA = 20000;

export async function listarRedenciones({
  usuarioId = null,
  tiendaId,
  busqueda,
  desde,
  hasta,
  pagina = 1,
  porPagina = 25,
}: FiltroRedenciones = {}) {
  // `salto` y no `desde`: ese nombre lo ocupa ahora el inicio del rango de
  // fechas, y confundir un desplazamiento de página con una fecha sería un
  // error silencioso.
  const salto = (pagina - 1) * porPagina;

  let consulta = db()
    .from("redenciones")
    .select(SELECCION, { count: "exact" })
    .order("fecha_creacion", { ascending: false })
    .range(salto, salto + porPagina - 1);

  /*
   * La suma va en su propia consulta y no sobre las filas de la página: con
   * veinticinco por página, una vendedora con sesenta compras veía un total
   * que no era el suyo, sino el de lo que cupo en pantalla. Pide solo las dos
   * columnas que suma, así que es barata.
   */
  let sumas = db()
    .from("redenciones")
    .select("monto_compra,descuento_aplicado,vales!inner(usuario_id)")
    .limit(TOPE_SUMA);

  // El alcance se mide por quién EMITIÓ el vale, no por quién cobró: es la
  // vendedora que captó al cliente la que ve el resultado de su gestión.
  if (usuarioId !== null) {
    consulta = consulta.eq("vales.usuario_id", usuarioId);
    sumas = sumas.eq("vales.usuario_id", usuarioId);
  }
  if (tiendaId) {
    consulta = consulta.eq("tienda_id", tiendaId);
    sumas = sumas.eq("tienda_id", tiendaId);
  }
  if (desde) {
    consulta = consulta.gte("fecha_creacion", inicioDelDia(desde));
    sumas = sumas.gte("fecha_creacion", inicioDelDia(desde));
  }
  if (hasta) {
    consulta = consulta.lt("fecha_creacion", inicioDelDiaSiguiente(hasta));
    sumas = sumas.lt("fecha_creacion", inicioDelDiaSiguiente(hasta));
  }

  if (busqueda?.trim()) {
    const t = busqueda.trim().replace(/[%,()]/g, "");

    /*
     * Antes se buscaba solo por número de ticket; desde que la caja dejó de
     * capturarlo, eso dejaba sin poder encontrar nada nuevo.
     *
     * El comprador vive en `contactos`, y PostgREST no admite mezclar en un
     * mismo `or` columnas propias con las de una tabla incrustada: devuelve
     * 500. Así que primero se resuelven los contactos que casan y después se
     * filtra por su id, que sí es columna de `redenciones`.
     */
    const { data: contactos } = await db()
      .from("contactos")
      .select("id")
      .or(`nombre.ilike.%${t}%,telefono.ilike.%${t}%`)
      .limit(500);

    const ids = (contactos ?? []).map((c) => c.id);

    const condicion = ids.length
      ? `ticket.ilike.%${t}%,contacto_id.in.(${ids.join(",")})`
      : `ticket.ilike.%${t}%`;

    consulta = consulta.or(condicion);
    sumas = sumas.or(condicion);
  }

  const [{ data, error, count }, totales] = await Promise.all([
    consulta,
    sumas,
  ]);

  if (error) throw new Error(`No se pudieron listar las redenciones: ${error.message}`);
  if (totales.error) {
    throw new Error(`No se pudieron sumar las compras: ${totales.error.message}`);
  }

  // Del filtro entero, no de la página: es la cifra que la vendedora mira
  // para saber cuánto lleva en el mes.
  const suma = (
    (totales.data ?? []) as unknown as {
      monto_compra: number;
      descuento_aplicado: number;
    }[]
  ).reduce(
    (a, r) => ({
      venta: a.venta + Number(r.monto_compra),
      descuento: a.descuento + Number(r.descuento_aplicado),
    }),
    { venta: 0, descuento: 0 },
  );

  return {
    redenciones: ((data ?? []) as unknown as FilaCruda[]).map(normalizar),
    total: count ?? 0,
    suma,
    pagina,
    porPagina,
  };
}

/** Una compra concreta, para su pantalla de corrección. */
export async function redencionPorId(
  id: number,
): Promise<RedencionDetalle | null> {
  const { data, error } = await db()
    .from("redenciones")
    .select(SELECCION)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la compra: ${error.message}`);
  return data ? normalizar(data as unknown as FilaCruda) : null;
}
