import "server-only";

import { db } from "@/lib/supabase/server";
import {
  ORDENES_CONTACTOS,
  type FiltroContactos,
  type OrdenContactos,
} from "@/lib/contactos-filtros";
import type { ContactoDetalle } from "@/lib/supabase/types";

// Se reexportan para que quien ya lea el directorio no tenga que saber que
// el vocabulario de los filtros vive en otro archivo.
export { ORDENES_CONTACTOS };
export type { FiltroContactos, OrdenContactos };

/**
 * Directorio de contactos: una fila por persona, no por vale.
 *
 * Solo lo consume la pantalla de administración, que es donde tiene sentido
 * ver juntos teléfonos y correos de toda la base de clientes.
 */

export async function listarContactos({
  busqueda,
  tipo,
  tiendaId,
  usuarioId,
  origen,
  compro,
  orden = "reciente",
  pagina = 1,
  porPagina = 50,
}: FiltroContactos = {}) {
  const desde = (pagina - 1) * porPagina;
  const o = ORDENES_CONTACTOS[orden] ?? ORDENES_CONTACTOS.reciente;

  let consulta = db()
    .from("vw_contactos_detalle")
    .select("*", { count: "exact" })
    .order(o.columna, { ascending: o.asc, nullsFirst: false })
    // Desempate estable: sin él, dos filas con el mismo valor pueden
    // intercambiarse entre páginas y una se ve dos veces mientras otra se
    // pierde.
    .order("contacto_id", { ascending: false })
    .range(desde, desde + porPagina - 1);

  if (tipo === "sin-vale") consulta = consulta.is("tipo", null);
  else if (tipo) consulta = consulta.eq("tipo", tipo);

  if (tiendaId) consulta = consulta.eq("tienda_id", tiendaId);
  if (usuarioId) consulta = consulta.eq("usuario_id", usuarioId);

  if (origen?.trim()) {
    consulta = consulta.ilike("origen", `%${origen.trim().replace(/[%,]/g, "")}%`);
  }

  if (compro === "si") consulta = consulta.gt("compras", 0);
  if (compro === "no") consulta = consulta.eq("compras", 0);

  if (busqueda?.trim()) {
    // Los tres datos con los que alguien busca a una persona. Todos son
    // columnas de la propia vista, así que el `or` es válido.
    const t = busqueda.trim().replace(/[%,()]/g, "");
    consulta = consulta.or(
      `nombre.ilike.%${t}%,telefono.ilike.%${t}%,correo.ilike.%${t}%`,
    );
  }

  const { data, error, count } = await consulta;
  if (error) {
    throw new Error(`No se pudo leer el directorio de contactos: ${error.message}`);
  }

  return {
    contactos: (data ?? []) as ContactoDetalle[],
    total: count ?? 0,
    pagina,
    porPagina,
  };
}

/**
 * Los orígenes de prospección ya usados, para ofrecerlos como filtro en vez
 * de obligar a recordar cómo se escribió cada uno.
 */
export async function origenesUsados(): Promise<string[]> {
  const { data, error } = await db()
    .from("vw_contactos_detalle")
    .select("origen")
    .not("origen", "is", null)
    .limit(2000);

  if (error) return [];

  const vistos = new Set<string>();
  for (const f of data ?? []) if (f.origen) vistos.add(f.origen);
  return [...vistos].sort((a, b) => a.localeCompare(b, "es"));
}

/** Totales de la selección actual, para la cabecera de la pantalla. */
export async function resumenContactos(filtros: FiltroContactos = {}) {
  const { contactos, total } = await listarContactos({
    ...filtros,
    pagina: 1,
    porPagina: 1000,
  });

  const conCompra = contactos.filter((c) => c.compras > 0).length;
  const gastado = contactos.reduce((s, c) => s + Number(c.gastado), 0);
  const conCorreo = contactos.filter((c) => c.correo).length;

  return {
    total,
    /** Los agregados miran como mucho las primeras 1000 filas. */
    parcial: total > contactos.length,
    conCompra,
    conCorreo,
    gastado,
    conversion: contactos.length
      ? Math.round((conCompra / contactos.length) * 1000) / 10
      : 0,
  };
}
