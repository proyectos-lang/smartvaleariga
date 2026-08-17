import "server-only";

import { db } from "@/lib/supabase/server";
import type { RolUsuario } from "@/lib/supabase/types";

/** Cuentas del sistema y el estado de su cupo. */

export type UsuarioListado = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: RolUsuario;
  activo: boolean;
  tienda_id: number | null;
  tienda: string | null;
  ultimo_acceso: string | null;
  fecha_creacion: string;
  /** Bloques asignados y cuánto queda. */
  bloques: number;
  emitidos: number;
  restantes: number;
  rangoActual: { inicio: number; fin: number } | null;
};

type FilaUsuario = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: RolUsuario;
  activo: boolean;
  tienda_id: number | null;
  ultimo_acceso: string | null;
  fecha_creacion: string;
  tiendas: { nombre: string } | { nombre: string }[] | null;
};

/**
 * Usuarios con el resumen de su rango.
 *
 * Se traen los rangos en una sola consulta y se cruzan en memoria: son
 * decenas de filas, y hacerlo por usuario sería una consulta por fila.
 */
export async function listarUsuarios(): Promise<UsuarioListado[]> {
  const [usuarios, rangos] = await Promise.all([
    db()
      .from("usuarios")
      .select(
        "id, nombre, correo, telefono, rol, activo, tienda_id, ultimo_acceso, fecha_creacion, tiendas(nombre)",
      )
      .order("activo", { ascending: false })
      .order("nombre"),
    db()
      .from("rangos")
      .select("usuario_id, rango_inicio, rango_fin, correlativo_actual, activo")
      .eq("activo", true)
      .order("rango_inicio"),
  ]);

  if (usuarios.error) {
    throw new Error(`No se pudieron leer los usuarios: ${usuarios.error.message}`);
  }
  if (rangos.error) throw new Error(rangos.error.message);

  const porUsuario = new Map<number, typeof rangos.data>();
  for (const r of rangos.data ?? []) {
    const lista = porUsuario.get(r.usuario_id) ?? [];
    lista.push(r);
    porUsuario.set(r.usuario_id, lista);
  }

  return ((usuarios.data ?? []) as unknown as FilaUsuario[]).map((u) => {
    const mios = porUsuario.get(u.id) ?? [];
    const enCurso = mios.find((r) => r.correlativo_actual <= r.rango_fin);
    const tienda = Array.isArray(u.tiendas) ? u.tiendas[0] : u.tiendas;

    return {
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      telefono: u.telefono,
      rol: u.rol,
      activo: u.activo,
      tienda_id: u.tienda_id,
      tienda: tienda?.nombre ?? null,
      ultimo_acceso: u.ultimo_acceso,
      fecha_creacion: u.fecha_creacion,
      bloques: mios.length,
      emitidos: mios.reduce(
        (s, r) => s + (r.correlativo_actual - r.rango_inicio),
        0,
      ),
      restantes: mios.reduce(
        (s, r) => s + Math.max(r.rango_fin - r.correlativo_actual + 1, 0),
        0,
      ),
      rangoActual: enCurso
        ? { inicio: enCurso.rango_inicio, fin: enCurso.rango_fin }
        : null,
    };
  });
}

export type Asesora = { id: number; nombre: string };

/**
 * Asesoras que el cliente puede elegir en el QR de una tienda.
 *
 * Son las cuentas activas asignadas a esa tienda. Si no hay ninguna —una
 * tienda recién creada, o cuentas sin tienda asignada— se devuelven todas
 * las activas antes que dejar el QR sin poder emitir: es un cartel pegado en
 * el mostrador y nadie se entera de que dejó de funcionar.
 *
 * Se listan también las cuentas de administración: en tiendas pequeñas quien
 * atiende el mostrador es la encargada.
 */
export async function asesorasDeTienda(tiendaId: number): Promise<Asesora[]> {
  const consulta = () =>
    db().from("usuarios").select("id, nombre").eq("activo", true).order("nombre");

  const { data, error } = await consulta().eq("tienda_id", tiendaId);
  if (error) throw new Error(`No se pudieron leer las asesoras: ${error.message}`);
  if (data && data.length > 0) return data;

  const { data: todas, error: e2 } = await consulta();
  if (e2) throw new Error(`No se pudieron leer las asesoras: ${e2.message}`);
  return todas ?? [];
}

export async function usuarioPorId(id: number) {
  const { data, error } = await db()
    .from("usuarios")
    .select("id, nombre, correo, rol, activo, tienda_id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
