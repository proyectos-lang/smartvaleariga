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
  pagina?: number;
  porPagina?: number;
};

export async function listarRedenciones({
  usuarioId = null,
  tiendaId,
  busqueda,
  pagina = 1,
  porPagina = 25,
}: FiltroRedenciones = {}) {
  const desde = (pagina - 1) * porPagina;

  let consulta = db()
    .from("redenciones")
    .select(SELECCION, { count: "exact" })
    .order("fecha_creacion", { ascending: false })
    .range(desde, desde + porPagina - 1);

  // El alcance se mide por quién EMITIÓ el vale, no por quién cobró: es la
  // vendedora que captó al cliente la que ve el resultado de su gestión.
  if (usuarioId !== null) consulta = consulta.eq("vales.usuario_id", usuarioId);
  if (tiendaId) consulta = consulta.eq("tienda_id", tiendaId);

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

    consulta = consulta.or(
      ids.length
        ? `ticket.ilike.%${t}%,contacto_id.in.(${ids.join(",")})`
        : `ticket.ilike.%${t}%`,
    );
  }

  const { data, error, count } = await consulta;
  if (error) throw new Error(`No se pudieron listar las redenciones: ${error.message}`);

  return {
    redenciones: ((data ?? []) as unknown as FilaCruda[]).map(normalizar),
    total: count ?? 0,
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
