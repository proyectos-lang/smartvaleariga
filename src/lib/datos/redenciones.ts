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
  ticket: string;
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
  registrada_por: string;
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
  referido_por, fecha_creacion, vale_id,
  vales!inner(codigo, usuario_id),
  contactos!inner(nombre, telefono, correo),
  tiendas!inner(nombre),
  usuarios!inner(nombre)
`;

type FilaCruda = {
  id: number;
  monto_compra: number;
  monto_oro: number;
  monto_plata: number;
  descuento_aplicado: number;
  ticket: string;
  /** Quién le pasó el vale al comprador. Nulo = lo usó el propio portador. */
  referido_por: string | null;
  nota: string | null;
  fecha_creacion: string;
  vale_id: number;
  vales: { codigo: string; usuario_id: number } | { codigo: string; usuario_id: number }[];
  contactos:
    | { nombre: string; telefono: string; correo: string | null }
    | { nombre: string; telefono: string; correo: string | null }[];
  tiendas: { nombre: string } | { nombre: string }[];
  usuarios: { nombre: string } | { nombre: string }[];
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
    registrada_por: usuario?.nombre ?? "",
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
    const t = busqueda.trim().replace(/[%,]/g, "");
    consulta = consulta.or(`ticket.ilike.%${t}%`);
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
