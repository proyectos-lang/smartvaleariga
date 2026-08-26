import "server-only";

import { db } from "@/lib/supabase/server";
import type {
  EstadoVale,
  ResumenRango,
  TipoVale,
  ValeDetalle,
  ValePorVencer,
  ValeValidado,
} from "@/lib/supabase/types";

/** Consultas sobre vales. El alcance por rol lo decide quien llama. */

export type FiltroVales = {
  /** `null` para ver todos: solo el administrador debe pasarlo. */
  usuarioId?: number | null;
  /**
   * Filtro por quién emitió, que es distinto del alcance por rol: aquel dice
   * qué puede ver esta sesión, este qué quiere ver ahora mismo. Solo tiene
   * sentido para el administrador; una vendedora ya está acotada a lo suyo.
   *
   * `autorregistro` son los vales que nacieron del QR de la tienda antes de
   * que se pidiera la asesora, y que por eso no tienen a nadie detrás.
   */
  emisoraId?: number | "autorregistro";
  tipo?: TipoVale;
  estado?: EstadoVale;
  /**
   * Rango de emisión, en días locales (`AAAA-MM-DD`). Ambos inclusive.
   */
  desde?: string | null;
  hasta?: string | null;
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

/**
 * Un día local convertido al instante en que empieza, en UTC.
 *
 * Guatemala está a UTC−6 todo el año: no cambia la hora, así que el desfase
 * es constante y la cuenta es exacta. Si algún día operara donde sí se
 * cambia, esto habría que resolverlo en Postgres con `at time zone`, como
 * hace el tablero de ventas.
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

export async function listarVales({
  usuarioId = null,
  emisoraId,
  tipo,
  estado,
  desde,
  hasta,
  busqueda,
  pagina = 1,
  porPagina = 25,
}: FiltroVales = {}): Promise<PaginaVales> {
  // `salto` y no `desde`: ese nombre lo ocupa ahora el inicio del rango de
  // fechas, y confundir un desplazamiento de página con una fecha sería un
  // error silencioso.
  const salto = (pagina - 1) * porPagina;

  let consulta = db()
    .from("vw_vales_detalle")
    .select("*", { count: "exact" })
    .order("fecha_creacion", { ascending: false })
    .range(salto, salto + porPagina - 1);

  if (usuarioId !== null) consulta = consulta.eq("usuario_id", usuarioId);

  if (emisoraId === "autorregistro") consulta = consulta.is("usuario_id", null);
  else if (emisoraId) consulta = consulta.eq("usuario_id", emisoraId);

  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (estado) consulta = consulta.eq("estado", estado);

  // El día «hasta» entra entero: se corta en el arranque del siguiente.
  if (desde) consulta = consulta.gte("fecha_emision", inicioDelDia(desde));
  if (hasta) consulta = consulta.lt("fecha_emision", inicioDelDiaSiguiente(hasta));

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

/**
 * Cuántos vales alcanza esta sesión, sin ningún filtro puesto.
 *
 * Es el denominador de la tarjeta del listado: «412» no dice nada, «412 de
 * 1,240» dice qué tan estrecho es el filtro. Solo acota por rol, así que no
 * comparte lógica con `listarVales` ni puede desincronizarse de ella cuando
 * mañana aparezca un filtro nuevo.
 */
export async function totalVales(usuarioId: number | null): Promise<number> {
  let consulta = db()
    .from("vw_vales_detalle")
    .select("id", { count: "exact", head: true });

  if (usuarioId !== null) consulta = consulta.eq("usuario_id", usuarioId);

  const { count, error } = await consulta;
  if (error) throw new Error(`No se pudieron contar los vales: ${error.message}`);
  return count ?? 0;
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
 * Un vale por su token público.
 *
 * Es la única forma de llegar a un vale sin sesión. La búsqueda distingue
 * mayúsculas a propósito —el token es base64url— y no admite el código: si
 * aceptara ambos, la enumeración por correlativo volvería por la puerta de
 * atrás.
 */
export async function valePorToken(token: string): Promise<ValeDetalle | null> {
  const limpio = token.trim();
  if (limpio.length < 16) return null;

  const { data, error } = await db()
    .from("vw_vales_detalle")
    .select("*")
    .eq("token", limpio)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/** Vales vigentes que están por vencer, de más urgente a menos. */
export async function valesPorVencer(
  usuarioId: number | null,
  dias?: number,
): Promise<ValePorVencer[]> {
  const { data, error } = await db().rpc("fn_vales_por_vencer", {
    p_usuario_id: usuarioId,
    p_dias: dias ?? null,
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "PGRST205") return [];
    throw new Error(`No se pudieron leer los vales por vencer: ${error.message}`);
  }
  return data ?? [];
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

/**
 * Quiénes han emitido algún vale, para poblar el filtro.
 *
 * Se saca de los vales y no de la tabla de cuentas: ofrecer diecisiete
 * vendedoras cuando solo cinco han emitido convierte el desplegable en una
 * lista de resultados vacíos. Se incluye a las cuentas inactivas que sí
 * emitieron —su historial sigue ahí— y una entrada para el autorregistro.
 */
export async function emisorasConVales(): Promise<{
  emisoras: { id: number; nombre: string; vales: number }[];
  autorregistro: number;
}> {
  const { data, error } = await db()
    .from("vw_vales_detalle")
    .select("usuario_id, emisora")
    .limit(20000);

  if (error) {
    throw new Error(`No se pudieron leer las emisoras: ${error.message}`);
  }

  const cuenta = new Map<number, { id: number; nombre: string; vales: number }>();
  let autorregistro = 0;

  for (const fila of data ?? []) {
    if (fila.usuario_id === null) {
      autorregistro++;
      continue;
    }
    const previo = cuenta.get(fila.usuario_id);
    if (previo) previo.vales++;
    else {
      cuenta.set(fila.usuario_id, {
        id: fila.usuario_id,
        nombre: fila.emisora ?? `Cuenta ${fila.usuario_id}`,
        vales: 1,
      });
    }
  }

  return {
    emisoras: [...cuenta.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    ),
    autorregistro,
  };
}
