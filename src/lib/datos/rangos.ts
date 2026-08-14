import "server-only";

import { db } from "@/lib/supabase/server";

/** Bloques correlativos asignados a cada vendedora. */

export type RangoListado = {
  id: number;
  usuario_id: number;
  usuario: string;
  rol: string;
  rango_inicio: number;
  rango_fin: number;
  correlativo_actual: number;
  activo: boolean;
  nota: string | null;
  fecha_creacion: string;
  asignado_por: string | null;
  /** Derivados. */
  tamano: number;
  emitidos: number;
  restantes: number;
  agotado: boolean;
};

type FilaRango = {
  id: number;
  usuario_id: number;
  rango_inicio: number;
  rango_fin: number;
  correlativo_actual: number;
  activo: boolean;
  nota: string | null;
  fecha_creacion: string;
  usuarios: { nombre: string; rol: string } | { nombre: string; rol: string }[] | null;
};

export async function listarRangos(): Promise<RangoListado[]> {
  const { data, error } = await db()
    .from("rangos")
    .select(
      "id, usuario_id, rango_inicio, rango_fin, correlativo_actual, activo, nota, fecha_creacion, usuarios!rangos_usuario_id_fkey(nombre, rol)",
    )
    .order("rango_inicio", { ascending: false });

  if (error) throw new Error(`No se pudieron leer los rangos: ${error.message}`);

  return ((data ?? []) as unknown as FilaRango[]).map((r) => {
    const u = Array.isArray(r.usuarios) ? r.usuarios[0] : r.usuarios;
    return {
      id: r.id,
      usuario_id: r.usuario_id,
      usuario: u?.nombre ?? "—",
      rol: u?.rol ?? "",
      rango_inicio: r.rango_inicio,
      rango_fin: r.rango_fin,
      correlativo_actual: r.correlativo_actual,
      activo: r.activo,
      nota: r.nota,
      fecha_creacion: r.fecha_creacion,
      asignado_por: null,
      tamano: r.rango_fin - r.rango_inicio + 1,
      emitidos: r.correlativo_actual - r.rango_inicio,
      restantes: Math.max(r.rango_fin - r.correlativo_actual + 1, 0),
      agotado: r.correlativo_actual > r.rango_fin,
    };
  });
}

/** Último número asignado en todo el sistema; el próximo bloque arranca ahí. */
export async function siguienteBloque(): Promise<number> {
  const { data, error } = await db()
    .from("rangos")
    .select("rango_fin")
    .order("rango_fin", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? data.rango_fin + 1 : 0;
}
